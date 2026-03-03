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

const SEAT_POSITIONS = ["bottom", "right", "top", "left"];

export default function GameTable({ tableNumber, round, onGameEnd }) {
  const [gameState, setGameState] = useState(null);
  const [log, setLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(800);
  const intervalRef = useRef(null);
  const logRef = useRef(null);

  const addLog = useCallback((msg, color = "#e2e8f0") => {
    setLog(prev => [...prev.slice(-30), { msg, color, id: Date.now() + Math.random() }]);
  }, []);

  const initGame = useCallback((levelOverride) => {
    const deck = createAndShuffleDeck();
    const { hands, kitty } = dealCards(deck);
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
      kitty,
      currentLevel: level,
      levelRank,
      currentPlayer: 0,
      lastPlay: [],
      lastPlayPlayer: null,
      passCount: 0,
      playArea: [],
      finishOrder: [],
      gameOver: false,
      roundNum: 1,
    });
    setLog([]);
    addLog(`⚡ 第${round === "finals" ? "决赛" : "预选赛"} 第${tableNumber}桌 游戏开始！`, "#00f5ff");
    addLog(`🎮 当前级牌：${levelRank}`, "#ffd700");
  }, [round, tableNumber, addLog]);

  useEffect(() => {
    initGame(2);
  }, []);

  // Auto-play step
  const playStep = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.gameOver) return prev;

      const { players, currentPlayer, lastPlay, lastPlayPlayer, passCount, finishOrder } = prev;
      const player = players[currentPlayer];

      if (!player || player.finishedAt !== null) {
        // Skip finished players
        return { ...prev, currentPlayer: (currentPlayer + 1) % 4 };
      }

      const isFirstPlay = lastPlay.length === 0 || passCount >= (4 - finishOrder.length - 1);
      const mustPlay = isFirstPlay || lastPlayPlayer === currentPlayer;

      // AI decides
      const playCards = aiPlay(player.hand, isFirstPlay ? [] : lastPlay, prev.levelRank, isFirstPlay, mustPlay);

      let newHand = player.hand;
      let newLastPlay = lastPlay;
      let newLastPlayPlayer = lastPlayPlayer;
      let newPassCount = passCount;
      let newPlayArea = prev.playArea;

      if (playCards && playCards.length > 0) {
        // Play the cards
        newHand = player.hand.filter(c => !playCards.some(p => p.id === c.id));
        newLastPlay = playCards;
        newLastPlayPlayer = currentPlayer;
        newPassCount = 0;
        newPlayArea = playCards;

        const type = getCardType(playCards, prev.levelRank);
        const typeLabel = type ? getTypeLabel(type.type) : "";
        addLog(`🦞 ${player.name} 出牌: ${playCards.map(c => `${c.rank}${c.suit}`).join(" ")} [${typeLabel}]`, player.color);
      } else {
        // Pass
        newPassCount = passCount + 1;
        addLog(`⏭ ${player.name} 过牌`, "#475569");
      }

      const newPlayers = players.map((p, i) => {
        if (i === currentPlayer) return { ...p, hand: newHand };
        return p;
      });

      // Check win
      let newFinishOrder = [...finishOrder];
      let newGameOver = false;

      if (newHand.length === 0 && !player.finishedAt) {
        newPlayers[currentPlayer] = { ...newPlayers[currentPlayer], finishedAt: newFinishOrder.length };
        newFinishOrder.push(currentPlayer);
        addLog(`🏆 ${player.name} 第${newFinishOrder.length}名完成！`, "#ffd700");

        if (newFinishOrder.length >= 3) {
          newGameOver = true;
          // Last player is 4th
          const lastPlayer = [0, 1, 2, 3].find(i => !newFinishOrder.includes(i));
          if (lastPlayer !== undefined) {
            newFinishOrder.push(lastPlayer);
            addLog(`❌ ${newPlayers[lastPlayer].name} 第4名，出局！`, "#ff4444");
          }

          const winner = newPlayers[newFinishOrder[0]];
          const loser = newPlayers[newFinishOrder[3]];
          addLog(`🎉 ${winner.name} 获得胜利！`, "#00ff88");
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

      // If all remaining players passed (go back to last play winner)
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
          finishOrder: newFinishOrder,
          gameOver: newGameOver,
        };
      }

      // Next active player
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
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  function getTypeLabel(type) {
    const map = {
      single: "单张", pair: "对子", triple: "三张", bomb: "炸弹",
      sequence: "顺子", pair_sequence: "连对", straight_flush: "同花顺炸弹"
    };
    return map[type] || type;
  }

  if (!gameState) return <div className="text-center p-8" style={{ color: "#64748b" }}>初始化中...</div>;

  const { players, currentPlayer, playArea, finishOrder, currentLevel, levelRank, gameOver } = gameState;

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-orbitron text-sm" style={{ color: "#64748b" }}>
            第{tableNumber}桌
          </span>
          <span className="px-3 py-1 rounded text-xs font-bold" style={{
            background: "#ffd70022", color: "#ffd700",
            border: "1px solid #ffd70044", fontFamily: "Orbitron, sans-serif"
          }}>
            级牌: {levelRank}
          </span>
        </div>
        <div className="flex gap-2">
          <select
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="text-xs px-2 py-1 rounded"
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", fontFamily: "Orbitron, sans-serif" }}
          >
            <option value={1200}>慢速</option>
            <option value={800}>正常</option>
            <option value={400}>快速</option>
            <option value={150}>极速</option>
          </select>
          <button
            className="btn-primary px-3 py-1 text-xs"
            onClick={() => setIsRunning(r => !r)}
            disabled={gameOver}
          >
            {isRunning ? "⏸ 暂停" : "▶ 开始"}
          </button>
          <button
            className="text-xs px-3 py-1 rounded"
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", fontFamily: "Orbitron, sans-serif" }}
            onClick={() => { setIsRunning(false); initGame(currentLevel); }}
          >
            ↺ 重开
          </button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex gap-4 flex-1">
        {/* Game board */}
        <div className="flex-1 relative rounded-xl overflow-hidden" style={{
          background: "radial-gradient(ellipse at center, #0d2a1a 0%, #060d14 100%)",
          border: "1px solid rgba(0,245,255,0.1)",
          minHeight: 340,
        }}>
          {/* Players */}
          {players.map((player, i) => {
            const positions = [
              "bottom-3 left-1/2 -translate-x-1/2", // bottom
              "right-3 top-1/2 -translate-y-1/2",   // right
              "top-3 left-1/2 -translate-x-1/2",    // top
              "left-3 top-1/2 -translate-y-1/2",    // left
            ];
            const isActive = currentPlayer === i && !gameOver;
            const isFinished = player.finishedAt !== null;
            const rank = finishOrder.indexOf(i);

            return (
              <div key={i} className={`absolute ${positions[i]} flex flex-col items-center gap-1`}>
                {/* Cards - show all actual cards for spectator view */}
                <div className="flex" style={{ flexWrap: "wrap", gap: 1, justifyContent: "center", maxWidth: 220 }}>
                  {player.hand.map((card, ci) => (
                    <CardComponent key={ci} card={card} small />
                  ))}
                </div>
                {/* Player info */}
                <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${isActive ? "glow-cyan" : ""}`} style={{
                  background: isActive ? "rgba(0,245,255,0.1)" : "rgba(0,0,0,0.5)",
                  border: `1px solid ${isActive ? player.color : "rgba(255,255,255,0.1)"}`,
                  opacity: isFinished ? 0.5 : 1,
                }}>
                  <span style={{ fontSize: 14 }}>{player.avatar}</span>
                  <div className="text-center">
                    <p className="font-bold" style={{ color: player.color, fontFamily: "Orbitron, sans-serif", fontSize: 9 }}>
                      {player.name.split(" ")[1]}
                    </p>
                    <p style={{ color: "#64748b", fontSize: 9 }}>
                      {isFinished ? (rank === 0 ? "🏆 1st" : rank === 1 ? "🥈 2nd" : rank === 2 ? "🥉 3rd" : "❌ 4th") : `${player.hand.length}张`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center play area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              {playArea && playArea.length > 0 ? (
                <div className="flex gap-1 flex-wrap justify-center">
                  {playArea.map((card, i) => (
                    <CardComponent key={i} card={card} small />
                  ))}
                </div>
              ) : (
                <div style={{ width: 60, height: 80, borderRadius: 8, border: "1px dashed rgba(0,245,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 20, opacity: 0.2 }}>🦞</span>
                </div>
              )}
              {gameOver && (
                <div className="text-center">
                  <p className="font-orbitron text-sm" style={{ color: "#ffd700" }}>游戏结束！</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Log panel */}
        <div className="w-52 card-dark p-3 flex flex-col" style={{ maxHeight: 380 }}>
          <p className="font-orbitron text-xs mb-2" style={{ color: "#64748b", letterSpacing: "1px" }}>对战记录</p>
          <div ref={logRef} className="flex-1 overflow-y-auto space-y-1" style={{ scrollBehavior: "smooth" }}>
            {log.map(entry => (
              <p key={entry.id} className="text-xs leading-tight" style={{ color: entry.color, fontFamily: "Rajdhani, sans-serif" }}>
                {entry.msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}