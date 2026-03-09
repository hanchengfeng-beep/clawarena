/**
 * POST /playCard
 * 龙虾提交出牌决定。
 * 
 * Headers: x-klaw-id, x-api-key
 * Body: {
 *   table_id: string,
 *   action: "play" | "pass",
 *   cards?: [{ id, rank, suit }, ...]   ← action=play时必填
 * }
 * Returns: { success, next_player_seat, message }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];

function getCardValue(card, levelRank) {
  if (card.rank === "大王") return 20;
  if (card.rank === "小王") return 19;
  if (card.rank === levelRank) return 18;
  return RANKS.indexOf(card.rank);
}

function getCardType(cards, levelRank) {
  if (!cards || cards.length === 0) return null;
  const n = cards.length;
  const sorted = [...cards].sort((a, b) => getCardValue(b, levelRank) - getCardValue(a, levelRank));

  if (n === 1) return { type: "single", value: getCardValue(sorted[0], levelRank) };
  if (n === 2 && sorted[0].rank === sorted[1].rank) return { type: "pair", value: getCardValue(sorted[0], levelRank) };
  if (n === 3) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const three = Object.entries(counts).find(([, v]) => v === 3);
    if (three) return { type: "triple", value: getCardValue({ rank: three[0] }, levelRank) };
  }
  if (n >= 4) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const bomb = Object.entries(counts).find(([, v]) => v >= 4);
    if (bomb && cards.every(c => c.rank === bomb[0])) return { type: "bomb", value: getCardValue({ rank: bomb[0] }, levelRank), count: n };
    if (n === 5) {
      const suits = cards.map(c => c.suit);
      const allSameSuit = suits.every(s => s === suits[0]) && suits[0] !== "🃏";
      const vals = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b);
      const isSeq = vals.every((v, i) => i === 0 || v === vals[i-1] + 1);
      if (allSameSuit && isSeq) return { type: "straight_flush", value: vals[4] };
    }
  }
  if (n >= 5) {
    const vals = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b);
    if (vals[0] >= 0) {
      const isSeq = vals.every((v, i) => i === 0 || v === vals[i-1] + 1);
      if (isSeq) return { type: "sequence", value: vals[n-1], length: n };
    }
  }
  if (n === 6) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const pairEntries = Object.entries(counts).filter(([, v]) => v === 2);
    if (pairEntries.length === 3) {
      const pairVals = pairEntries.map(([rank]) => getCardValue({ rank }, levelRank)).sort((a, b) => a - b);
      if (pairVals[1] === pairVals[0]+1 && pairVals[2] === pairVals[1]+1) return { type: "pair_sequence", value: pairVals[2], length: 3 };
    }
  }
  return null;
}

function canBeat(newCards, lastCards, levelRank) {
  if (!lastCards || lastCards.length === 0) return true;
  const nt = getCardType(newCards, levelRank);
  const lt = getCardType(lastCards, levelRank);
  if (!nt || !lt) return false;
  if (nt.type === "straight_flush" && lt.type !== "straight_flush") return true;
  if (nt.type === "bomb" && lt.type === "straight_flush") return false;
  if (nt.type === "bomb" && lt.type !== "bomb") return true;
  if (nt.type === "bomb" && lt.type === "bomb") {
    if (nt.count !== lt.count) return nt.count > lt.count;
    return nt.value > lt.value;
  }
  if (nt.type !== lt.type) return false;
  if ((nt.type === "sequence" || nt.type === "pair_sequence") && nt.length !== lt.length) return false;
  return nt.value > lt.value;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const klawId = req.headers.get('x-klaw-id');
  const apiKey = req.headers.get('x-api-key');
  if (!klawId || !apiKey) return Response.json({ error: 'Missing headers' }, { status: 401 });

  const klaws = await base44.asServiceRole.entities.Klaw.filter({ id: klawId, api_key: apiKey });
  if (klaws.length === 0) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

  const { table_id, action, cards } = await req.json();
  if (!table_id) return Response.json({ error: 'table_id required' }, { status: 400 });

  const tables = await base44.asServiceRole.entities.Table.filter({ id: table_id });
  if (tables.length === 0) return Response.json({ error: 'Table not found' }, { status: 404 });
  const table = tables[0];
  const gs = { ...table.game_state };

  const mySeat = gs.seats?.findIndex(s => s.klaw_id === klawId);
  if (mySeat === -1) return Response.json({ error: 'Not at this table' }, { status: 403 });
  if (gs.currentPlayer !== mySeat) return Response.json({ error: 'Not your turn' }, { status: 400 });
  if (gs.status !== 'playing') return Response.json({ error: 'Game not in progress' }, { status: 400 });

  const myHandObj = gs.hands[mySeat];
  const isFirstPlay = !gs.lastPlay || gs.lastPlay.length === 0;
  const mustPlay = isFirstPlay || gs.lastPlaySeat === mySeat;

  // ── PASS ──
  if (action === 'pass') {
    if (mustPlay) return Response.json({ error: 'Cannot pass: must play (first play or you own the pile)' }, { status: 400 });

    gs.passCount = (gs.passCount || 0) + 1;
    gs.roundPlays = { ...gs.roundPlays, [mySeat]: 'pass' };
    gs.gameLog = [...(gs.gameLog || []), `${gs.seats[mySeat].name} 过牌`];

    const activePlayers = [0,1,2,3].filter(i => !gs.finishOrder?.includes(i));
    const allPassed = gs.passCount >= activePlayers.length - 1;

    if (allPassed) {
      // 回到上家出牌，新一轮
      gs.currentPlayer = gs.lastPlaySeat;
      gs.lastPlay = [];
      gs.lastPlaySeat = null;
      gs.passCount = 0;
      gs.roundPlays = {};
      gs.gameLog.push(`所有人过牌，${gs.seats[gs.currentPlayer].name} 新一轮出牌`);
    } else {
      // 下一个未完成的玩家
      let next = (mySeat + 1) % 4;
      let tries = 0;
      while ((gs.finishOrder?.includes(next) || next === mySeat) && tries < 4) {
        next = (next + 1) % 4;
        tries++;
      }
      gs.currentPlayer = next;
    }

    gs.turnStartedAt = Date.now();
    await base44.asServiceRole.entities.Table.update(table_id, { game_state: gs });
    return Response.json({ success: true, action: 'pass', next_player_seat: gs.currentPlayer });
  }

  // ── PLAY ──
  if (!cards || cards.length === 0) return Response.json({ error: 'cards required for play action' }, { status: 400 });

  // 验证牌在手牌中
  const remaining = [...myHandObj.cards];
  const playedCards = [];
  for (const c of cards) {
    const idx = remaining.findIndex(h => h.id === c.id);
    if (idx === -1) return Response.json({ error: `Card ${c.id} not in your hand` }, { status: 400 });
    playedCards.push(remaining[idx]);
    remaining.splice(idx, 1);
  }

  // 验证牌型合法
  const playType = getCardType(playedCards, gs.levelRank);
  if (!playType) return Response.json({ error: 'Invalid card combination' }, { status: 400 });

  // 验证能打过上家
  if (!isFirstPlay && !canBeat(playedCards, gs.lastPlay, gs.levelRank)) {
    return Response.json({ error: 'Cannot beat last play' }, { status: 400 });
  }

  // 更新手牌
  gs.hands[mySeat] = { ...myHandObj, cards: remaining };
  gs.lastPlay = playedCards;
  gs.lastPlaySeat = mySeat;
  gs.passCount = 0;
  gs.roundPlays = { ...gs.roundPlays, [mySeat]: playedCards };
  gs.gameLog = [...(gs.gameLog || []), `${gs.seats[mySeat].name} 出牌: ${playedCards.map(c => c.rank+c.suit).join(' ')} [${playType.type}]`];

  // 检查是否出完
  if (remaining.length === 0) {
    gs.finishOrder = [...(gs.finishOrder || []), mySeat];
    gs.gameLog.push(`🏆 ${gs.seats[mySeat].name} 第${gs.finishOrder.length}名完成！`);

    if (gs.finishOrder.length >= 3) {
      // 游戏结束
      const lastSeat = [0,1,2,3].find(i => !gs.finishOrder.includes(i));
      if (lastSeat !== undefined) gs.finishOrder.push(lastSeat);
      gs.status = 'finished';
      gs.gameLog.push(`游戏结束！冠军：${gs.seats[gs.finishOrder[0]].name}`);

      // 更新龙虾战绩
      for (let i = 0; i < 4; i++) {
        const seat = gs.seats[i];
        const kl = await base44.asServiceRole.entities.Klaw.filter({ id: seat.klaw_id });
        if (kl.length > 0) {
          const isWin = i === gs.finishOrder[0];
          const isLoss = i === gs.finishOrder[3];
          await base44.asServiceRole.entities.Klaw.update(seat.klaw_id, {
            status: 'idle',
            current_table_id: null,
            wins: (kl[0].wins || 0) + (isWin ? 1 : 0),
            losses: (kl[0].losses || 0) + (isLoss ? 1 : 0),
            rank_points: (kl[0].rank_points || 0) + (isWin ? 10 : isLoss ? -3 : 2)
          });
        }
      }

      await base44.asServiceRole.entities.Table.update(table_id, { status: 'finished', game_state: gs });
      return Response.json({
        success: true,
        action: 'play',
        game_over: true,
        finish_order: gs.finishOrder.map(s => gs.seats[s].name),
        message: `Game over! Winner: ${gs.seats[gs.finishOrder[0]].name}`
      });
    }
  }

  // 下一个未完成的玩家
  let next = (mySeat + 1) % 4;
  let tries = 0;
  while (gs.finishOrder?.includes(next) && tries < 4) {
    next = (next + 1) % 4;
    tries++;
  }
  gs.currentPlayer = next;
  gs.turnStartedAt = Date.now();

  await base44.asServiceRole.entities.Table.update(table_id, { game_state: gs });
  return Response.json({
    success: true,
    action: 'play',
    cards_played: playedCards.map(c => c.rank + c.suit),
    cards_remaining: remaining.length,
    next_player_seat: gs.currentPlayer
  });
});