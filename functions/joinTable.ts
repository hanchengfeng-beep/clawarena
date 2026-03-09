/**
 * POST /joinTable
 * 龙虾申请上桌。使用 Seat 表管理座位，避免并发冲突。
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

  // 选择表
  let table = null;
  if (targetTableNumber) {
    log(`FIND_TABLE: Looking for table #${targetTableNumber}`);
    const tables = await base44.asServiceRole.entities.Table.filter({ table_number: targetTableNumber, status: 'waiting' });
    if (tables.length > 0) {
      table = tables[0];
    }
  } else {
    log(`AUTO_FIND: Looking for available waiting table...`);
    const allTables = await base44.asServiceRole.entities.Table.filter({ status: 'waiting' });
    for (const t of allTables.sort((a, b) => a.table_number - b.table_number)) {
      const playerCount = (t.players || []).length;
      if (playerCount < 4) {
        table = t;
        log(`TABLE_SELECTED: table #${t.table_number}`);
        break;
      }
    }
  }

  if (!table) {
    log(`ERROR: No available table found`);
    return Response.json({ error: 'No available table', logs }, { status: 400 });
  }

  log(`TABLE_SELECTED: ${table.id} (#${table.table_number})`);

  // 直接操作 Table.players 数组
  log(`TRY_ADD_PLAYER: Adding player to table...`);
  try {
    // 检查玩家是否已在此表中
    const currentPlayers = table.players || [];
    if (currentPlayers.some(p => p.id === klawId)) {
      log(`ERROR: Klaw already at this table`);
      return Response.json({ error: 'Already at this table', logs }, { status: 400 });
    }

    // 如果表满了，拒绝
    if (currentPlayers.length >= 4) {
      log(`ERROR: Table is full`);
      return Response.json({ error: 'Table is full, try another table', logs }, { status: 400 });
    }

    // 添加玩家到表
    const newPlayers = [...currentPlayers, {
      id: klawId,
      name: klaw.name,
      avatar: klaw.avatar,
      type: 'ai'
    }];

    // 更新表和龙虾状态
    await base44.asServiceRole.entities.Table.update(table.id, {
      players: newPlayers
    });

    await base44.asServiceRole.entities.Klaw.update(klawId, {
      status: 'waiting',
      current_table_id: table.id
    });

    const seatNumber = newPlayers.length - 1;
    log(`PLAYER_ADDED: ${klaw.name}, seat=${seatNumber}, total=${newPlayers.length}/4`);

    // 如果4人齐，返回 ready，否则等待
    return Response.json({
      table_id: table.id,
      seat: seatNumber,
      status: newPlayers.length === 4 ? 'ready' : 'waiting',
      message: newPlayers.length === 4 ? 'All players ready, game starting...' : `Waiting... ${newPlayers.length}/4`,
      logs
    });
  } catch (error) {
    log(`ERROR: ${error.message}`);
    return Response.json({ error: error.message, logs }, { status: 500 });
  }
});