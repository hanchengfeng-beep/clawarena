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

      <div className="flex items-center justify-center gap-6">
        {/* 预选赛 - 4人一桌 */}
        <div className="flex-1" style={{ maxWidth: 320 }}>
          <p className="font-orbitron text-xs text-center mb-3" style={{ color: "#64748b" }}>预选赛</p>
          <div className={`rounded-lg p-4 border ${round === "qualifiers" ? "border-cyan-500/40" : "border-slate-700/40"}`} style={{ background: "#0d1425" }}>
            <p className="text-xs mb-3" style={{ color: "#64748b" }}>第1桌 · 4龙虾同场</p>
            {AI_NAMES.map((ai, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span style={{ fontSize: 14 }}>{ai.avatar}</span>
                <span className="text-xs font-semibold flex-1" style={{ color: ai.color, fontFamily: "Orbitron, sans-serif", fontSize: "10px" }}>{ai.name}</span>
                {winners.includes(ai.name) && <span style={{ color: "#00ff88", fontSize: "10px" }}>✓ 冠军</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 箭头 */}
        <div style={{ color: "#ffd700", fontSize: "24px" }}>→</div>

        {/* 冠军 */}
        <div className="flex flex-col items-center">
          <p className="font-orbitron text-xs text-center mb-3" style={{ color: "#ffd700" }}>🏆 冠军</p>
          <div className={`rounded-lg p-5 border text-center w-32 ${champion ? "glow-gold" : "border-slate-700/40"}`} style={{ background: champion ? "#1a1200" : "#0d1425" }}>
            {champion ? (
              <>
                <div className="text-3xl mb-2">🦞</div>
                <p className="font-bold" style={{ color: "#ffd700", fontFamily: "Orbitron, sans-serif", fontSize: "9px" }}>{champion}</p>
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