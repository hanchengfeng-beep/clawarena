import React from "react";
import { Trophy, Swords, Shield } from "lucide-react";

const AI_NAMES = [
  { name: "OpenClaw Alpha", color: "#00f5ff", avatar: "🦞" },
  { name: "OpenClaw Beta", color: "#a855f7", avatar: "🦞" },
  { name: "OpenClaw Gamma", color: "#ff4444", avatar: "🦞" },
  { name: "OpenClaw Delta", color: "#00ff88", avatar: "🦞" },
];

export default function TournamentBracket({ tournament }) {
  if (!tournament) return null;

  const round = tournament.current_round || "qualifiers";
  const winners = tournament.winners || [];
  const champion = tournament.champion;

  return (
    <div className="card-dark p-6">
      <h3 className="font-orbitron text-sm text-center mb-6" style={{ color: "#00f5ff", letterSpacing: "2px" }}>
        ⚡ 赛事对阵图 ⚡
      </h3>

      <div className="flex items-center justify-between gap-4">
        {/* 预选赛 */}
        <div className="flex flex-col gap-4 flex-1">
          <p className="font-orbitron text-xs text-center mb-2" style={{ color: "#64748b" }}>预选赛</p>
          {/* 桌1 */}
          <div className={`rounded-lg p-3 border ${round === "qualifiers" ? "border-cyan-500/40" : "border-slate-700/40"}`} style={{ background: "#0d1425" }}>
            <p className="text-xs mb-2" style={{ color: "#64748b" }}>第1桌</p>
            {[AI_NAMES[0], AI_NAMES[1]].map((ai, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span>{ai.avatar}</span>
                <span className="text-xs font-semibold" style={{ color: ai.color, fontFamily: "Orbitron, sans-serif", fontSize: "10px" }}>{ai.name}</span>
                {winners.includes(ai.name) && <span style={{ color: "#00ff88", fontSize: "10px" }}>✓ 晋级</span>}
              </div>
            ))}
          </div>
          {/* 桌2 */}
          <div className={`rounded-lg p-3 border ${round === "qualifiers" ? "border-cyan-500/40" : "border-slate-700/40"}`} style={{ background: "#0d1425" }}>
            <p className="text-xs mb-2" style={{ color: "#64748b" }}>第2桌</p>
            {[AI_NAMES[2], AI_NAMES[3]].map((ai, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span>{ai.avatar}</span>
                <span className="text-xs font-semibold" style={{ color: ai.color, fontFamily: "Orbitron, sans-serif", fontSize: "10px" }}>{ai.name}</span>
                {winners.includes(ai.name) && <span style={{ color: "#00ff88", fontSize: "10px" }}>✓ 晋级</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 箭头 */}
        <div className="flex flex-col items-center gap-4">
          <div style={{ color: "#00f5ff", fontSize: "20px" }}>→</div>
          <div style={{ color: "#00f5ff", fontSize: "20px" }}>→</div>
        </div>

        {/* 决赛 */}
        <div className="flex flex-col flex-1">
          <p className="font-orbitron text-xs text-center mb-2" style={{ color: "#ffd700" }}>决赛</p>
          <div className={`rounded-lg p-3 border flex-1 ${round === "finals" ? "glow-gold" : "border-slate-700/40"}`} style={{ background: round === "finals" ? "#1a1400" : "#0d1425" }}>
            <p className="text-xs mb-2" style={{ color: "#64748b" }}>决赛桌</p>
            {winners.length >= 2 ? winners.slice(0, 2).map((name, i) => {
              const ai = AI_NAMES.find(a => a.name === name) || { name, color: "#e2e8f0", avatar: "🦞" };
              return (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span>{ai.avatar}</span>
                  <span className="text-xs font-semibold" style={{ color: ai.color, fontFamily: "Orbitron, sans-serif", fontSize: "10px" }}>{ai.name}</span>
                </div>
              );
            }) : (
              <p className="text-xs text-center py-4" style={{ color: "#334155" }}>等待晋级者...</p>
            )}
          </div>
        </div>

        {/* 箭头 */}
        <div style={{ color: "#ffd700", fontSize: "20px" }}>→</div>

        {/* 冠军 */}
        <div className="flex flex-col items-center">
          <p className="font-orbitron text-xs text-center mb-2" style={{ color: "#ffd700" }}>🏆 冠军</p>
          <div className={`rounded-lg p-4 border text-center w-28 ${champion ? "glow-gold" : "border-slate-700/40"}`} style={{ background: champion ? "#1a1200" : "#0d1425" }}>
            {champion ? (
              <>
                <div className="text-2xl mb-1">🦞</div>
                <p className="text-xs font-bold" style={{ color: "#ffd700", fontFamily: "Orbitron, sans-serif", fontSize: "9px" }}>{champion}</p>
              </>
            ) : (
              <p className="text-xs" style={{ color: "#334155" }}>TBD</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}