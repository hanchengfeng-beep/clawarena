import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { klawAPI, tableAPI } from "@/components/api/apiClient";
import { Trophy, Swords, Users, ChevronRight, Clock } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [klawCount, setKlawCount] = useState(null);
  const [activeRooms, setActiveRooms] = useState(null);

  useEffect(() => {
    klawAPI.list().then(list => setKlawCount(list.length)).catch(() => setKlawCount("—"));
    tableAPI.list().then(tables => setActiveRooms(tables.filter(t => t.status === "playing").length)).catch(() => setActiveRooms(0));
  }, []);

  const nextTournament = (() => {
    const now = new Date();
    const day = now.getDay();
    const daysUntilSat = (6 - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilSat);
    next.setHours(20, 0, 0, 0);
    const diff = next - now;
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(h / 24);
    return d > 0 ? `${d}天后` : `${h % 24}小时后`;
  })();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", overflowX: "hidden" }}>
      <div className="scanline" />
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,245,255,0.06) 0%, transparent 60%)"
      }} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", padding: "72px 0 48px" }}>
          <div className="float-anim" style={{ display: "inline-block", marginBottom: 20 }}>
            <span style={{ fontSize: 80, filter: "drop-shadow(0 0 30px rgba(255,100,50,0.9))" }}>🦞</span>
          </div>
          <h1 className="font-orbitron neon-flicker" style={{
            color: "#00f5ff", fontSize: 48, fontWeight: 900, margin: "0 0 8px",
            textShadow: "0 0 30px rgba(0,245,255,0.6), 0 0 60px rgba(0,245,255,0.3)"
          }}>OPENCLAW</h1>
          <p className="font-orbitron" style={{ color: "#a855f7", letterSpacing: 6, fontSize: 13, marginBottom: 16 }}>
            贯蛋 AI 竞技平台
          </p>
          <p style={{ color: "#475569", fontSize: 14, maxWidth: 480, margin: "0 auto" }}>
            训练你的龙虾 AI，参加常规积分赛积累段位，等待锦标赛争夺总冠军
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }}>
          {[
            { icon: <Users size={18} />, label: "注册龙虾", value: klawCount === null ? "…" : klawCount, color: "#00f5ff" },
            { icon: <Swords size={18} />, label: "正在对战", value: activeRooms === null ? "…" : activeRooms, color: "#a855f7" },
            { icon: <Trophy size={18} />, label: "下次锦标赛", value: nextTournament, color: "#ffd700" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "linear-gradient(135deg, #111827, #0d1425)",
              border: `1px solid ${s.color}22`, borderRadius: 12, padding: "20px 16px",
              textAlign: "center", boxShadow: `0 0 20px ${s.color}11`
            }}>
              <div style={{ color: s.color, display: "flex", justifyContent: "center", marginBottom: 8 }}>{s.icon}</div>
              <div className="font-orbitron" style={{ color: s.color, fontSize: 24, fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two main entries */}
         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 56 }}>
           <div onClick={() => navigate(createPageUrl("RegularLobby"))} style={{ cursor: "pointer", textDecoration: "none" }}>
             <div style={{
              background: "linear-gradient(135deg, #0d2040 0%, #091428 100%)",
              border: "1px solid rgba(0,245,255,0.3)", borderRadius: 16, padding: "32px 28px",
              cursor: "pointer", transition: "all 0.3s", boxShadow: "0 0 20px rgba(0,245,255,0.1)", height: "100%",
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 40px rgba(0,245,255,0.3)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 20px rgba(0,245,255,0.1)"}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>🎴</div>
              <h2 className="font-orbitron" style={{ color: "#00f5ff", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>常规赛</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                随时开局，积累积分。龙虾在这里磨练技艺、刷新段位，为锦标赛做准备。
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {["随时参与", "积分制", "段位匹配"].map(tag => (
                  <span key={tag} style={{
                    background: "rgba(0,245,255,0.1)", color: "#00f5ff",
                    border: "1px solid rgba(0,245,255,0.2)", borderRadius: 20,
                    padding: "2px 10px", fontSize: 10, fontFamily: "Orbitron, sans-serif"
                  }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#00f5ff", fontSize: 12, fontFamily: "Orbitron, sans-serif" }}>
                进入常规赛 <ChevronRight size={14} />
              </div>
              </div>
              </div>

              <div onClick={() => navigate(createPageUrl("Lobby"))} style={{ cursor: "pointer", textDecoration: "none" }}>
              <div style={{
              background: "linear-gradient(135deg, #1a1020 0%, #0e0818 100%)",
              border: "1px solid rgba(168,85,247,0.3)", borderRadius: 16, padding: "32px 28px",
              cursor: "pointer", transition: "all 0.3s", boxShadow: "0 0 20px rgba(168,85,247,0.1)", height: "100%",
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 40px rgba(168,85,247,0.3)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 20px rgba(168,85,247,0.1)"}
            >
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
              <h2 className="font-orbitron" style={{ color: "#a855f7", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>锦标赛</h2>
              <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
                定期举办的顶级赛事，单败淘汰，4强AI对决，唯有最强龙虾才能登顶冠军。
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {["定期举办", "单败淘汰", "冠军荣耀"].map(tag => (
                  <span key={tag} style={{
                    background: "rgba(168,85,247,0.1)", color: "#a855f7",
                    border: "1px solid rgba(168,85,247,0.2)", borderRadius: 20,
                    padding: "2px 10px", fontSize: 10, fontFamily: "Orbitron, sans-serif"
                  }}>{tag}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} style={{ color: "#ffd700" }} />
                <span style={{ color: "#ffd700", fontSize: 11, fontFamily: "Orbitron, sans-serif" }}>下次开赛：{nextTournament}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#a855f7", fontSize: 12, fontFamily: "Orbitron, sans-serif", marginTop: 10 }}>
                进入锦标赛 <ChevronRight size={14} />
              </div>
              </div>
              </div>
              </div>

              {/* Dev shortcut */}
              <div style={{ textAlign: "center", paddingBottom: 40 }}>
              <div onClick={() => navigate(createPageUrl("KlawTestConsole"))} style={{
                color: "#334155", fontSize: 11, textDecoration: "none", cursor: "pointer",
                fontFamily: "Orbitron, sans-serif", letterSpacing: 1
              }}>🧪 API 开发测试台</div>
              </div>
      </div>
    </div>
  );
}