import React, { useState } from "react";
import { Trophy, Zap, ChevronRight, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

const AI_PLAYERS = [
  { name: "OpenClaw Alpha", color: "#00f5ff", avatar: "🦞" },
  { name: "OpenClaw Beta", color: "#a855f7", avatar: "🦞" },
  { name: "OpenClaw Gamma", color: "#ff4444", avatar: "🦞" },
  { name: "OpenClaw Delta", color: "#00ff88", avatar: "🦞" },
];

const ROUNDS = [
  {
    id: "qualifiers",
    label: "预选赛",
    color: "#00f5ff",
    tables: [
      { table: 1, players: ["OpenClaw Alpha", "OpenClaw Beta"] },
      { table: 2, players: ["OpenClaw Gamma", "OpenClaw Delta"] },
    ],
  },
  {
    id: "finals",
    label: "决赛",
    color: "#ffd700",
    tables: [
      { table: 3, players: ["预选赛胜者1", "预选赛胜者2"] },
    ],
  },
];

export default function Tournament() {
  const [currentRound, setCurrentRound] = useState(0);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [winners, setWinners] = useState([]);
  const [champion, setChampion] = useState(null);

  const round = ROUNDS[currentRound];

  const getAI = (name) => AI_PLAYERS.find(a => a.name === name) || { name, color: "#e2e8f0", avatar: "🦞" };

  const handleWatchTable = (table, roundId) => {
    window.location.href = createPageUrl(`Game?table=${table}&round=${roundId}`);
  };

  return (
    <div className="min-h-screen bg-grid" style={{ background: "#0a0e1a" }}>
      <div className="scanline" />

      {/* Header */}
      <div className="border-b" style={{ borderColor: "rgba(0,245,255,0.1)", background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <a
            href={createPageUrl("Lobby")}
            className="flex items-center gap-2 text-sm hover:opacity-70"
            style={{ color: "#64748b" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11 }}>大厅</span>
          </a>
          <div className="text-center">
            <h1 className="font-orbitron font-black text-lg" style={{ color: "#00f5ff", textShadow: "0 0 15px rgba(0,245,255,0.4)" }}>
              🦞 OPENCLAW 锦标赛
            </h1>
            <p className="text-xs" style={{ color: "#475569" }}>单败淘汰制 · AI贯蛋对决</p>
          </div>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          {ROUNDS.map((r, i) => (
            <React.Fragment key={r.id}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${i === currentRound ? "glow-cyan" : ""}`} style={{
                background: i <= currentRound ? `${r.color}15` : "rgba(0,0,0,0.3)",
                border: `1px solid ${i <= currentRound ? r.color + "44" : "rgba(255,255,255,0.05)"}`,
              }}>
                <span style={{ color: i <= currentRound ? r.color : "#475569", fontFamily: "Orbitron, sans-serif", fontSize: 11 }}>
                  {r.label}
                </span>
              </div>
              {i < ROUNDS.length - 1 && (
                <ChevronRight className="w-4 h-4" style={{ color: "#334155" }} />
              )}
            </React.Fragment>
          ))}
          {champion && (
            <>
              <ChevronRight className="w-4 h-4" style={{ color: "#334155" }} />
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg glow-gold" style={{
                background: "#ffd70015", border: "1px solid #ffd70044"
              }}>
                <Trophy className="w-4 h-4" style={{ color: "#ffd700" }} />
                <span style={{ color: "#ffd700", fontFamily: "Orbitron, sans-serif", fontSize: 11 }}>冠军</span>
              </div>
            </>
          )}
        </div>

        {/* Champion announcement */}
        {champion && (
          <div className="text-center py-10 card-dark slide-in" style={{ border: "1px solid #ffd70066" }}>
            <div className="float-anim">
              <span style={{ fontSize: 72, filter: "drop-shadow(0 0 30px rgba(255,215,0,0.9))" }}>🦞</span>
            </div>
            <h2 className="font-orbitron text-3xl font-black mt-4" style={{
              color: "#ffd700",
              textShadow: "0 0 30px rgba(255,215,0,0.6)"
            }}>
              {champion}
            </h2>
            <p className="font-orbitron text-sm mt-2" style={{ color: "#a855f7", letterSpacing: "3px" }}>
              OPENCLAW 贯蛋冠军
            </p>
          </div>
        )}

        {/* Current Round */}
        {!champion && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded" style={{ background: `linear-gradient(180deg, ${round.color}, transparent)` }} />
                <h2 className="font-orbitron text-sm font-bold" style={{ color: round.color, letterSpacing: "2px" }}>
                  {round.label}
                </h2>
              </div>
              <span className="text-xs px-3 py-1 rounded" style={{
                background: "#1e293b", color: "#64748b",
                border: "1px solid #334155", fontFamily: "Orbitron, sans-serif"
              }}>
                单败淘汰制
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {round.tables.map((t, i) => {
                const players = currentRound === 0
                  ? t.players
                  : winners.length >= 2
                    ? winners.slice(0, 2)
                    : t.players;

                return (
                  <div key={i} className="card-dark p-6 hover:scale-105 transition-transform duration-300" style={{ border: `1px solid ${round.color}33` }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-orbitron text-xs" style={{ color: "#64748b" }}>
                        第{t.table}桌 · {round.label}
                      </span>
                      <div className="w-2 h-2 rounded-full" style={{ background: round.color, boxShadow: `0 0 8px ${round.color}` }} />
                    </div>

                    {/* VS display */}
                    <div className="flex items-center justify-center gap-4 py-4">
                      {players.map((pName, pi) => {
                        const ai = getAI(pName);
                        return (
                          <React.Fragment key={pi}>
                            <div className="text-center flex-1">
                              <div className="float-anim" style={{ animationDelay: `${pi * 0.5}s` }}>
                                <span style={{ fontSize: 36, filter: `drop-shadow(0 0 10px ${ai.color}88)` }}>{ai.avatar}</span>
                              </div>
                              <p className="font-orbitron mt-2 font-bold" style={{
                                color: ai.color,
                                fontSize: 10,
                                letterSpacing: "0.5px"
                              }}>
                                {ai.name}
                              </p>
                            </div>
                            {pi === 0 && (
                              <div className="text-center">
                                <p className="font-orbitron text-xl font-black" style={{ color: "#475569" }}>VS</p>
                                <div className="w-px h-8 mx-auto mt-1" style={{ background: "linear-gradient(180deg, #334155, transparent)" }} />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <button
                      className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2"
                      onClick={() => handleWatchTable(t.table, round.id)}
                    >
                      <Zap className="w-4 h-4" />
                      进入观战
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All rounds summary */}
        {completedRounds.length > 0 && (
          <div className="card-dark p-6">
            <h3 className="font-orbitron text-xs mb-4" style={{ color: "#64748b", letterSpacing: "2px" }}>已完成赛事</h3>
            <div className="space-y-3">
              {completedRounds.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <span className="text-xs" style={{ color: "#475569", fontFamily: "Orbitron, sans-serif" }}>{r.label}</span>
                  <span className="text-xs" style={{ color: "#00ff88" }}>✓ 已完成</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="card-dark p-6">
          <h3 className="font-orbitron text-xs mb-4" style={{ color: "#64748b", letterSpacing: "2px" }}>赛制说明</h3>
          <div className="space-y-3">
            {[
              { step: "1", desc: "预选赛：4名AI分2桌对战，每桌2人对决" },
              { step: "2", desc: "每桌最后一名（第4名完成出牌）直接淘汰" },
              { step: "3", desc: "决赛：2位预选赛胜者争夺最终冠军" },
              { step: "4", desc: "冠军即为本届 OpenClaw 贯蛋锦标赛得主" },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "#00f5ff22", color: "#00f5ff", border: "1px solid #00f5ff33", fontFamily: "Orbitron, sans-serif" }}>
                  {r.step}
                </span>
                <p className="text-sm" style={{ color: "#94a3b8" }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}