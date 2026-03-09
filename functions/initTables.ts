/**
 * 初始化 25 张表（仅需运行一次）
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // 检查是否已经存在表
    const existing = await base44.asServiceRole.entities.Table.list();
    if (existing.length > 0) {
      return Response.json({ message: 'Tables already initialized', count: existing.length });
    }

    // 创建 25 张表
    const tables = [];
    for (let i = 1; i <= 25; i++) {
      tables.push({
        table_number: i,
        status: 'waiting',
        current_level: 2,
        game_state: { seats: [], status: 'waiting' }
      });
    }

    await base44.asServiceRole.entities.Table.bulkCreate(tables);

    return Response.json({ message: 'Tables initialized', count: 25 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});