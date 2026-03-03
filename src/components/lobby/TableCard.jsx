import React from "react";
import { Eye, Play, Users } from "lucide-react";

const ROUND_LABELS = {
  qualifiers: { label: "预选赛", color: "#00f5ff" },
  semifinals: { label: "半决赛", color: "#a855f7" },
  finals: { label: "决赛", color: "#ffd700" },
};

export default function TableCard({ table, onWatch }) {
  const round = ROUND_LABELS[table.round] || ROUND_LABELS.qualifiers;
  const isPlaying = table.status === "playing";
  const isFinished = table.status === "finished";

  return (
    <div className={`${isPlaying ? "card-playing" : "card-dark"} p-5 cursor-pointer transition-all duration-300 hover:scale-105`}
      onClick={() => onWatch(table)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-orbitron text-xs font-bold" style={{ color: "#64748b" }}>
            第 {table.table_number} 桌
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
            background: `${round.color}22`,
            color: round.color,
            border: `1px solid ${round.color}55`,
            fontFamily: "Orbitron, sans-serif",
            fontSize: "9px",
            letterSpacing: "1px"
          }}>
            {round.label}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${isPlaying ? "animate-pulse" : ""}`} style={{
          background: isFinished ? "#0f2a0f" : isPlaying ? "#0a1f2a" : "#1a1a2e",
          color: isFinished ? "#00ff88" : isPlaying ? "#00f5ff" : "#64748b",
          border: `1px solid ${isFinished ? "#00ff8844" : isPlaying ? "#00f5ff44" : "#33334466"}`,
        }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{
            background: isFinished ? "#00ff88" : isPlaying ? "#00f5ff" : "#64748b",
            boxShadow: isPlaying ? "0 0 6px #00f5ff" : "none"
          }} />
          {isFinished ? "已结束" : isPlaying ? "对战中" : "等待中"}
        </div>
      </div>

      {/* Players */}
      <div className="space-y-2 mb-4">
        {(table.players || []).map((player, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded" style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.05)"
          }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{player.avatar || "🦞"}</span>
              <div>
                <p className="text-xs font-bold" style={{
                  color: table.winner === player.name ? "#ffd700" : "#e2e8f0",
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "10px"
                }}>
                  {player.name}
                  {table.winner === player.name && " 🏆"}
                  {table.loser === player.name && " ❌"}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>AI · OpenClaw</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold" style={{ color: "#00f5ff", fontFamily: "Orbitron, sans-serif" }}>
                Lv.{player.score || 2}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Watch button */}
      <button className="btn-primary w-full py-2 flex items-center justify-center gap-2 text-xs">
        <Eye className="w-3 h-3" />
        观看对战
      </button>

      {/* Level indicator */}
      {isPlaying && table.game_state && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: "#64748b" }}>
            <span>当前级牌</span>
            <span style={{ color: "#00f5ff", fontFamily: "Orbitron, sans-serif" }}>
              {table.game_state.current_level || 2}
            </span>
          </div>
          <div style={{ background: "#1e293b", borderRadius: "2px", height: "3px" }}>
            <div className="progress-bar" style={{ width: `${Math.min(100, ((table.game_state.current_level || 2) / 14) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}