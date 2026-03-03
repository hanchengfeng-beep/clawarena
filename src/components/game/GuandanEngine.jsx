// 贯蛋游戏核心引擎

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♠", "♥", "♦", "♣"];

// 生成一副牌
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  deck.push({ rank: "小王", suit: "🃏", id: "小王" });
  deck.push({ rank: "大王", suit: "🃏", id: "大王" });
  return deck;
}

// 生成双副牌并洗牌
export function createAndShuffleDeck() {
  const deck = [...createDeck(), ...createDeck()];
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 发牌 - 4人各25张，剩8张底牌，发完后排序
export function dealCards(deck) {
  const hands = [[], [], [], []];
  for (let i = 0; i < 100; i++) {
    hands[i % 4].push(deck[i]);
  }
  // 初始排序：按牌值从小到大，花色 ♠♣♥♦ 分组
  const SUIT_ORDER = { "♠": 0, "♣": 1, "♥": 2, "♦": 3, "🃏": 4 };
  for (let p = 0; p < 4; p++) {
    hands[p].sort((a, b) => {
      const va = a.rank === "大王" ? 20 : a.rank === "小王" ? 19 : RANKS.indexOf(a.rank);
      const vb = b.rank === "大王" ? 20 : b.rank === "小王" ? 19 : RANKS.indexOf(b.rank);
      if (va !== vb) return va - vb;
      return (SUIT_ORDER[a.suit] || 0) - (SUIT_ORDER[b.suit] || 0);
    });
  }
  const kitty = deck.slice(100);
  return { hands, kitty };
}

// 获取牌的数值（用于比较）
export function getCardValue(card, levelRank) {
  if (card.rank === "大王") return 20;
  if (card.rank === "小王") return 19;
  if (card.rank === levelRank) return 18; // 级牌
  const idx = RANKS.indexOf(card.rank);
  return idx;
}

// 判断牌型
export function getCardType(cards, levelRank) {
  if (!cards || cards.length === 0) return null;

  const sorted = [...cards].sort((a, b) => getCardValue(b, levelRank) - getCardValue(a, levelRank));
  const n = cards.length;

  // 单张
  if (n === 1) return { type: "single", value: getCardValue(sorted[0], levelRank) };

  // 对子
  if (n === 2 && sorted[0].rank === sorted[1].rank) {
    return { type: "pair", value: getCardValue(sorted[0], levelRank) };
  }

  // 三带
  if (n === 3) {
    const counts = countRanks(cards, levelRank);
    const three = Object.entries(counts).find(([, v]) => v === 3);
    if (three) return { type: "triple", value: getCardValue({ rank: three[0] }, levelRank) };
  }

  // 炸弹（四张或更多相同）
  if (n >= 4) {
    const counts = countRanks(cards, levelRank);
    const bomb = Object.entries(counts).find(([, v]) => v >= 4);
    if (bomb && cards.every(c => c.rank === bomb[0])) {
      return { type: "bomb", value: getCardValue({ rank: bomb[0] }, levelRank), count: n };
    }

    // 同花顺炸弹
    if (n === 5) {
      const suits = cards.map(c => c.suit);
      const allSameSuit = suits.every(s => s === suits[0]) && suits[0] !== "🃏";
      const vals = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b);
      const isSequential = vals.every((v, i) => i === 0 || v === vals[i - 1] + 1);
      if (allSameSuit && isSequential) {
        return { type: "straight_flush", value: vals[4] };
      }
    }
  }

  // 顺子（5张或以上连续）
  if (n >= 5) {
    const vals = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b);
    if (vals[0] >= 0) { // 不含王
      const isSeq = vals.every((v, i) => i === 0 || v === vals[i - 1] + 1);
      if (isSeq) return { type: "sequence", value: vals[n - 1], length: n };
    }
  }

  // 三对连（六张：三对连顺）
  if (n === 6) {
    const pairs = getPairs(cards, levelRank);
    if (pairs.length === 3) {
      const pairVals = pairs.map(p => p.value).sort((a, b) => a - b);
      if (pairVals[1] === pairVals[0] + 1 && pairVals[2] === pairVals[1] + 1) {
        return { type: "pair_sequence", value: pairVals[2], length: 3 };
      }
    }
  }

  return null;
}

function countRanks(cards) {
  const counts = {};
  for (const c of cards) {
    counts[c.rank] = (counts[c.rank] || 0) + 1;
  }
  return counts;
}

function getPairs(cards, levelRank) {
  const counts = countRanks(cards);
  return Object.entries(counts)
    .filter(([, v]) => v === 2)
    .map(([rank]) => ({ rank, value: getCardValue({ rank }, levelRank) }));
}

