/**
 * POST /joinTable
 * 龙虾申请上桌。使用 TableQueue 管理每个桌号的当前等待表，避免并发冲突。
 * 找一个 waiting 状态的桌子，或新建一桌。
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
  const targetTableNumber = body.table_number || null;

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

  // 获取或创建一个 waiting 表（使用 TableQueue 管理）
  async function getOrCreateWaitingTable(tableNum) {
    log(`GET_OR_CREATE_TABLE: Looking for table #${tableNum}`);
    
    // 查询 TableQueue 获取该桌号的当前表
    const queues = await base44.asServiceRole.entities.TableQueue.filter({ table_number: tableNum });
    let activeTableId = null;
    
    if (queues.length > 0) {
      const queue = queues[0];
      activeTableId = queue.active_table_id;
      log(`QUEUE_FOUND: active_table_id=${activeTableId}`);
      
      // 验证该表仍在 waiting 状态
      if (activeTableId) {
        const activeTable = await base44.asServiceRole.entities.Table.get(activeTableId);
        if (activeTable.status === 'waiting') {
          const seats = activeTable.game_state?.seats || [];
          if (seats.length < 4) {
            log(`TABLE_AVAILABLE: Using existing table with ${seats.length}/4 seats`);
            return activeTable;
          }
        }
        log(`TABLE_UNAVAILABLE: Active table is full or finished`);
      }
    }
    
    // 没有可用的 waiting 表，创建新的
    log(`CREATE_NEW_TABLE: Creating new table #${tableNum}`);
    const newTable = await base44.asServiceRole.entities.Table.create({
      table_number: tableNum,
      status: 'waiting',
      current_level: 2,
      game_state: { seats: [], status: 'waiting' }
    });
    log(`TABLE_CREATED: ${newTable.id}`);
    
    // 更新或创建 TableQueue 记录
    if (queues.length > 0) {
      log(`UPDATE_QUEUE: Updating queue to point to new table`);
      await base44.asServiceRole.entities.TableQueue.update(queues[0].id, {
        active_table_id: newTable.id
      });
    } else {
      log(`CREATE_QUEUE: Creating new queue entry for table #${tableNum}`);
      await base44.asServiceRole.entities.TableQueue.create({
        table_number: tableNum,
        active_table_id: newTable.id
      });
    }
    
    return newTable;
  }

  let table = null;

  if (targetTableNumber) {
    // 指定了桌号
    table = await getOrCreateWaitingTable(targetTableNumber);
  } else {
    // 自动分配
    log(`AUTO_FIND: Looking for available table...`);
    const allQueues = await base44.asServiceRole.entities.TableQueue.filter({});
    
    for (const q of allQueues.sort((a, b) => a.table_number - b.table_number)) {
      const t = await base44.asServiceRole.entities.Table.get(q.active_table_id);
      if (t && t.status === 'waiting') {
        const seats = t.game_state?.seats || [];
        if (seats.length < 4 && !seats.find(s => s.klaw_id === klawId)) {
          log(`TABLE_SELECTED: Using table #${q.table_number}`);
          table = t;
          break;
        }
      }
    }
    
    if (!table) {
      // 创建新表，找一个未使用的桌号
      const usedNumbers = new Set(allQueues.map(q => q.table_number));
      let nextNumber = null;
      for (let n = 1; n <= 25; n++) {
        if (!usedNumbers.has(n)) { nextNumber = n; break; }
      }
      if (nextNumber === null) {
        log(`ERROR: Lobby full`);
        return Response.json({ error: 'Regular lobby is full. Try again later.', logs }, { status: 503 });
      }
      table = await getOrCreateWaitingTable(nextNumber);
    }
  }

  // 尝试入座
  const maxAttempts = 15;
  let attempt = 0;
  let result = null;

  while (attempt < maxAttempts && !result) {
    attempt++;
    log(`SEAT_ATTEMPT: ${attempt}/${maxAttempts}`);

    const freshTable = await base44.asServiceRole.entities.Table.get(table.id);
    log(`TABLE_STATE: status=${freshTable.status}, seats=${freshTable.game_state?.seats?.length || 0}`);
    
    if (freshTable.status !== 'waiting') {
      log(`ERROR: Table is not waiting`);
      return Response.json({ error: `Table not available (${freshTable.status})`, logs }, { status: 400 });
    }

    const seats = freshTable.game_state?.seats || [];
    if (seats.length >= 4) {
      log(`ERROR: Table is full`);
      return Response.json({ error: 'Table is full', logs }, { status: 400 });
    }
    if (seats.find(s => s.klaw_id === klawId)) {
      log(`ERROR: Already seated`);
      return Response.json({ error: 'Already seated at this table', logs }, { status: 400 });
    }

    const seat = seats.length;
    const newSeats = [...seats, { klaw_id: klawId, name: klaw.name, avatar: klaw.avatar, seat }];
    log(`SEAT_PREPARED: seat=${seat}, total=${newSeats.length}`);
    
    let newGameState = { ...freshTable.game_state, seats: newSeats };
    let updatePayload = { game_state: newGameState };

    if (newSeats.length === 4) {
      log(`GAME_START: 4 players, starting game`);
      const deck = shuffle(createDeck());
      const hands = dealCards(deck);

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
        levelRank: "2",
        currentLevel: 2,
        turnStartedAt: Date.now(),
        gameLog: [`游戏开始！级牌：2`]
      };
      updatePayload = { status: 'playing', game_state: newGameState };
    }

    try {
      log(`UPDATE_TABLE: Updating...`);
      await base44.asServiceRole.entities.Table.update(table.id, updatePayload);
      log(`UPDATE_KLAW: Updating player status...`);
      await base44.asServiceRole.entities.Klaw.update(klawId, {
        status: newSeats.length === 4 ? 'playing' : 'waiting',
        current_table_id: table.id
      });

      if (newSeats.length === 4) {
        for (const s of newSeats) {
          if (s.klaw_id !== klawId) {
            await base44.asServiceRole.entities.Klaw.update(s.klaw_id, {
              status: 'playing',
              current_table_id: table.id
            });
          }
        }
      }

      result = {
        table_id: table.id,
        seat,
        status: newSeats.length === 4 ? 'playing' : 'waiting',
        message: newSeats.length === 4 ? 'Game started!' : `Waiting... ${newSeats.length}/4`,
        your_hand: newSeats.length === 4 ? newGameState.hands[seat].cards : undefined,
        logs
      };
    } catch (e) {
      log(`UPDATE_FAILED: ${e.message}`);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 10 * attempt));
      }
    }
  }

  if (result) {
    log(`SUCCESS`);
    return Response.json(result);
  }
  
  log(`FINAL_ERROR: Max attempts exceeded`);
  return Response.json({ error: 'Failed to seat player', logs }, { status: 500 });
});