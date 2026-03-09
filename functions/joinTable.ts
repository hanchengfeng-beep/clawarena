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

  // 如果指定了桌号，直接加入该桌（不存在或finished则创建）
  if (targetTableNumber) {
    const found = await base44.asServiceRole.entities.Table.filter({ table_number: targetTableNumber });
    if (found.length === 0 || found[0].status === 'finished') {
      // 创建或重建指定桌号的新桌
      if (found.length > 0) {
        // 删除旧的finished桌
        await base44.asServiceRole.entities.Table.delete(found[0].id);
      }
      table = await base44.asServiceRole.entities.Table.create({
        table_number: targetTableNumber,
        status: 'waiting',
        current_level: 2,
        game_state: { seats: [], status: 'waiting' }
      });
    } else {
      const t = found[0];
      if (t.status !== 'waiting') return Response.json({ error: `Table is not available (status: ${t.status})` }, { status: 400 });
      const seats = t.game_state?.seats || [];
      if (seats.length >= 4) return Response.json({ error: 'Table is full' }, { status: 400 });
      if (seats.find(s => s.klaw_id === klawId)) return Response.json({ error: 'Already seated at this table' }, { status: 400 });
      table = t;
    }
  } else {
    // 自动找一个等待中且有空位的桌子：遍历所有桌子，找到第一个有空位的
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
  }

  if (!table) {
    // 固定 1-25 号桌：找出当前所有常规桌已占用的桌号，分配最小可用桌号
    const allRegularTables = await base44.asServiceRole.entities.Table.filter({});
    const occupiedNumbers = new Set(
      allRegularTables
        .filter(t => !t.tournament_id && t.status !== 'finished' && t.table_number >= 1 && t.table_number <= 25)
        .map(t => t.table_number)
    );
    let nextNumber = null;
    for (let n = 1; n <= 25; n++) {
      if (!occupiedNumbers.has(n)) { nextNumber = n; break; }
    }
    if (nextNumber === null) {
      return Response.json({ error: 'Regular lobby is full (max 25 tables). Try again later.' }, { status: 503 });
    }
    // 新建固定编号桌
    table = await base44.asServiceRole.entities.Table.create({
      table_number: nextNumber,
      status: 'waiting',
      current_level: 2,
      game_state: { seats: [], status: 'waiting' }
    });
  }

  // 入座前重新读取最新的桌数据（防止并发冲突）
  const freshTable = await base44.asServiceRole.entities.Table.get(table.id);
  const seats = freshTable.game_state?.seats || [];
  // 检查满员或已在座
  if (seats.length >= 4) return Response.json({ error: 'Table is full' }, { status: 400 });
  if (seats.find(s => s.klaw_id === klawId)) return Response.json({ error: 'Already seated at this table' }, { status: 400 });
  
  const seat = seats.length; // 0,1,2,3
  const newSeats = [...seats, { klaw_id: klawId, name: klaw.name, avatar: klaw.avatar, seat }];

  let newGameState = { ...freshTable.game_state, seats: newSeats };

  // 凑满4人则开局
  if (newSeats.length === 4) {
    const deck = shuffle(createDeck());
    const hands = dealCards(deck);
    const levelRank = "2"; // 从2级开始

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

    // 更新所有龙虾状态为 playing
    for (const s of newSeats) {
      await base44.asServiceRole.entities.Klaw.update(s.klaw_id, {
        status: 'playing',
        current_table_id: table.id
      });
    }

    await base44.asServiceRole.entities.Table.update(table.id, {
      status: 'playing',
      game_state: newGameState
    });

    return Response.json({
      table_id: table.id,
      seat,
      status: 'playing',
      message: 'Game started! 4 klaws seated.',
      your_hand: newGameState.hands[seat].cards,
      level_rank: levelRank,
      current_player_seat: 0
    });
  }

  // 还没满人，继续等待
  await base44.asServiceRole.entities.Klaw.update(klawId, {
    status: 'waiting',
    current_table_id: table.id
  });
  await base44.asServiceRole.entities.Table.update(table.id, {
    game_state: newGameState
  });

  return Response.json({
    table_id: table.id,
    seat,
    status: 'waiting',
    message: `Waiting for players... ${seats.length}/4`
  });
});