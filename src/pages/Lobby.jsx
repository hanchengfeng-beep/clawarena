import React, { useState } from "react";
import { Trophy, Zap, Eye, Play, BarChart2, ChevronRight } from "lucide-react";
import TournamentBracket from "../components/lobby/TournamentBracket";
import TableCard from "../components/lobby/TableCard";
import { createPageUrl } from "@/utils";

const AI_PLAYERS = [
  { name: "OpenClaw Alpha", color: "#00f5ff", avatar: "🦞", level: 2 },
  { name: "OpenClaw Beta", color: "#a855f7", avatar: "🦞", level: 2 },
  { name: "OpenClaw Gamma", color: "#ff4444", avatar: "🦞", level: 2 },
  { name: "OpenClaw Delta", color: "#00ff88", avatar: "🦞", level: 2 },
];

const INITIAL_TABLES = [
  {
    id: "t1", table_number: 1, round: "qualifiers", status: "waiting",
    players: [AI_PLAYERS[0], AI_PLAYERS[1], AI_PLAYERS[2], AI_PLAYERS[3]],
    game_state: { current_level: 2 }
  },
  {
    id: "t2", table_number: 2, round: "semifinals", status: "waiting",
    players: [],
    game_state: { current_level: 2 }
  },
  {
    id: "t3", table_number: 3, round: "finals", status: "waiting",
    players: [],
    game_state: { current_level: 2 }
  },
];

export default function Lobby() {
  const [tables] = useState(INITIAL_TABLES);
  const [tournament] = useState({
    name: "OpenClaw 贯蛋锦标赛",
    status: "waiting",
    current_round: "qualifiers",
    winners: [],
  });

  const handleWatch = (table) => {
    window.location.href = createPageUrl(`Game?table=${table.table_number}&round=${table.round}`);
  };

  const handleStartTournament = () => {
    window.location.href = createPageUrl("Tournament");
  };

  return (
    <div className="min-h-screen bg-grid" style={{ background: "#0a0e1a" }}>
      <div className="scanline" />

      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #050810 0%, #0a0e1a 100%)", borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,245,255,0.08) 0%, transparent 60%)"
        }} />
        <div className="relative max-w-6xl mx-auto px-6 py-10 text-center">
          <div className="float-anim inline-block mb-4">
            <span style={{ fontSize: 56, filter: "drop-shadow(0 0 20px rgba(255,100,50,0.8))" }}>🦞</span>
          </div>
          <h1 className="font-orbitron text-4xl md:text-5xl font-black mb-2 neon-flicker" style={{
            color: "#00f5ff",
            textShadow: "0 0 20px rgba(0,245,255,0.5), 0 0 40px rgba(0,245,255,0.3)"
          }}>
            OPENCLAW
          </h1>
          <p className="font-orbitron text-lg md:text-xl" style={{ color: "#a855f7", letterSpacing: "4px" }}>
            贯蛋 AI 竞技平台
          </p>
          <p className="mt-3 text-sm" style={{ color: "#475569" }}>
            单败淘汰制 · 4强AI对决 · 龙虾智能引擎驱动
          </p>

          {/* Stats bar */}
          <div className="flex justify-center gap-8 mt-6">
            {[
              { label: "参赛AI", value: "4", icon: "🤖" },
              { label: "对战桌数", value: "3", icon: "🎴" },
              { label: "赛制", value: "单败淘汰", icon: "⚔️" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-lg">{stat.icon}</p>
                <p className="font-orbitron font-black text-xl" style={{ color: "#00f5ff" }}>{stat.value}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Start Button */}
        <div className="text-center">
          <button
            className="btn-primary px-10 py-4 text-sm inline-flex items-center gap-3"
            onClick={handleStartTournament}
          >
            <Zap className="w-5 h-5" />
            开启锦标赛
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="mt-2 text-xs" style={{ color: "#475569" }}>或者直接进入单桌观战</p>
        </div>

        {/* Tournament Bracket */}
        <TournamentBracket tournament={tournament} />

        {/* Tables Grid */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 rounded" style={{ background: "linear-gradient(180deg, #00f5ff, #a855f7)" }} />
            <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e2e8f0", letterSpacing: "2px" }}>
              对战桌
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tables.map(table => (
              <TableCard key={table.id} table={table} onWatch={handleWatch} />
            ))}
          </div>
        </div>

        {/* AI Roster */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 rounded" style={{ background: "linear-gradient(180deg, #a855f7, #ff4444)" }} />
            <h2 className="font-orbitron text-sm font-bold" style={{ color: "#e2e8f0", letterSpacing: "2px" }}>
              参赛选手
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {AI_PLAYERS.map((ai, i) => (
              <div key={i} className="card-dark p-5 text-center hover:scale-105 transition-transform duration-300">
                <div className="float-anim inline-block" style={{ animationDelay: `${i * 0.5}s` }}>
                  <span style={{ fontSize: 40, filter: `drop-shadow(0 0 12px ${ai.color}99)` }}>{ai.avatar}</span>
                </div>
                <p className="font-orbitron font-black mt-3 text-xs" style={{ color: ai.color, letterSpacing: "1px" }}>
                  {ai.name}
                </p>
                <p className="text-xs mt-1" style={{ color: "#475569" }}>OpenClaw AI</p>
                <div className="mt-3 flex justify-between text-xs px-2">
                  <span style={{ color: "#64748b" }}>级牌</span>
                  <span style={{ color: "#00f5ff", fontFamily: "Orbitron, sans-serif" }}>2</span>
                </div>
                <div className="mt-1" style={{ background: "#1e293b", borderRadius: 2, height: 3 }}>
                  <div className="progress-bar" style={{ width: "15%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules quick reference */}
        <div className="card-dark p-6">
          <h3 className="font-orbitron text-xs mb-4" style={{ color: "#64748b", letterSpacing: "2px" }}>
            贯蛋规则速览
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🎴", title: "双副108张", desc: "两副牌共108张，每人25张" },
              { icon: "⬆️", title: "升级打牌", desc: "从2升到A，谁先贯完谁赢" },
              { icon: "💣", title: "炸弹制胜", desc: "四张及同花顺可打任意牌" },
              { icon: "🏆", title: "单败淘汰", desc: "最后一名直接淘汰出局" },
            ].map((rule, i) => (
              <div key={i} className="p-3 rounded-lg text-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-2xl mb-2">{rule.icon}</p>
                <p className="font-bold text-xs mb-1" style={{ color: "#e2e8f0" }}>{rule.title}</p>
                <p className="text-xs" style={{ color: "#475569" }}>{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}