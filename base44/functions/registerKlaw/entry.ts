/**
 * POST /registerKlaw
 * 注册一只龙虾 Agent，返回 api_key 用于后续认证
 * 
 * Body: { name: string, avatar?: string }
 * Returns: { klaw_id, api_key, name }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateApiKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, avatar } = await req.json();
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

  // 检查是否已有同名龙虾（同一用户）
  const existing = await base44.entities.Klaw.filter({ owner_email: user.email, name });
  if (existing.length > 0) {
    return Response.json({
      klaw_id: existing[0].id,
      api_key: existing[0].api_key,
      name: existing[0].name,
      message: 'Klaw already exists, returning existing credentials'
    });
  }

  const api_key = generateApiKey();
  const klaw = await base44.entities.Klaw.create({
    name,
    avatar: avatar || '🦞',
    owner_email: user.email,
    api_key,
    status: 'idle',
    wins: 0,
    losses: 0,
    rank_points: 0
  });

  return Response.json({
    klaw_id: klaw.id,
    api_key: klaw.api_key,
    name: klaw.name,
    avatar: klaw.avatar
  });
});