// 比较两手牌（返回true表示newPlay能打败lastPlay）
export function canBeat(newCards, lastCards, levelRank) {
  if (!lastCards || lastCards.length === 0) return true; // 出第一手

  const newType = getCardType(newCards, levelRank);
  const lastType = getCardType(lastCards, levelRank);

  if (!newType || !lastType) return false;

  // 炸弹打一切（非炸弹）
  if (newType.type === "bomb" && lastType.type !== "bomb") return true;
  if (newType.type === "straight_flush" && lastType.type !== "straight_flush") return true;

  // 同花顺打炸弹
  if (newType.type === "straight_flush" && lastType.type === "bomb") return true;

  // 炸弹比大小（张数多的赢，同张数比点数）
  if (newType.type === "bomb" && lastType.type === "bomb") {
    if (newType.count !== lastType.count) return newType.count > lastType.count;
    return newType.value > lastType.value;
  }

  // 同牌型比大小
  if (newType.type !== lastType.type) return false;

  // 顺子和对连要同长度
  if ((newType.type === "sequence" || newType.type === "pair_sequence") && newType.length !== lastType.length) return false;

  return newType.value > lastType.value;
}

// AI出牌逻辑
export function aiPlay(hand, lastPlay, levelRank, isFirstPlay, mustPlay = false) {
  // 如果没有上家出牌，选最小的单张
  if (!lastPlay || lastPlay.length === 0 || isFirstPlay) {
    // 先出最小的单张
    const sorted = [...hand].sort((a, b) => getCardValue(a, levelRank) - getCardValue(b, levelRank));
    return [sorted[0]];
  }

  const lastType = getCardType(lastPlay, levelRank);
  if (!lastType) return null;

  // 尝试找能打的牌
  const candidates = findBeatableCombos(hand, lastPlay, lastType, levelRank);

  if (candidates.length === 0) {
    if (mustPlay) {
      // 不得不出，随便出一张
      return [hand[0]];
    }
    return null; // 过
  }

  // 选最小的能打的组合
  candidates.sort((a, b) => {
    const ta = getCardType(a, levelRank);
    const tb = getCardType(b, levelRank);
    return ta.value - tb.value;
  });

  return candidates[0];
}

function findBeatableCombos(hand, lastPlay, lastType, levelRank) {
  const results = [];
  const n = lastPlay.length;

  if (lastType.type === "single") {
    for (const card of hand) {
      if (getCardValue(card, levelRank) > lastType.value) {
        results.push([card]);
      }
    }
  } else if (lastType.type === "pair") {
    const pairs = findPairsInHand(hand, levelRank);
    for (const pair of pairs) {
      if (getCardValue(pair[0], levelRank) > lastType.value) {
        results.push(pair);
      }
    }
  } else if (lastType.type === "bomb") {
    // 找更大的炸弹或同花顺
    const bombs = findBombsInHand(hand, levelRank);
    for (const bomb of bombs) {
      if (canBeat(bomb, lastPlay, levelRank)) results.push(bomb);
    }
  }

  // 炸弹可以打任何非炸弹
  if (lastType.type !== "bomb" && lastType.type !== "straight_flush") {
    const bombs = findBombsInHand(hand, levelRank);
    for (const bomb of bombs) {
      if (!results.some(r => JSON.stringify(r) === JSON.stringify(bomb))) {
        results.push(bomb);
      }
    }
  }

  return results;
}

function findPairsInHand(hand, levelRank) {
  const byRank = {};
  for (const card of hand) {
    if (!byRank[card.rank]) byRank[card.rank] = [];
    byRank[card.rank].push(card);
  }
  const pairs = [];
  for (const [, cards] of Object.entries(byRank)) {
    if (cards.length >= 2) pairs.push(cards.slice(0, 2));
  }
  return pairs;
}

function findBombsInHand(hand, levelRank) {
  const byRank = {};
  for (const card of hand) {
    if (!byRank[card.rank]) byRank[card.rank] = [];
    byRank[card.rank].push(card);
  }
  const bombs = [];
  for (const [, cards] of Object.entries(byRank)) {
    if (cards.length >= 4) bombs.push(cards.slice(0, 4));
  }
  return bombs;
}

// 检查是否获胜（手牌出完）
export function checkWin(hand) {
  return hand.length === 0;
}

// 贯蛋规则：根据出完牌的名次确定级别提升
export function calculateLevelUp(finishOrder, currentLevel) {
  // 第1名：+3级，第2名：+1级，第3名：不升，第4名：降1级（简化版）
  const gains = [3, 1, 0, -1];
  return gains[finishOrder] || 0;
}

export const RANK_NAMES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export function getLevelName(level) {
  return RANK_NAMES[Math.max(0, Math.min(12, level - 2))];
}