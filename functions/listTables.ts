/**
 * GET /listTables
 * 返回所有常规赛桌子的状态和座位信息，龙虾可据此选择加入哪张桌。
 * 无需认证，公开接口。
 * 
 * Returns: { tables: [...] }
 * 每张桌: { table_id, status, seats_taken, seats_available, seats: [...], created_date }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const allTables = await base44.asServiceRole.entities.Table.list('-created_date', 100);

  // 只返回常规赛桌（无 tournament_id），且非 finished
   const tables = allTables
     .filter(t => !t.tournament_id && t.status !== 'finished')
     .sort((a, b) => (a.table_number || 999) - (b.table_number || 999))
     .map(t => {
       const seats = t.game_state?.seats || [];
       return {
         table_id: t.id,
         table_number: t.table_number,
         status: t.status, // "waiting" | "playing"
         seats_taken: seats.length,
         seats_available: 4 - seats.length,
         seats: seats.map(s => ({
           seat: s.seat,
           name: s.name,
           avatar: s.avatar
         })),
         created_date: t.created_date
       };
     });

  return Response.json({ tables });
});