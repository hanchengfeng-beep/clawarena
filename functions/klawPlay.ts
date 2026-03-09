import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// 贯蛋规则说明（传给LLM）
const GUANDAN_RULES = `
你是一个正在打贯蛋（升级）牌的AI龙虾选手。

【基本规则】
- 4人游戏，每人25张牌（双副牌）
- 目标：最先出完手牌
- 级牌：本局的级牌（levelRank）是特殊牌，价值仅次于小王大王

【牌型（从小到大）】
- 单张：任意一张
- 对子：两张相同点数
- 三张：三张相同点数
- 顺子：5张或以上连续点数（不含王，不含级牌）
- 连对：3对或以上连续点数的对子
- 炸弹：4张或以上相同点数（张数越多越大）
- 同花顺炸：5张同花色连续（最强炸弹）

【牌力大小】
2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 级牌 < 小王 < 大王

【出牌规则】
- 只能出同类型且点数更大的牌，或者出炸弹（炸弹可以打任何非炸弹牌型）
- 同花顺炸 > 普通炸弹 > 其他牌型
- 炸弹之间：张数多的赢；张数相同比点数
- 如果不想出，可以选择pass（过牌）
- 如果是"新一轮"（lastPlay为空），必须出牌，可以出任意合法牌型
- mustPlay=true时必须出牌（不能pass）

【策略提示】
- 优先出小牌，留大牌和炸弹
- 手牌少时要更主动
- 但不要在不必要的时候浪费炸弹
`;

// 验证LLM选出的牌是否合法
function validatePlay(selectedIds, hand, lastPlay, levelRank, isFirstPlay) {
  if (!selectedIds || selectedIds.length === 0) return null; // pass

  // 检查选出的牌是否都在手牌中
  const handIds = hand.map(c => c.id);
  const selectedCards = selectedIds.map(id => {
    // id可能重复（双副牌），用find
    const idx = handIds.indexOf(id);
    if (idx === -1) return null;
    handIds[idx] = '__used__'; // 标记已用
    return hand[handIds.indexOf('__used__') === -1 ? -1 : hand.findIndex(c => c.id === id)];
  });

  // 更简单：直接从hand中找匹配的牌
  const remaining = [...hand];
  const pickedCards = [];
  for (const id of selectedIds) {
    const idx = remaining.findIndex(c => c.id === id);
    if (idx === -1) return null; // 牌不存在
    pickedCards.push(remaining[idx]);
    remaining.splice(idx, 1);
  }

  return pickedCards;
}

// 获取牌的数值
function getCardValue(card, levelRank) {
  if (card.rank === "大王") return 20;
  if (card.rank === "小王") return 19;
  if (card.rank === levelRank) return 18;
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  return RANKS.indexOf(card.rank);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hand, lastPlay, levelRank, isFirstPlay, mustPlay, playerName, handCount } = await req.json();

    // 按牌力排序手牌，方便LLM理解
    const sortedHand = [...hand].sort((a, b) => getCardValue(a, levelRank) - getCardValue(b, levelRank));

    const prompt = `
${GUANDAN_RULES}

【当前局面】
你是玩家：${playerName}
级牌（levelRank）：${levelRank}
你的手牌（按点数从小到大）：${sortedHand.map(c => `${c.rank}${c.suit}[id:${c.id}]`).join(', ')}
你的手牌数量：${hand.length}张

其他玩家手牌数量：${JSON.stringify(handCount)}

上家出的牌：${lastPlay && lastPlay.length > 0 ? lastPlay.map(c => `${c.rank}${c.suit}`).join(', ') : '（无，新一轮开始）'}
isFirstPlay（新一轮你出第一手）：${isFirstPlay}
mustPlay（必须出牌，不能pass）：${mustPlay}

【你的任务】
决定这次出什么牌。

返回JSON格式：
- 如果出牌：{ "action": "play", "cards": ["id1", "id2", ...], "reason": "简短说明" }
- 如果过牌：{ "action": "pass", "reason": "简短说明" }

注意：
1. cards数组中填写牌的id（方括号中的内容，例如 "3♠"）
2. 出的牌必须是合法的牌型，且能打过上家（或者是炸弹）
3. isFirstPlay=true时必须出牌
4. mustPlay=true时不能pass
5. 只返回JSON，不要其他文字
`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["play", "pass"] },
          cards: { type: "array", items: { type: "string" } },
          reason: { type: "string" }
        },
        required: ["action", "reason"]
      }
    });

    if (result.action === "pass") {
      return Response.json({ action: "pass", reason: result.reason });
    }

    // 验证选出的牌
    if (!result.cards || result.cards.length === 0) {
      return Response.json({ action: "pass", reason: "LLM返回空牌，默认pass" });
    }

    const pickedCards = validatePlay(result.cards, hand, lastPlay, levelRank, isFirstPlay);
    if (!pickedCards) {
      // 验证失败，fallback到最简单的出牌
      console.log("LLM选牌验证失败，使用fallback");
      return Response.json({ action: "fallback", reason: "验证失败" });
    }

    return Response.json({
      action: "play",
      cards: pickedCards,
      reason: result.reason
    });

  } catch (error) {
    console.error("klawPlay error:", error);
    return Response.json({ action: "fallback", reason: error.message }, { status: 500 });
  }
});