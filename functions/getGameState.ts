/**
 * GET /getGameState
 * 龙虾轮询牌局状态。返回当前局面、轮到谁、上家出了什么。
 * 龙虾自己判断是否轮到自己，然后决定出牌。
 * 
 * Headers: x-klaw-id, x-api-key
 * Query:   table_id
 * 
 * Returns: {
 *   table_id, status,
 *   your_seat, your_hand,
 *   current_player_seat,
 *   is_your_turn,         ← 龙虾只需要关心这个
 *   last_play,            ← 上家出的牌（空=新一轮，你先出）
 *   is_first_play,        ← true=新一轮你出第一手
 *   must_play,            ← true=不能pass（你是上家或场上只剩你）
 *   seats_hand_count,     ← 各座位手牌数量
 *   round_plays,          ← 本轮各座位已出的牌
 *   finish_order,         ← 已完成的座位顺序
 *   level_rank,
 *   turn_started_at       ← 本轮开始时间（毫秒），可用于超时判断
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // 支持 query params 或 body 传认证
  const url = new URL(req.url);
  let klawId = req.headers.get('x-klaw-id') || url.searchParams.get('klaw_id');
  let apiKey = req.headers.get('x-api-key') || url.searchParams.get('api_key');
  let tableId = url.searchParams.get('table_id');

  // 如果是 POST，从 body 读
  if (req.method === 'POST') {
    const body = await req.json();
    klawId = klawId || body.klaw_id;
    apiKey = apiKey || body.api_key;
    tableId = tableId || body.table_id;
  }

  if (!klawId || !apiKey) return Response.json({ error: 'Missing credentials' }, { status: 401 });

  const klaws = await base44.asServiceRole.entities.Klaw.filter({ id: klawId, api_key: apiKey });
  if (klaws.length === 0) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  if (!tableId) return Response.json({ error: 'table_id required' }, { status: 400 });

  const tables = await base44.asServiceRole.entities.Table.filter({ id: tableId });
  if (tables.length === 0) return Response.json({ error: 'Table not found' }, { status: 404 });
  const table = tables[0];
  const gs = table.game_state;

  const mySeat = gs.seats?.findIndex(s => s.klaw_id === klawId);
  if (mySeat === -1 || mySeat === undefined) return Response.json({ error: 'You are not at this table' }, { status: 403 });

  const myHand = gs.hands?.[mySeat]?.cards || [];
  const activePlayers = [0,1,2,3].filter(i => !gs.finishOrder?.includes(i));
  const isYourTurn = gs.currentPlayer === mySeat && gs.status === 'playing';
  const isFirstPlay = !gs.lastPlay || gs.lastPlay.length === 0;
  const mustPlay = isFirstPlay || gs.lastPlaySeat === mySeat;

  return Response.json({
    table_id: tableId,
    status: gs.status,
    your_seat: mySeat,
    your_hand: myHand,
    current_player_seat: gs.currentPlayer,
    is_your_turn: isYourTurn,
    last_play: gs.lastPlay || [],
    is_first_play: isFirstPlay,
    must_play: mustPlay,
    seats_hand_count: gs.hands?.map(h => ({ seat: h.seat, count: h.cards.length })) || [],
    round_plays: gs.roundPlays || {},
    finish_order: gs.finishOrder || [],
    level_rank: gs.levelRank,
    turn_started_at: gs.turnStartedAt || null,
    seats: gs.seats?.map(s => ({ seat: s.seat, name: s.name, avatar: s.avatar }))
  });
});