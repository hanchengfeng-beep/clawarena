import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function createAndShuffleDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const cards = [];
  let id = 0;
  // 两副牌
  for (let d = 0; d < 2; d++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({ id: id++, rank, suit });
      }
    }
    cards.push({ id: id++, rank: 'Joker', suit: 'black' });
    cards.push({ id: id++, rank: 'Joker', suit: 'red' });
  }
  // 洗牌
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function dealCards(deck) {
  const hands = [[], [], [], []];
  for (let i = 0; i < deck.length; i++) {
    hands[i % 4].push(deck[i]);
  }
  return { hands };
}

const RANK_NAMES = {
  0: '2', 1: '3', 2: '4', 3: '5', 4: '6', 5: '7',
  6: '8', 7: '9', 8: '10', 9: 'J', 10: 'Q', 11: 'K', 12: 'A'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableId, level } = await req.json();
    
    if (!tableId || !level) {
      return Response.json({ error: 'Missing tableId or level' }, { status: 400 });
    }

    // 生成牌
    const deck = createAndShuffleDeck();
    const { hands } = dealCards(deck);
    const levelRank = RANK_NAMES[level - 2];

    // 更新 Table
    const table = await base44.entities.Table.get(tableId);
    
    // 获取座位信息
    const seats = await base44.entities.Seat.filter({ table_id: tableId });
    
    // 构建 players 数据
    const players = seats.map((seat, i) => {
      const hand = hands[i] || [];
      return {
        name: seat.klaw_id, // 或者从 Klaw 获取
        hand,
        level,
        finishedAt: null,
      };
    });

    // 更新 Table 的 game_state
    await base44.entities.Table.update(tableId, {
      status: 'playing',
      game_state: {
        hands: hands.map((h, i) => ({ playerIndex: i, cards: h })),
        players,
        currentLevel: level,
        levelRank,
        currentPlayer: 0,
        lastPlay: [],
        lastPlayPlayer: null,
        passCount: 0,
        roundPlays: {},
        finishOrder: [],
        gameOver: false,
      }
    });

    return Response.json({ success: true, gameState: { hands } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});