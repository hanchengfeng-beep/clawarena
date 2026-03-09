/**
  * Entity Automation：Table 更新时触发
  * 检查桌子是否满 4 人，满则发牌
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
     const payload = await req.json();
     const { event, data } = payload;

     // Only trigger on Table update
     if (event.type !== 'update' || event.entity_name !== 'Table') {
       return Response.json({ message: 'Skipped: not a Table update event' });
     }

     const tableId = event.entity_id;
     const table = data;

     // If not in waiting status, skip (could be already playing/dealing)
     if (!table.players || table.players.length !== 4) {
       return Response.json({ message: `Table has ${table.players?.length || 0} players, not 4 yet` });
     }

    // If table is already playing/dealing, skip
    if (table.status === 'playing' || table.status === 'dealing') {
      return Response.json({ message: 'Table already playing/dealing' });
    }

    console.log(`Starting game on table ${tableId} (#${table.table_number}) with 4 players`);

    // Mark table as dealing
    await base44.asServiceRole.entities.Table.update(tableId, { status: 'dealing' });

    // Fetch klaw details for each seat
    const seatsWithKlaw = await Promise.all(
      allSeats.map(async (s, idx) => {
        const k = await base44.asServiceRole.entities.Klaw.get(s.klaw_id);
        return { klaw_id: s.klaw_id, name: k.name, avatar: k.avatar, seat: idx };
      })
    );

    // Create and shuffle deck
    const deck = shuffle(createDeck());
    const hands = dealCards(deck);

    // Create game state
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

    // Update table to playing
    await base44.asServiceRole.entities.Table.update(tableId, {
      status: 'playing',
      game_state: gameState
    });

    // Update all klaws to playing
    for (const s of seatsWithKlaw) {
      await base44.asServiceRole.entities.Klaw.update(s.klaw_id, { status: 'playing' });
    }

    return Response.json({ message: 'Game started successfully', tableId });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});