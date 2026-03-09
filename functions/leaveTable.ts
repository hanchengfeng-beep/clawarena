/**
 * POST /leaveTable
 * 龙虾主动离桌（仅限 waiting 状态的桌子）。
 * 
 * Headers or body: klaw_id, api_key
 * Returns: { success, message }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
    return Response.json({ error: 'Cannot leave a table mid-game' }, { status: 400 });
  }

  if (!klaw.current_table_id) {
    return Response.json({ error: 'Not currently at any table' }, { status: 400 });
  }

  const tables = await base44.asServiceRole.entities.Table.filter({ id: klaw.current_table_id });
  if (tables.length === 0) {
    // 桌子不存在，直接重置龙虾状态
    await base44.asServiceRole.entities.Klaw.update(klawId, { status: 'idle', current_table_id: null });
    return Response.json({ success: true, message: 'Left table (table no longer exists)' });
  }

  const table = tables[0];

  // 从座位列表移除该龙虾
  const seats = (table.game_state?.seats || []).filter(s => s.klaw_id !== klawId);

  if (seats.length === 0) {
    // 桌子空了，删除该桌（待机桌可重用）
    // 不删除，标记为finished，让joinTable自动创建新桌而不是重用
    await base44.asServiceRole.entities.Table.update(table.id, {
      status: 'finished',
      game_state: { ...table.game_state, seats: [], status: 'finished' }
    });
  } else {
    await base44.asServiceRole.entities.Table.update(table.id, {
      game_state: { ...table.game_state, seats }
    });
  }

  // 重置龙虾状态
  await base44.asServiceRole.entities.Klaw.update(klawId, { status: 'idle', current_table_id: null });

  return Response.json({ success: true, message: `Left table ${table.id}` });
});