import React, { useState, useEffect, useCallback, useRef } from "react";
import CardComponent from "./CardComponent";
import {
  createAndShuffleDeck, dealCards, getCardType, canBeat,
  aiPlay, checkWin, getLevelName, RANK_NAMES
} from "./GuandanEngine";

const AI_CONFIGS = [
  { name: "OpenClaw Alpha", color: "#00f5ff", avatar: "🦞" },
  { name: "OpenClaw Beta", color: "#a855f7", avatar: "🦞" },
  { name: "OpenClaw Gamma", color: "#ff4444", avatar: "🦞" },
  { name: "OpenClaw Delta", color: "#00ff88", avatar: "🦞" },
];

function getTypeLabel(type) {
  const map = {
    single: "单张", pair: "对子", triple: "三张", bomb: "炸弹",
    sequence: "顺子", pair_sequence: "连对", straight_flush: "同花顺炸"
  };
  return map[type] || type;
}

// Player hand display - horizontal fan
function PlayerHand({ player, isActive, position }) {
  const isHorizontal = position === "bottom" || position === "top";

  // Player info badge
  const badge = (
    <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-300 ${isActive ? "glow-cyan" : ""}`} style={{
      background: isActive ? "rgba(0,245,255,0.12)" : "rgba(10,14,26,0.8)",
      border: `1px solid ${isActive ? player.color : "rgba(255,255,255,0.08)"}`,
      backdropFilter: "blur(8px)",
      opacity: player.finishedAt !== null ? 0.45 : 1,
      whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: 16 }}>{player.avatar}</span>
      <div>
        <p style={{ color: player.color, fontFamily: "Orbitron, sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.5px" }}>
          {player.name.replace("OpenClaw ", "")}
        </p>
        <p style={{ color: "#64748b", fontSize: 9 }}>
          {player.finishedAt !== null
            ? ["🥇 1st", "🥈 2nd", "🥉 3rd", "❌ 4th"][player.finishedAt]
            : `${player.hand.length} 张`}
        </p>
      </div>
      {isActive && (
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: player.color, boxShadow: `0 0 6px ${player.color}` }} />
      )}
    </div>
  );

  const count = player.hand.length;
  // Overlapping fan for top/bottom (horizontal), vertical stack for left/right
  const CARD_W = 32;
  const CARD_H = 48;

  if (position === "top" || position === "bottom") {
    // Horizontal overlap: each card offset by ~14px
    const overlap = 14;
    const totalW = count > 0 ? CARD_W + overlap * (count - 1) : 0;
    return (
      <div className="flex flex-col items-center gap-2">
        {badge}
        <div style={{ position: "relative", width: totalW, height: CARD_H }}>
          {player.hand.map((card, i) => (
            <div key={`${card.id}-${i}`} style={{ position: "absolute", left: i * overlap, top: 0, zIndex: i }}>
              <CardComponent card={card} small />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Left / right: vertical overlap stack
  const vOverlap = 14;
  const totalH = count > 0 ? CARD_H + vOverlap * (count - 1) : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      {badge}
      <div style={{ position: "relative", width: CARD_W, height: totalH }}>
        {player.hand.map((card, i) => (
          <div key={`${card.id}-${i}`} style={{ position: "absolute", top: i * vOverlap, left: 0, zIndex: i }}>
            <CardComponent card={card} small />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameTable({ tableNumber, round, onGameEnd }) {
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(800);
  const intervalRef = useRef(null);
  const logRef = useRef(null);

  const addLog = useCallback((msg, color = "#e2e8f0") => {
    setLog(prev => [...prev.slice(-40), { msg, color, id: Date.now() + Math.random() }]);
  }, []);

  const initGame = useCallback((levelOverride) => {
    const deck = createAndShuffleDeck();
    const { hands } = dealCards(deck);
    const level = levelOverride || 2;
    const levelRank = RANK_NAMES[level - 2];

    const players = AI_CONFIGS.map((cfg, i) => ({
      ...cfg,
      hand: hands[i],
      level,
      finishedAt: null,
    }));

    setGameState({
      players,
      currentLevel: level,
      levelRank,
      currentPlayer: 0,
      lastPlay: [],
      lastPlayPlayer: null,
      passCount: 0,
      playArea: [],
      playAreaOwner: null,
      finishOrder: [],
      gameOver: false,
    });
    setLog([]);
    addLog(`⚡ 第${tableNumber}桌 ${round === "finals" ? "决赛" : "预选赛"} 开始！`, "#00f5ff");
    addLog(`🎮 级牌：${levelRank}`, "#ffd700");
  }, [round, tableNumber, addLog]);

  useEffect(() => { initGame(2); }, []);

  const playStep = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.gameOver) return prev;

      const { players, currentPlayer, lastPlay, lastPlayPlayer, passCount, finishOrder } = prev;
      const player = players[currentPlayer];

      if (!player || player.finishedAt !== null) {
        return { ...prev, currentPlayer: (currentPlayer + 1) % 4 };
      }

      const isFirstPlay = lastPlay.length === 0 || passCount >= (4 - finishOrder.length - 1);
      const mustPlay = isFirstPlay || lastPlayPlayer === currentPlayer;
      const playCards = aiPlay(player.hand, isFirstPlay ? [] : lastPlay, prev.levelRank, isFirstPlay, mustPlay);

      let newHand = player.hand;
      let newLastPlay = lastPlay;
      let newLastPlayPlayer = lastPlayPlayer;
      let newPassCount = passCount;
      let newPlayArea = prev.playArea;
      let newPlayAreaOwner = prev.playAreaOwner;

      if (playCards && playCards.length > 0) {
        newHand = player.hand.filter(c => !playCards.some(p => p.id === c.id));
        newLastPlay = playCards;
        newLastPlayPlayer = currentPlayer;
        newPassCount = 0;
        newPlayArea = playCards;
        newPlayAreaOwner = currentPlayer;

        const type = getCardType(playCards, prev.levelRank);
        const typeLabel = type ? getTypeLabel(type.type) : "";
        addLog(`🦞 ${player.name} 出牌: ${playCards.map(c => `${c.rank}${c.suit}`).join(" ")} [${typeLabel}]`, player.color);
      } else {
        newPassCount = passCount + 1;
        addLog(`⏭ ${player.name} 过牌`, "#475569");
      }

      const newPlayers = players.map((p, i) => i === currentPlayer ? { ...p, hand: newHand } : p);

      let newFinishOrder = [...finishOrder];
      let newGameOver = false;

      if (newHand.length === 0 && player.finishedAt === null) {
        newPlayers[currentPlayer] = { ...newPlayers[currentPlayer], finishedAt: newFinishOrder.length };
        newFinishOrder.push(currentPlayer);
        addLog(`🏆 ${player.name} 第${newFinishOrder.length}名完成！`, "#ffd700");

        if (newFinishOrder.length >= 3) {
          newGameOver = true;
          const lastPlayer = [0, 1, 2, 3].find(i => !newFinishOrder.includes(i));
          if (lastPlayer !== undefined) {
            newFinishOrder.push(lastPlayer);
            newPlayers[lastPlayer] = { ...newPlayers[lastPlayer], finishedAt: 3 };
            addLog(`❌ ${newPlayers[lastPlayer].name} 第4名淘汰！`, "#ff4444");
          }
          const winner = newPlayers[newFinishOrder[0]];
          const loser = newPlayers[newFinishOrder[3]];
          addLog(`🎉 ${winner.name} 获胜！`, "#00ff88");
          setTimeout(() => {
            onGameEnd && onGameEnd({
              winner: winner.name,
              loser: loser.name,
              finishOrder: newFinishOrder.map(i => newPlayers[i].name),
              tableNumber,
            });
          }, 2000);
        }
      }

      const activePlayers = [0, 1, 2, 3].filter(i => newPlayers[i].finishedAt === null);
      const allPassed = newPassCount >= activePlayers.length - 1 && newLastPlayPlayer !== null;

      if (allPassed && !newGameOver) {
        addLog(`↩ 回到 ${newPlayers[newLastPlayPlayer].name} 出牌`, "#64748b");
        return {
          ...prev,
          players: newPlayers,
          currentPlayer: newLastPlayPlayer,
          lastPlay: [],
          lastPlayPlayer: null,
          passCount: 0,
          playArea: [],
          playAreaOwner: null,
          finishOrder: newFinishOrder,
          gameOver: newGameOver,
        };
      }

      let nextPlayer = (currentPlayer + 1) % 4;
      let tries = 0;
      while (newPlayers[nextPlayer].finishedAt !== null && tries < 4) {
        nextPlayer = (nextPlayer + 1) % 4;
        tries++;
      }

      return {
        ...prev,
        players: newPlayers,
        currentPlayer: nextPlayer,
        lastPlay: newLastPlay,
        lastPlayPlayer: newLastPlayPlayer,
        passCount: newPassCount,
        playArea: newPlayArea,
        playAreaOwner: newPlayAreaOwner,
        finishOrder: newFinishOrder,
        gameOver: newGameOver,
      };
    });
  }, [addLog, onGameEnd, tableNumber]);

  useEffect(() => {
    if (isRunning && !gameState?.gameOver) {
      intervalRef.current = setInterval(playStep, speed);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, playStep, speed, gameState?.gameOver]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  if (!gameState) return <div className="text-center p-8" style={{ color: "#64748b" }}>初始化中...</div>;

  const { players, currentPlayer, playArea, playAreaOwner, finishOrder, currentLevel, levelRank, gameOver } = gameState;

  // Layout: [top=2, left=3, bottom=0, right=1]
  // Positions: 0=bottom, 1=right, 2=top, 3=left
  const topPlayer = players[2];
  const leftPlayer = players[3];
  const bottomPlayer = players[0];
  const rightPlayer = players[1];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-orbitron text-xs" style={{ color: "#64748b" }}>第{tableNumber}桌</span>
          <span className="px-3 py-1 rounded text-xs font-bold" style={{
            background: "#ffd70022", color: "#ffd700",
            border: "1px solid #ffd70044", fontFamily: "Orbitron, sans-serif"
          }}>
            级牌: {levelRank}
          </span>
          {gameOver && (
            <span className="px-3 py-1 rounded text-xs animate-pulse" style={{
              background: "#00ff8822", color: "#00ff88", border: "1px solid #00ff8844", fontFamily: "Orbitron, sans-serif"
            }}>游戏结束</span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", fontFamily: "Orbitron, sans-serif" }}>
            <option value={1500}>慢速</option>
            <option value={800}>正常</option>
            <option value={350}>快速</option>
            <option value={100}>极速</option>
          </select>
          <button className="btn-primary px-4 py-1.5 text-xs" onClick={() => setIsRunning(r => !r)} disabled={gameOver}>
            {isRunning ? "⏸ 暂停" : "▶ 开始"}
          </button>
          <button className="text-xs px-3 py-1.5 rounded" onClick={() => { setIsRunning(false); initGame(currentLevel); }}
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", fontFamily: "Orbitron, sans-serif" }}>
            ↺ 重开
          </button>
        </div>
      </div>

      {/* Main game layout */}
      <div className="flex gap-4">
        {/* Game board */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Top player */}
          <div className="flex justify-center">
            <PlayerHand player={topPlayer} isActive={currentPlayer === 2 && !gameOver} position="top" />
          </div>

          {/* Middle row: left | center | right */}
          <div className="flex items-center gap-3">
            {/* Left player */}
            <div className="flex justify-center" style={{ width: 230, flexShrink: 0 }}>
              <PlayerHand player={leftPlayer} isActive={currentPlayer === 3 && !gameOver} position="left" />
            </div>

            {/* Center play area */}
            <div className="flex-1 rounded-xl flex flex-col items-center justify-center gap-3 py-6" style={{
              background: "radial-gradient(ellipse at center, #0d2a1a 0%, #060d14 100%)",
              border: "1px solid rgba(0,245,255,0.12)",
              minHeight: 180,
            }}>
              {playArea && playArea.length > 0 ? (
                <div className="flex flex-col items-center gap-2">
                  {/* Who played */}
                  {playAreaOwner !== null && (
                    <p className="text-xs" style={{ color: players[playAreaOwner]?.color, fontFamily: "Orbitron, sans-serif", fontSize: 9 }}>
                      {players[playAreaOwner]?.name.replace("OpenClaw ", "")} 出牌
                    </p>
                  )}
                  {/* Cards */}
                  <div className="flex gap-1 flex-wrap justify-center">
                    {playArea.map((card, i) => (
                      <CardComponent key={i} card={card} />
                    ))}
                  </div>
                  {/* Type label */}
                  {(() => {
                    const t = getCardType(playArea, levelRank);
                    return t ? (
                      <span className="text-xs px-2 py-0.5 rounded" style={{
                        background: "rgba(0,245,255,0.1)", color: "#00f5ff",
                        border: "1px solid rgba(0,245,255,0.2)", fontFamily: "Orbitron, sans-serif", fontSize: 9
                      }}>{getTypeLabel(t.type)}</span>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-20">
                  <span style={{ fontSize: 40 }}>🦞</span>
                  <p className="font-orbitron text-xs" style={{ color: "#64748b" }}>等待出牌</p>
                </div>
              )}

              {/* Finish order badges */}
              {finishOrder.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {finishOrder.map((pi, rank) => (
                    <span key={pi} className="text-xs px-2 py-0.5 rounded" style={{
                      background: rank === 0 ? "#ffd70022" : rank === 3 ? "#ff444422" : "rgba(255,255,255,0.05)",
                      color: rank === 0 ? "#ffd700" : rank === 3 ? "#ff4444" : "#94a3b8",
                      border: `1px solid ${rank === 0 ? "#ffd70044" : rank === 3 ? "#ff444444" : "rgba(255,255,255,0.1)"}`,
                      fontFamily: "Orbitron, sans-serif", fontSize: 9
                    }}>
                      {["🥇", "🥈", "🥉", "❌"][rank]} {players[pi].name.replace("OpenClaw ", "")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right player */}
            <div className="flex justify-center" style={{ width: 230, flexShrink: 0 }}>
              <PlayerHand player={rightPlayer} isActive={currentPlayer === 1 && !gameOver} position="right" />
            </div>
          </div>

          {/* Bottom player */}
          <div className="flex justify-center">
            <PlayerHand player={bottomPlayer} isActive={currentPlayer === 0 && !gameOver} position="bottom" />
          </div>
        </div>

        {/* Log panel */}
        <div className="w-56 card-dark p-3 flex flex-col" style={{ maxHeight: 520, minHeight: 400 }}>
          <p className="font-orbitron text-xs mb-3 pb-2" style={{
            color: "#64748b", letterSpacing: "1px",
            borderBottom: "1px solid rgba(255,255,255,0.06)"
          }}>对战记录</p>
          <div ref={logRef} className="flex-1 overflow-y-auto space-y-1.5">
            {log.map(entry => (
              <p key={entry.id} className="text-xs leading-snug" style={{ color: entry.color }}>
                {entry.msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}