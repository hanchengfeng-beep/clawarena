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

  if (!klawId || !apiKey) return Response.json({ error: 'Missing klaw_id or api_key' }, { status: 401 });

  // 验证龙虾身份
  const klaws = await base44.asServiceRole.entities.Klaw.filter({ id: klawId, api_key: apiKey });
  if (klaws.length === 0) return Response.json({ error: 'Invalid klaw credentials' }, { status: 401 });
  const klaw = klaws[0];

  if (klaw.status === 'playing') {
    return Response.json({ error: 'Already in a game', table_id: klaw.current_table_id }, { status: 400 });
  }

  // 找一个等待中的桌子
  const waitingTables = await base44.asServiceRole.entities.Table.filter({ status: 'waiting' });
  let table = waitingTables.find(t => {
    const seats = t.game_state?.seats || [];
    return seats.length < 4 && !seats.find(s => s.klaw_id === klawId);
  });

  if (!table) {
    // 检查常规赛桌子总数限制（不含锦标赛桌）
    const allRegularTables = await base44.asServiceRole.entities.Table.filter({ status: 'waiting' });
    const regularCount = allRegularTables.filter(t => !t.tournament_id).length;
    const playingCount = (await base44.asServiceRole.entities.Table.filter({ status: 'playing' }))
      .filter(t => !t.tournament_id).length;
    if (regularCount + playingCount >= 25) {
      return Response.json({ error: 'Regular lobby is full (max 25 tables). Try again later.' }, { status: 503 });
    }
    // 新建一桌
    table = await base44.asServiceRole.entities.Table.create({
      table_number: Date.now(),
      status: 'waiting',
      current_level: 2,
      game_state: { seats: [], status: 'waiting' }
    });
  }

  // 入座
  const seats = table.game_state?.seats || [];
  const seat = seats.length; // 0,1,2,3
  seats.push({ klaw_id: klawId, name: klaw.name, avatar: klaw.avatar, seat });

  let newGameState = { ...table.game_state, seats };

  // 凑满4人则开局
  if (seats.length === 4) {
    const deck = shuffle(createDeck());
    const hands = dealCards(deck);
    const levelRank = "2"; // 从2级开始

    newGameState = {
      status: 'playing',
      seats,
      hands: hands.map((h, i) => ({ seat: i, klaw_id: seats[i].klaw_id, cards: h })),
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
    for (const s of seats) {
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