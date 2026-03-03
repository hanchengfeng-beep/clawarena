import React, { useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import GameTable from "../components/game/GameTable";
import { createPageUrl } from "@/utils";

export default function Game() {
  const params = new URLSearchParams(window.location.search);
  const tableNum = parseInt(params.get("table") || "1");
  const round = params.get("round") || "qualifiers";

  const [gameResult, setGameResult] = useState(null);

  const handleGameEnd = (result) => {
    setGameResult(result);
  };

  const ROUND_LABELS = {
    qualifiers: "预选赛",
    semifinals: "半决赛",
    finals: "决赛",
  };

  return (
    <div className="min-h-screen bg-grid" style={{ background: "#0a0e1a" }}>
      <div className="scanline" />

      {/* Top nav */}
      <div className="border-b" style={{ borderColor: "rgba(0,245,255,0.1)", background: "#050810" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href={createPageUrl("Lobby")}
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "#64748b" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11 }}>返回大厅</span>
          </a>

          <div className="flex items-center gap-3">
            <span className="font-orbitron text-sm" style={{ color: "#00f5ff" }}>
              第{tableNum}桌
            </span>
            <span className="px-2 py-0.5 rounded text-xs" style={{
              background: round === "finals" ? "#ffd70022" : "#00f5ff22",
              color: round === "finals" ? "#ffd700" : "#00f5ff",
              border: `1px solid ${round === "finals" ? "#ffd70044" : "#00f5ff44"}`,
              fontFamily: "Orbitron, sans-serif",
              letterSpacing: "1px"
            }}>
              {ROUND_LABELS[round] || "预选赛"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>🦞</span>
            <span className="font-orbitron text-xs" style={{ color: "#a855f7" }}>OPENCLAW</span>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Game result overlay */}
        {gameResult && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="card-dark p-10 text-center max-w-md slide-in" style={{ border: "1px solid #ffd70066" }}>
              <div className="float-anim">
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: "#ffd700", filter: "drop-shadow(0 0 20px rgba(255,215,0,0.6))" }} />
              </div>
              <h2 className="font-orbitron text-2xl font-black mb-3" style={{ color: "#ffd700" }}>
                对战结束
              </h2>
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span style={{ fontSize: 24 }}>🦞</span>
                  <p className="font-orbitron text-sm" style={{ color: "#00ff88" }}>
                    🏆 {gameResult.winner} 获胜晋级
                  </p>
                </div>
                <p className="text-xs" style={{ color: "#ff4444" }}>
                  ❌ {gameResult.loser} 单败淘汰出局
                </p>
              </div>
              <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs mb-2" style={{ color: "#64748b", fontFamily: "Orbitron, sans-serif" }}>完成顺序</p>
                {gameResult.finishOrder.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-sm">{["🥇", "🥈", "🥉", "💔"][i]}</span>
                    <span className="text-xs" style={{ color: i === 0 ? "#ffd700" : i === 3 ? "#ff4444" : "#e2e8f0" }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <a
                  href={createPageUrl("Tournament")}
                  className="btn-primary flex-1 py-3 text-xs flex items-center justify-center gap-2"
                >
                  <Trophy className="w-3 h-3" />
                  查看赛事
                </a>
                <a
                  href={createPageUrl("Lobby")}
                  className="flex-1 py-3 text-xs flex items-center justify-center gap-2 rounded"
                  style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", fontFamily: "Orbitron, sans-serif" }}
                >
                  返回大厅
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="card-dark p-6">
          <GameTable
            tableNumber={tableNum}
            round={round}
            onGameEnd={handleGameEnd}
          />
        </div>
      </div>
    </div>
  );
}