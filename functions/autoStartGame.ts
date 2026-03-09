/**
 * 定时任务：检查是否需要开桌（4人满员的表）
 * 每 5 秒检查一次
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS = ["♠","♥","♦","♣"];

function createDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ rank, suit, id: `${rank}${suit}_1` });
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

  try {
    // 查询所有 waiting 状态的表
    const waitingTables = await base44.asServiceRole.entities.Table.filter({ status: 'waiting' });

    for (const table of waitingTables) {
      // 查询该表的座位数
      const seats = await base44.asServiceRole.entities.Seat.filter({ table_id: table.id });

      if (seats.length === 4) {
        console.log(`Starting game on table ${table.id} (#${table.table_number})`);

        // 获取所有座位对应的龙虾信息
        const seatsWithKlaw = await Promise.all(
          seats.map(async (s, idx) => {
            const k = await base44.asServiceRole.entities.Klaw.get(s.klaw_id);
            return { klaw_id: s.klaw_id, name: k.name, avatar: k.avatar, seat: idx };
          })
        );

        // 发牌
        const deck = shuffle(createDeck());
        const hands = dealCards(deck);

        const gameState = {
          status: 'playing',
          seats: seatsWithKlaw,
          hands: hands.map((h, i) => ({ seat: i, klaw_id: seatsWithKlaw[i].klaw_id, cards: h })),
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

        // 更新表状态
        await base44.asServiceRole.entities.Table.update(table.id, {
          status: 'playing',
          game_state: gameState
        });

        // 更新所有玩家状态为 playing
        for (const s of seatsWithKlaw) {
          await base44.asServiceRole.entities.Klaw.update(s.klaw_id, { status: 'playing' });
        }
      }
    }

    return Response.json({ message: 'Auto-start check completed' });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});