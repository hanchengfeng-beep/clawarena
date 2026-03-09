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

  const body = await req.json();
  const klawId = req.headers.get('x-klaw-id') || body.klaw_id;
  const apiKey = req.headers.get('x-api-key') || body.api_key;
  const targetTableNumber = body.table_number || null; // 可选：指定桌号 1-25

  if (!klawId || !apiKey) return Response.json({ error: 'Missing klaw_id or api_key' }, { status: 401 });

  // 验证龙虾身份
  const klaws = await base44.asServiceRole.entities.Klaw.filter({ id: klawId, api_key: apiKey });
  if (klaws.length === 0) return Response.json({ error: 'Invalid klaw credentials' }, { status: 401 });
  const klaw = klaws[0];

  if (klaw.status === 'playing') {
    return Response.json({ error: 'Already in a game', table_id: klaw.current_table_id }, { status: 400 });
  }

  let table = null;

  // 如果指定了桌号，直接查找或创建该桌
  if (targetTableNumber) {
    // 查找该桌号的所有表
    const allTables = await base44.asServiceRole.entities.Table.filter({ table_number: targetTableNumber });
    const waitingTables = allTables.filter(t => t.status === 'waiting');
    
    // 如果有多个 waiting 表，合并到第一个，删除其他
    if (waitingTables.length > 1) {
      table = waitingTables[0];
      for (let i = 1; i < waitingTables.length; i++) {
        try {
          await base44.asServiceRole.entities.Table.delete(waitingTables[i].id);
        } catch (e) {
          // 忽略
        }
      }
    } else if (waitingTables.length === 1) {
      table = waitingTables[0];
    } else {
      // 没有 waiting 表，创建新的
      table = await base44.asServiceRole.entities.Table.create({
        table_number: targetTableNumber,
        status: 'waiting',
        current_level: 2,
        game_state: { seats: [], status: 'waiting' }
      });
    }
  } else {
    // 自动找一个等待中且有空位的桌子
    const allTables = await base44.asServiceRole.entities.Table.filter({});
    const regularWaitingTables = allTables
      .filter(t => !t.tournament_id && t.status === 'waiting' && t.table_number >= 1 && t.table_number <= 25)
      .sort((a, b) => a.table_number - b.table_number);
    
    for (const t of regularWaitingTables) {
      const seats = t.game_state?.seats || [];
      if (seats.length < 4 && !seats.find(s => s.klaw_id === klawId)) {
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
        return Response.json({ error: 'Regular lobby is full (max 25 tables). Try again later.' }, { status: 503 });
      }
      
      table = await base44.asServiceRole.entities.Table.create({
        table_number: nextNumber,
        status: 'waiting',
        current_level: 2,
        game_state: { seats: [], status: 'waiting' }
      });
    }
  }
  
  // 尝试入座，如果失败则重试（因为可能有并发冲突）
  const maxAttempts = 15;
  let attempt = 0;
  let result = null;

  while (attempt < maxAttempts && !result) {
    attempt++;

    // 每次尝试都重新读取表状态
    const freshTable = await base44.asServiceRole.entities.Table.get(table.id);
    
    // 检查表是否仍然是 waiting 状态
    if (freshTable.status !== 'waiting') {
      return Response.json({ error: `Table is not available (status: ${freshTable.status})` }, { status: 400 });
    }

    const seats = freshTable.game_state?.seats || [];

    // 检查满员或已在座
    if (seats.length >= 4) {
      return Response.json({ error: 'Table is full' }, { status: 400 });
    }
    if (seats.find(s => s.klaw_id === klawId)) {
      return Response.json({ error: 'Already seated at this table' }, { status: 400 });
    }

    // 准备新座位数据
    const seat = seats.length;
    const newSeats = [...seats, { klaw_id: klawId, name: klaw.name, avatar: klaw.avatar, seat }];
    let newGameState = { ...freshTable.game_state, seats: newSeats };
    let updatePayload = { game_state: newGameState };

    // 凑满4人则开局
    if (newSeats.length === 4) {
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
      await base44.asServiceRole.entities.Table.update(table.id, updatePayload);
      
      // 更新龙虾状态
      await base44.asServiceRole.entities.Klaw.update(klawId, {
        status: newSeats.length === 4 ? 'playing' : 'waiting',
        current_table_id: table.id
      });

      // 如果游戏开始，更新其他龙虾
      if (newSeats.length === 4) {
        for (const s of newSeats) {
          if (s.klaw_id !== klawId) {
            await base44.asServiceRole.entities.Klaw.update(s.klaw_id, {
              status: 'playing',
              current_table_id: table.id
            });
          }
        }

        result = {
          table_id: table.id,
          seat,
          status: 'playing',
          message: 'Game started! 4 klaws seated.',
          your_hand: newGameState.hands[seat].cards,
          level_rank: newGameState.levelRank,
          current_player_seat: 0
        };
      } else {
        result = {
          table_id: table.id,
          seat,
          status: 'waiting',
          message: `Waiting for players... ${newSeats.length}/4`
        };
      }
    } catch (e) {
      // 更新失败（并发冲突），等待并重试
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 10 * attempt));
      }
    }
  }

  if (result) {
    return Response.json(result);
  } else {
    return Response.json({ error: 'Failed to seat player after multiple attempts' }, { status: 500 });
  }
});