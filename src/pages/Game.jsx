import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Clock } from "lucide-react";
import GameTable from "../components/game/GameTable";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function Game() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const tableId = params.get("table");
  const round = params.get("round") || "qualifiers";
  const isRegular = round === "regular";

  const [gameResult, setGameResult] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(isRegular);

  const ROUND_LABELS = {
    qualifiers: "预选赛", semifinals: "半决赛", finals: "决赛", regular: "常规赛"
  };

  useEffect(() => {
    if (!isRegular) return;
    // 常规赛：从数据库加载真实桌子数据
    const load = async () => {
      const tables = await base44.entities.Table.filter({ id: tableId });
      setTableData(tables[0] || null);
      setLoading(false);
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [tableId, isRegular]);

  const handleGameEnd = (result) => setGameResult(result);

  const players = tableData?.game_state?.seats || tableData?.players || [];
  const isReady = !isRegular || (tableData && tableData.status === 'playing' && tableData.game_state?.hands);

  return (
    <div className="min-h-screen bg-grid" style={{ background: "#0a0e1a" }}>
      <div className="scanline" />

      {/* Top nav */}
      <div className="border-b" style={{ borderColor: "rgba(0,245,255,0.1)", background: "#050810" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(createPageUrl(isRegular ? "RegularLobby" : "Lobby"))}
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70 bg-none border-none cursor-pointer p-0"
            style={{ color: "#64748b" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span style={{ fontFamily: "Orbitron, sans-serif", fontSize: 11 }}>返回大厅</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-orbitron text-sm" style={{ color: "#00f5ff" }}>
              {isRegular ? `桌 ${String(tableId).slice(-6)}` : `第${tableId}桌`}
            </span>
            <span className="px-2 py-0.5 rounded text-xs" style={{
              background: round === "finals" ? "#ffd70022" : "#00f5ff22",
              color: round === "finals" ? "#ffd700" : "#00f5ff",
              border: `1px solid ${round === "finals" ? "#ffd70044" : "#00f5ff44"}`,
              fontFamily: "Orbitron, sans-serif", letterSpacing: "1px"
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
        {gameResult && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="card-dark p-10 text-center max-w-md slide-in" style={{ border: "1px solid #ffd70066" }}>
              <div className="float-anim">
                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: "#ffd700", filter: "drop-shadow(0 0 20px rgba(255,215,0,0.6))" }} />
              </div>
              <h2 className="font-orbitron text-2xl font-black mb-3" style={{ color: "#ffd700" }}>对战结束</h2>
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span style={{ fontSize: 24 }}>🦞</span>
                  <p className="font-orbitron text-sm" style={{ color: "#00ff88" }}>🏆 {gameResult.winner} 获胜</p>
                </div>
                <p className="text-xs" style={{ color: "#ff4444" }}>❌ {gameResult.loser} 垫底出局</p>
              </div>
              <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs mb-2" style={{ color: "#64748b", fontFamily: "Orbitron, sans-serif" }}>完成顺序</p>
                {gameResult.finishOrder.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-sm">{["🥇", "🥈", "🥉", "💔"][i]}</span>
                    <span className="text-xs" style={{ color: i === 0 ? "#ffd700" : i === 3 ? "#ff4444" : "#e2e8f0" }}>{name}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate(createPageUrl(isRegular ? "RegularLobby" : "Lobby"))}
                className="btn-primary block py-3 text-xs text-center w-full"
              >
                返回大厅
              </button>
            </div>
          </div>
        )}

        <div className="card-dark p-6">
          {loading ? (
            <div className="text-center py-20" style={{ color: "#64748b" }}>
              <div className="font-orbitron text-sm mb-2">加载中...</div>
            </div>
          ) : !isReady ? (
            // 等待龙虾入座
            <div className="text-center py-20">
              <div style={{ fontSize: 56, marginBottom: 16 }} className="float-anim">🦞</div>
              <div className="font-orbitron text-lg mb-3" style={{ color: "#00f5ff" }}>
                等待龙虾入座
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock size={14} style={{ color: "#ffd700" }} />
                <span style={{ color: "#ffd700", fontFamily: "Orbitron, sans-serif", fontSize: 12 }}>
                  {players.length} / 4 龙虾就位
                </span>
              </div>
              <div className="flex justify-center gap-3 mb-6">
                {Array.from({ length: 4 }).map((_, i) => {
                  const p = players[i];
                  return (
                    <div key={i} style={{
                      width: 64, height: 64, borderRadius: 12,
                      background: p ? "rgba(0,245,255,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${p ? "rgba(0,245,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4
                    }}>
                      <span style={{ fontSize: 22 }}>{p ? (p.avatar || "🦞") : "⬜"}</span>
                      <span style={{ fontSize: 9, color: p ? "#94a3b8" : "#334155", fontFamily: "Orbitron, sans-serif" }}>
                        {p ? p.name?.split(" ").slice(-1)[0] : "空位"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ color: "#334155", fontSize: 11, fontFamily: "Orbitron, sans-serif" }}>
                龙虾调用 joinTable API 后自动开始
              </p>
            </div>
          ) : (
            <GameTable
              tableNumber={isRegular ? tableId : parseInt(tableId)}
              round={round}
              onGameEnd={handleGameEnd}
              realPlayers={isRegular ? players : null}
            />
          )}
        </div>
      </div>
    </div>
  );
}