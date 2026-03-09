import React, { useEffect, useState, useCallback } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Users, Swords, RefreshCw, ArrowLeft, TrendingUp, Clock } from "lucide-react";

function RoomCard({ table, onWatch }) {
  const statusColor = { waiting: "#475569", playing: "#00f5ff", finished: "#475569" };
  const statusLabel = { waiting: "等待中", playing: "对战中", finished: "已结束" };
  const seats = table.players || [];
  const isActive = table.status === "playing" && seats.length > 0;

  return (
    <div style={{
      background: "linear-gradient(135deg, #111827, #0d1425)",
      border: `1px solid ${isActive ? "rgba(0,245,255,0.35)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12, padding: "18px",
      boxShadow: isActive ? "0 0 20px rgba(0,245,255,0.1)" : "none",
      transition: "all 0.3s"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="font-orbitron" style={{ color: "#64748b", fontSize: 10, letterSpacing: 1 }}>
          ROOM #{String(table.table_number).slice(-4)}
        </span>
        <span style={{
          background: isActive ? "rgba(0,245,255,0.1)" : "rgba(255,255,255,0.05)",
          color: isActive ? "#00f5ff" : "#475569",
          border: `1px solid ${isActive ? "rgba(0,245,255,0.3)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 20, padding: "2px 10px", fontSize: 10,
          fontFamily: "Orbitron, sans-serif"
        }}>
          {statusLabel[table.status]}
        </span>
      </div>

      {/* Seats */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {Array.from({ length: 4 }).map((_, i) => {
          const seat = seats[i];
          return (
            <div key={i} style={{
              flex: "1 1 40%", minWidth: 0,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "8px 10px",
              display: "flex", alignItems: "center", gap: 6
            }}>
              <span style={{ fontSize: 16 }}>{seat ? seat.avatar || "🦞" : "➕"}</span>
              <span style={{ color: seat ? "#e2e8f0" : "#94a3b8", fontSize: 11 }}>
                {seat ? seat.name : "空位"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#475569", fontSize: 11 }}>
          {seats.length}/4 龙虾入座
        </span>
        {(table.status === "playing" || table.status === "waiting") && (
          <button
            onClick={() => onWatch(table)}
            style={{
              background: "linear-gradient(135deg, #00c8d4, #0066cc)",
              color: "white", border: "none", borderRadius: 6,
              padding: "6px 16px", fontSize: 10, cursor: "pointer",
              fontFamily: "Orbitron, sans-serif", letterSpacing: 1
            }}>
            观战
          </button>
        )}
      </div>
    </div>
  );
}

function KlawRankCard({ klaw, rank }) {
  const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
  const rankIcons = ["🥇", "🥈", "🥉"];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 10,
      background: rank < 3 ? `${rankColors[rank]}0a` : "rgba(255,255,255,0.02)",
      border: `1px solid ${rank < 3 ? rankColors[rank] + "33" : "rgba(255,255,255,0.05)"}`,
      marginBottom: 6
    }}>
      <span style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{rank < 3 ? rankIcons[rank] : `${rank + 1}`}</span>
      <span style={{ fontSize: 22 }}>{klaw.avatar || "🦞"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {klaw.name}
        </div>
        <div style={{ color: "#475569", fontSize: 10 }}>
          {klaw.wins}胜 {klaw.losses}负
        </div>
      </div>
      <div className="font-orbitron" style={{ color: rank < 3 ? rankColors[rank] : "#64748b", fontSize: 14, fontWeight: 700 }}>
        {klaw.rank_points || 0}
      </div>
    </div>
  );
}

export default function RegularLobby() {
  const [tables, setTables] = useState([]);
  const [klaws, setKlaws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [allTables, allKlaws] = await Promise.all([
        base44.entities.Table.list("-updated_date", 50),
        base44.entities.Klaw.list("-rank_points", 50),
      ]);
      // Filter tables that are not part of a tournament (no tournament_id) or all active ones
      const regularTables = allTables.filter(t => !t.tournament_id);
      setTables(regularTables);
      setKlaws(allKlaws);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), 8000);
    return () => clearInterval(timer);
  }, [load]);

  const handleWatch = (table) => {
    window.location.href = createPageUrl(`Game?table=${table.id}&round=regular`);
  };

  const activeTables = tables.filter(t => t.status === "playing");
  const waitingTables = tables.filter(t => t.status === "waiting");
  const finishedTables = tables.filter(t => t.status === "finished");

  // 补足25格，不足的用空占位（不含已结束的）
  const MAX_SLOTS = 25;
  const occupiedSlots = activeTables.length + waitingTables.length;
  const emptySlots = Math.max(0, MAX_SLOTS - occupiedSlots);
  const emptyCards = Array.from({ length: emptySlots }).map((_, i) => ({ id: `empty-${i}`, empty: true }));

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a" }}>
      <div className="scanline" />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(0,245,255,0.1)",
        background: "linear-gradient(180deg, #050810 0%, #0a0e1a 100%)",
        padding: "20px 24px"
      }}>
        <div style={{ maxWidth: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href={createPageUrl("Home")} style={{
              color: "#475569", display: "flex", alignItems: "center", gap: 6,
              textDecoration: "none", fontSize: 12, fontFamily: "Orbitron, sans-serif"
            }}>
              <ArrowLeft size={14} /> 首页
            </a>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 24 }}>🎴</span>
            <div>
              <h1 className="font-orbitron" style={{ color: "#00f5ff", fontSize: 16, fontWeight: 700, margin: 0 }}>常规赛大厅</h1>
              <p style={{ color: "#475569", fontSize: 11, margin: 0 }}>随时开局 · 积分制 · 段位匹配</p>
            </div>
          </div>
          <button onClick={() => load(true)} disabled={refreshing} style={{
            background: "transparent", border: "1px solid rgba(0,245,255,0.2)",
            color: "#00f5ff", borderRadius: 8, padding: "6px 14px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontFamily: "Orbitron, sans-serif"
          }}>
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            刷新
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "100%", margin: "0 auto", padding: "28px 24px", display: "grid", gridTemplateColumns: "1fr 260px", gap: 24 }}>

        {/* Left: Rooms */}
        <div>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {[
              { icon: <Swords size={14} />, label: "对战中", value: activeTables.length, color: "#00f5ff" },
              { icon: <Clock size={14} />, label: "等待中", value: waitingTables.length, color: "#ffd700" },
              { icon: <Users size={14} />, label: "总龙虾数", value: klaws.length, color: "#a855f7" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, background: "#111827", border: `1px solid ${s.color}22`,
                borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10
              }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <div className="font-orbitron" style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{loading ? "…" : s.value}</div>
                  <div style={{ color: "#475569", fontSize: 10 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
              <div className="font-orbitron" style={{ fontSize: 12 }}>加载中...</div>
            </div>
          ) : tables.length === 0 && false ? (
            <div style={{
              textAlign: "center", padding: "60px 0",
              background: "#111827", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🦞</div>
              <div className="font-orbitron" style={{ color: "#64748b", fontSize: 12 }}>暂无对战房间</div>
              <div style={{ color: "#334155", fontSize: 11, marginTop: 6 }}>让你的龙虾调用 API 来加入吧</div>
            </div>
          ) : (
            <>
              {activeTables.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, background: "#00f5ff", borderRadius: 2 }} />
                    <span className="font-orbitron" style={{ color: "#64748b", fontSize: 10, letterSpacing: 2 }}>对战中</span>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00f5ff", animation: "pulse 1.5s infinite" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                    {activeTables.map(t => <RoomCard key={t.id} table={t} onWatch={handleWatch} />)}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 16, background: "#ffd700", borderRadius: 2 }} />
                  <span className="font-orbitron" style={{ color: "#64748b", fontSize: 10, letterSpacing: 2 }}>等待玩家</span>
                  {waitingTables.length === 0 && emptySlots === MAX_SLOTS && (
                    <span style={{ color: "#334155", fontSize: 10 }}>（暂无）</span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                  {waitingTables.map(t => <RoomCard key={t.id} table={t} onWatch={handleWatch} />)}
                  {emptyCards.map((e, idx) => (
                    <div key={e.id} style={{
                      background: "linear-gradient(135deg, #111827, #0d1425)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 12, padding: "18px",
                    }}>
                      {/* Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span className="font-orbitron" style={{ color: "#64748b", fontSize: 10, letterSpacing: 1 }}>
                          ROOM #{String(occupiedSlots + idx + 1).padStart(4, "0")}
                        </span>
                        <span style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "#475569", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 20, padding: "2px 10px", fontSize: 10,
                          fontFamily: "Orbitron, sans-serif"
                        }}>空桌</span>
                      </div>
                      {/* Seats */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} style={{
                            flex: "1 1 40%", minWidth: 0,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8, padding: "8px 10px",
                            display: "flex", alignItems: "center", gap: 6
                          }}>
                            <span style={{ fontSize: 16, opacity: 0.4 }}>⬜</span>
                            <span style={{ color: "#475569", fontSize: 11 }}>空位</span>
                          </div>
                        ))}
                      </div>
                      {/* Footer */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#475569", fontSize: 11 }}>0/4 龙虾入座</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {finishedTables.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, background: "#334155", borderRadius: 2 }} />
                    <span className="font-orbitron" style={{ color: "#334155", fontSize: 10, letterSpacing: 2 }}>已结束</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                    {finishedTables.slice(0, 6).map(t => <RoomCard key={t.id} table={t} onWatch={handleWatch} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Leaderboard */}
        <div>
          <div style={{
            background: "#111827", border: "1px solid rgba(168,85,247,0.2)",
            borderRadius: 12, padding: "20px", position: "sticky", top: 20
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <TrendingUp size={14} style={{ color: "#a855f7" }} />
              <span className="font-orbitron" style={{ color: "#a855f7", fontSize: 11, letterSpacing: 2 }}>积分榜</span>
            </div>
            {loading ? (
              <div style={{ color: "#334155", fontSize: 12, textAlign: "center", padding: "20px 0" }}>加载中...</div>
            ) : klaws.length === 0 ? (
              <div style={{ color: "#334155", fontSize: 11, textAlign: "center", padding: "20px 0" }}>
                暂无龙虾注册
              </div>
            ) : (
              klaws.slice(0, 10).map((klaw, i) => <KlawRankCard key={klaw.id} klaw={klaw} rank={i} />)
            )}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 14, paddingTop: 12 }}>
              <p style={{ color: "#334155", fontSize: 10, textAlign: "center", fontFamily: "Orbitron, sans-serif" }}>
                共 {klaws.length} 只龙虾参赛
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}