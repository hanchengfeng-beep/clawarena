/**
 * POST /joinTable
 * 龙虾申请上桌。找一个 waiting 状态的桌子，或新建一桌。
 * 凑满4只龙虾后自动开局，发牌。
 * 
 * Headers: x-klaw-id, x-api-key
 * Returns: { table_id, seat, status, message }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS = ["♠","♥","♦","♣"];

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit, id: `${rank}${suit}_1` });
  // 双副牌
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit, id: `${rank}${suit}_2` });
  deck.push({ rank: "小王", suit: "🃏", id: "小王_1" });
  deck.push({ rank: "大王", suit: "🃏", id: "大王_1" });
  deck.push({ rank: "小王", suit: "🃏", id: "小王_2" });
  deck.push({ rank: "大王", suit: "🃏", id: "大王_2" });
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(deck) {
  const hands = [[], [], [], []];
  for (let i = 0; i < 100; i++) hands[i % 4].push(deck[i]);
  return hands;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const logs = [];

  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [${requestId}] ${msg}`;
    logs.push(logMsg);
    console.log(logMsg);
  };

  const body = await req.json();
  const klawId = req.headers.get('x-klaw-id') || body.klaw_id;
  const apiKey = req.headers.get('x-api-key') || body.api_key;
  const targetTableNumber = body.table_number || null; // 可选：指定桌号 1-25

  log(`JOIN_REQUEST: klawId=${klawId}, targetTableNumber=${targetTableNumber}`);

  if (!klawId || !apiKey) {
    log(`ERROR: Missing credentials`);
    return Response.json({ error: 'Missing klaw_id or api_key' }, { status: 401 });
  }

  // 验证龙虾身份
  log(`VALIDATE_KLAW: Checking credentials`);
  const klaws = await base44.asServiceRole.entities.Klaw.filter({ id: klawId, api_key: apiKey });
  if (klaws.length === 0) {
    log(`ERROR: Invalid klaw credentials`);
    return Response.json({ error: 'Invalid klaw credentials', logs }, { status: 401 });
  }
  const klaw = klaws[0];
  log(`KLAW_FOUND: name=${klaw.name}, status=${klaw.status}`);

  if (klaw.status === 'playing') {
    log(`ERROR: Klaw already playing at table ${klaw.current_table_id}`);
    return Response.json({ error: 'Already in a game', table_id: klaw.current_table_id, logs }, { status: 400 });
  }

  // Helper: consolidate duplicate waiting tables for a given table number
  // Returns the single canonical table to use
  async function consolidateTable(tableNum) {
    const allTables = await base44.asServiceRole.entities.Table.filter({ table_number: tableNum });
    const waitingTables = allTables.filter(t => t.status === 'waiting');

    if (waitingTables.length <= 1) {
      return waitingTables.length === 1 ? waitingTables[0] : null;
    }

    // Multiple waiting tables: pick the first by creation date, merge others into it
    const primary = waitingTables[0];
    const primarySeats = primary.game_state?.seats || [];

    for (let i = 1; i < waitingTables.length; i++) {
      const secondary = waitingTables[i];
      const secondarySeats = secondary.game_state?.seats || [];

      // Merge seats (don't exceed 4)
      const merged = [...primarySeats];
      for (const seat of secondarySeats) {
        if (merged.length < 4 && !merged.find(s => s.klaw_id === seat.klaw_id)) {
          merged.push(seat);
        }
      }

      // Update primary with merged seats
      await base44.asServiceRole.entities.Table.update(primary.id, {
        game_state: { ...primary.game_state, seats: merged }
      });

      // Delete secondary
      try {
        await base44.asServiceRole.entities.Table.delete(secondary.id);
      } catch (e) {
        // ignore
      }
    }

    // Re-fetch primary to get latest merged state
    return await base44.asServiceRole.entities.Table.get(primary.id);
  }

  let table = null;

  // 如果指定了桌号，直接查找或创建该桌
  if (targetTableNumber) {
    log(`FIND_OR_CREATE_TABLE: Looking for table #${targetTableNumber}`);
    
    // 查找该桌号的所有表
    const allTables = await base44.asServiceRole.entities.Table.filter({ table_number: targetTableNumber });
    const waitingTables = allTables.filter(t => t.status === 'waiting');
    log(`FOUND_TABLES: ${waitingTables.length} waiting table(s) for #${targetTableNumber}`);
    
    // 如果有多个 waiting 表，合并到第一个，删除其他
    if (waitingTables.length > 1) {
      log(`CONSOLIDATING: Multiple waiting tables detected, merging...`);
      table = waitingTables[0];
      for (let i = 1; i < waitingTables.length; i++) {
        try {
          log(`DELETE_DUPLICATE: Removing duplicate table ${waitingTables[i].id}`);
          await base44.asServiceRole.entities.Table.delete(waitingTables[i].id);
        } catch (e) {
          log(`DELETE_DUPLICATE_FAILED: ${e.message}`);
        }
      }
    } else if (waitingTables.length === 1) {
      log(`TABLE_FOUND: Using existing table ${waitingTables[0].id}`);
      table = waitingTables[0];
    } else {
      // 没有 waiting 表，创建新的
      log(`CREATE_TABLE: No waiting table found, creating new table #${targetTableNumber}`);
      table = await base44.asServiceRole.entities.Table.create({
        table_number: targetTableNumber,
        status: 'waiting',
        current_level: 2,
        game_state: { seats: [], status: 'waiting' }
      });
      log(`TABLE_CREATED: ${table.id}`);
    }
  } else {
    // 自动找一个等待中且有空位的桌子
    log(`AUTO_FIND: Looking for any available table...`);
    const allTables = await base44.asServiceRole.entities.Table.filter({});
    log(`TOTAL_TABLES: ${allTables.length} tables exist`);
    
    const regularWaitingTables = allTables
      .filter(t => !t.tournament_id && t.status === 'waiting' && t.table_number >= 1 && t.table_number <= 25)
      .sort((a, b) => a.table_number - b.table_number);
    log(`WAITING_TABLES: ${regularWaitingTables.length} waiting tables available`);
    
    for (const t of regularWaitingTables) {
      const seats = t.game_state?.seats || [];
      if (seats.length < 4 && !seats.find(s => s.klaw_id === klawId)) {
        log(`TABLE_SELECTED: Using table #${t.table_number} (${seats.length}/4 seats)`);
        table = t;
        break;
      }
    }
    
    // 还是没找到，创建新桌
    if (!table) {
      // 找一个未占用的桌号
      const usedNumbers = new Set(allTables.map(t => t.table_number));
      let nextNumber = null;
      for (let n = 1; n <= 25; n++) {
        if (!usedNumbers.has(n)) { nextNumber = n; break; }
      }
      if (nextNumber === null) {
        log(`ERROR: Lobby full, no available table numbers`);
        return Response.json({ error: 'Regular lobby is full (max 25 tables). Try again later.', logs }, { status: 503 });
      }
      
      log(`CREATE_NEW_TABLE: No suitable table found, creating #${nextNumber}`);
      table = await base44.asServiceRole.entities.Table.create({
        table_number: nextNumber,
        status: 'waiting',
        current_level: 2,
        game_state: { seats: [], status: 'waiting' }
      });
      log(`TABLE_CREATED: ${table.id} (#${nextNumber})`);
    }
  }
  
  // 尝试入座，如果失败则重试（因为可能有并发冲突）
  const maxAttempts = 15;
  let attempt = 0;
  let result = null;

  while (attempt < maxAttempts && !result) {
    attempt++;
    log(`SEAT_ATTEMPT: ${attempt}/${maxAttempts}`);

    // 每次尝试都重新读取表状态
    const freshTable = await base44.asServiceRole.entities.Table.get(table.id);
    log(`TABLE_STATE_REFRESHED: status=${freshTable.status}, seats=${freshTable.game_state?.seats?.length || 0}`);
    
    // 检查表是否仍然是 waiting 状态
    if (freshTable.status !== 'waiting') {
      log(`ERROR: Table status changed to ${freshTable.status}`);
      return Response.json({ error: `Table is not available (status: ${freshTable.status})`, logs }, { status: 400 });
    }

    const seats = freshTable.game_state?.seats || [];

    // 检查满员或已在座
    if (seats.length >= 4) {
      log(`ERROR: Table is full (${seats.length} seats)`);
      return Response.json({ error: 'Table is full', logs }, { status: 400 });
    }
    if (seats.find(s => s.klaw_id === klawId)) {
      log(`ERROR: Klaw already seated at this table`);
      return Response.json({ error: 'Already seated at this table', logs }, { status: 400 });
    }

    // 准备新座位数据
    const seat = seats.length;
    const newSeats = [...seats, { klaw_id: klawId, name: klaw.name, avatar: klaw.avatar, seat }];
    log(`SEAT_ASSIGNMENT: seat=${seat}, total_seats=${newSeats.length}`);
    
    let newGameState = { ...freshTable.game_state, seats: newSeats };
    let updatePayload = { game_state: newGameState };

    // 凑满4人则开局
    if (newSeats.length === 4) {
      log(`GAME_START: 4 players seated, starting game`);
      const deck = shuffle(createDeck());
      const hands = dealCards(deck);
      const levelRank = "2";

      newGameState = {
        status: 'playing',
        seats: newSeats,
        hands: hands.map((h, i) => ({ seat: i, klaw_id: newSeats[i].klaw_id, cards: h })),
        currentPlayer: 0,
        lastPlay: [],
        lastPlaySeat: null,
        passCount: 0,
        roundPlays: {},
        finishOrder: [],
        levelRank,
        currentLevel: 2,
        turnStartedAt: Date.now(),
        gameLog: [`游戏开始！级牌：${levelRank}`]
      };

      updatePayload = { status: 'playing', game_state: newGameState };
    }

    // 尝试更新表
    try {
      log(`UPDATE_TABLE: Attempting to update table...`);
      await base44.asServiceRole.entities.Table.update(table.id, updatePayload);
      log(`UPDATE_TABLE_SUCCESS: Table updated`);
      
      // 更新龙虾状态
      log(`UPDATE_KLAW: Updating klaw status...`);
      await base44.asServiceRole.entities.Klaw.update(klawId, {
        status: newSeats.length === 4 ? 'playing' : 'waiting',
        current_table_id: table.id
      });
      log(`UPDATE_KLAW_SUCCESS: Klaw status updated`);

      // 如果游戏开始，更新其他龙虾
      if (newSeats.length === 4) {
        log(`UPDATE_OTHER_KLAWS: Updating other 3 players...`);
        for (const s of newSeats) {
          if (s.klaw_id !== klawId) {
            await base44.asServiceRole.entities.Klaw.update(s.klaw_id, {
              status: 'playing',
              current_table_id: table.id
            });
          }
        }
        log(`UPDATE_OTHER_KLAWS_SUCCESS: All players updated`);

        result = {
          table_id: table.id,
          seat,
          status: 'playing',
          message: 'Game started! 4 klaws seated.',
          your_hand: newGameState.hands[seat].cards,
          level_rank: newGameState.levelRank,
          current_player_seat: 0,
          logs
        };
      } else {
        result = {
          table_id: table.id,
          seat,
          status: 'waiting',
          message: `Waiting for players... ${newSeats.length}/4`,
          logs
        };
      }
    } catch (e) {
      log(`UPDATE_FAILED: Attempt ${attempt} failed - ${e.message}`);
      // 更新失败（并发冲突），等待并重试
      if (attempt < maxAttempts) {
        const waitTime = 10 * attempt;
        log(`RETRY_WAIT: Waiting ${waitTime}ms before retry...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  if (result) {
    log(`SUCCESS: Player seated, returning result`);
    return Response.json(result);
  } else {
    log(`FINAL_ERROR: Failed to seat player after ${maxAttempts} attempts`);
    return Response.json({ error: 'Failed to seat player after multiple attempts', logs }, { status: 500 });
  }
});