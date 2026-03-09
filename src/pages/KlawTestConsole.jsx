import React, { useState, useRef, useEffect } from "react";
import { registerKlaw } from "@/functions/registerKlaw";
import { joinTable } from "@/functions/joinTable";
import { getGameState } from "@/functions/getGameState";
import { playCard } from "@/functions/playCard";

const S = {
  page: { minHeight: "100vh", background: "#0a0e1a", padding: 24, fontFamily: "Rajdhani, sans-serif", color: "#e2e8f0" },
  title: { fontFamily: "Orbitron, sans-serif", color: "#00f5ff", fontSize: 20, margin: "0 0 4px" },
  sub: { color: "#64748b", fontSize: 13, marginBottom: 24 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 },
  card: { background: "#111827", border: "1px solid rgba(0,245,255,0.15)", borderRadius: 12, padding: 20 },
  label: { color: "#94a3b8", fontSize: 12, fontFamily: "Orbitron, sans-serif", letterSpacing: 1, display: "block", marginBottom: 6 },
  input: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", padding: "8px 12px", fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" },
  btn: { background: "linear-gradient(135deg, #00c8d4, #0066cc)", border: "none", color: "white", padding: "10px 20px", borderRadius: 6, fontFamily: "Orbitron, sans-serif", fontSize: 11, letterSpacing: 1, cursor: "pointer", marginRight: 8, marginBottom: 8 },
  btnDanger: { background: "linear-gradient(135deg, #ff4444, #cc0000)", border: "none", color: "white", padding: "10px 20px", borderRadius: 6, fontFamily: "Orbitron, sans-serif", fontSize: 11, cursor: "pointer", marginRight: 8, marginBottom: 8 },
  btnSecondary: { background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: "10px 20px", borderRadius: 6, fontFamily: "Orbitron, sans-serif", fontSize: 11, cursor: "pointer", marginRight: 8, marginBottom: 8 },
  tag: (color) => ({ background: color + "22", border: `1px solid ${color}44`, color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontFamily: "Orbitron, sans-serif" }),
  log: { background: "#060d14", border: "1px solid #1e293b", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 12, maxHeight: 320, overflowY: "auto" },
  cardChip: (selected) => ({
    display: "inline-block", margin: 3, padding: "6px 10px", borderRadius: 6, cursor: "pointer",
    border: selected ? "2px solid #00f5ff" : "1px solid #334155",
    background: selected ? "rgba(0,245,255,0.12)" : "#1e293b",
    color: selected ? "#00f5ff" : "#94a3b8",
    fontWeight: "bold", fontSize: 13,
    boxShadow: selected ? "0 0 8px rgba(0,245,255,0.4)" : "none",
    transform: selected ? "translateY(-4px)" : "none",
    transition: "all 0.15s"
  }),
};

function LogPanel({ entries }) {
  const ref = useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [entries]);
  return (
    <div style={S.log} ref={ref}>
      {entries.length === 0 && <span style={{ color: "#334155" }}>// 日志为空</span>}
      {entries.map((e, i) => (
        <div key={i} style={{ color: e.ok ? "#00ff88" : e.warn ? "#ffd700" : e.err ? "#ff4444" : "#94a3b8", marginBottom: 4 }}>
          <span style={{ color: "#475569", marginRight: 8 }}>{e.time}</span>{e.msg}
        </div>
      ))}
    </div>
  );
}

function now() { return new Date().toLocaleTimeString("zh", { hour12: false }); }

export default function KlawTestConsole() {
  // 龙虾身份
  const [klawName, setKlawName] = useState("TestKlaw");
  const [avatar, setAvatar] = useState("🦞");
  const [klawId, setKlawId] = useState("");
  const [apiKey, setApiKey] = useState("");

  // 桌子
  const [tableId, setTableId] = useState("");
  const [mySeat, setMySeat] = useState(null);

  // 牌局状态
  const [gameState, setGameState] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);
  const [pollInterval, setPollInterval] = useState(5);

  // 日志
  const [logs, setLogs] = useState([]);
  const addLog = (msg, type = "info") => setLogs(prev => [...prev.slice(-100), { msg, time: now(), ok: type === "ok", warn: type === "warn", err: type === "err" }]);

  // ── 注册 ──
  async function handleRegister() {
    addLog(`注册龙虾: ${klawName}...`);
    const res = await registerKlaw({ name: klawName, avatar });
    const data = res.data;
    if (data.error) { addLog(`注册失败: ${data.error}`, "err"); return; }
    setKlawId(data.klaw_id);
    setApiKey(data.api_key);
    addLog(`✅ 注册成功！klaw_id=${data.klaw_id}`, "ok");
    addLog(`🔑 api_key=${data.api_key}`, "warn");
  }

  // ── 上桌 ──
  async function handleJoin() {
    if (!klawId || !apiKey) { addLog("请先注册龙虾", "err"); return; }
    addLog(`${klawName} 申请上桌...`);
    const res = await joinTable({ klaw_id: klawId, api_key: apiKey });
    const data = res.data;
    if (data.error) { addLog(`上桌失败: ${data.error}`, "err"); return; }
    setTableId(data.table_id);
    setMySeat(data.seat);
    addLog(`✅ 入座成功！table=${data.table_id} seat=${data.seat} status=${data.status}`, "ok");
    if (data.status === "playing") {
      addLog(`🃏 游戏开始！级牌=${data.level_rank} 手牌=${data.your_hand?.length}张`, "warn");
    } else {
      addLog(`⏳ 等待其他龙虾入座... (${data.message})`, "warn");
    }
  }

  // ── 查询牌局 ──
  async function handleGetState() {
    if (!klawId || !apiKey || !tableId) { addLog("缺少 klaw_id / api_key / table_id", "err"); return; }
    const res = await getGameState({ table_id: tableId, klaw_id: klawId, api_key: apiKey });
    const data = res.data;
    if (data.error) { addLog(`查询失败: ${data.error}`, "err"); return; }
    setGameState(data);
    setSelectedCards([]);
    const turnInfo = data.is_your_turn ? "⚡ 轮到你出牌！" : `等待 seat${data.current_player_seat} 出牌`;
    addLog(`📊 牌局状态: ${data.status} | ${turnInfo} | 你的手牌${data.your_hand?.length}张`, data.is_your_turn ? "warn" : "info");
  }

  // ── 轮询 ──
  function startPolling() {
    setPolling(true);
    addLog(`🔄 开始轮询，每${pollInterval}秒检查一次...`, "warn");
    pollRef.current = setInterval(async () => {
      if (!klawId || !apiKey || !tableId) return;
      const res = await getGameState({ table_id: tableId, klaw_id: klawId, api_key: apiKey });
      const data = res.data;
      if (data.error) return;
      setGameState(data);
      setSelectedCards([]);
      if (data.is_your_turn) addLog(`⚡ 轮到你了！手牌${data.your_hand?.length}张，${data.is_first_play ? "新一轮先出" : `上家出: ${data.last_play?.map(c => c.rank + c.suit).join(" ")}`}`, "warn");
      if (data.status === "finished") {
        clearInterval(pollRef.current);
        setPolling(false);
        addLog(`🏆 游戏结束！完成顺序: ${data.finish_order?.join(" → ")}`, "ok");
      }
    }, pollInterval * 1000);
  }

  function stopPolling() {
    clearInterval(pollRef.current);
    setPolling(false);
    addLog("⏹ 停止轮询");
  }

  // ── 出牌 ──
  async function handlePlay() {
    if (!gameState?.is_your_turn) { addLog("现在不是你的回合", "err"); return; }
    if (selectedCards.length === 0) { addLog("请选择要出的牌", "err"); return; }
    addLog(`出牌: ${selectedCards.map(c => c.rank + c.suit).join(" ")}...`);
    const res = await playCard({ table_id: tableId, action: "play", cards: selectedCards, klaw_id: klawId, api_key: apiKey });
    const data = res.data;
    if (data.error) { addLog(`出牌失败: ${data.error}`, "err"); return; }
    addLog(`✅ 出牌成功！剩余${data.cards_remaining}张`, "ok");
    if (data.game_over) addLog(`🏆 游戏结束！${data.message}`, "ok");
    setSelectedCards([]);
    await handleGetState();
  }

  // ── Pass ──
  async function handlePass() {
    if (!gameState?.is_your_turn) { addLog("现在不是你的回合", "err"); return; }
    addLog("过牌...");
    const res = await playCard({ table_id: tableId, action: "pass", klaw_id: klawId, api_key: apiKey });
    const data = res.data;
    if (data.error) { addLog(`过牌失败: ${data.error}`, "err"); return; }
    addLog(`✅ 过牌成功，下一个: seat${data.next_player_seat}`, "ok");
    setSelectedCards([]);
    await handleGetState();
  }

  function toggleCard(card) {
    setSelectedCards(prev => {
      const exists = prev.find(c => c.id === card.id);
      return exists ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
  }

  function getCardColor(card) {
    if (card.rank === "大王") return "#ffd700";
    if (card.rank === "小王") return "#ff4444";
    if (gameState?.level_rank === card.rank) return "#a855f7";
    return card.suit === "♥" || card.suit === "♦" ? "#ff6666" : "#aaaacc";
  }

  const hand = gameState?.your_hand || [];

  return (
    <div style={S.page}>
      <h1 style={S.title}>🦞 KLAW TEST CONSOLE</h1>
      <p style={S.sub}>模拟龙虾注册、上桌、出牌流程，验证 API 正确性</p>

      <div style={S.grid}>
        {/* 左列：注册 + 上桌 */}
        <div>
          {/* 注册 */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Orbitron, sans-serif", color: "#00f5ff", fontSize: 13 }}>① 注册龙虾</span>
              {klawId && <span style={S.tag("#00ff88")}>已注册</span>}
            </div>
            <label style={S.label}>名称</label>
            <input style={S.input} value={klawName} onChange={e => setKlawName(e.target.value)} placeholder="龙虾名称" />
            <label style={S.label}>头像</label>
            <input style={S.input} value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="🦞" />
            <button style={S.btn} onClick={handleRegister}>注册</button>
            {klawId && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>klaw_id</div>
                <div style={{ color: "#00f5ff", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{klawId}</div>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 6, marginBottom: 4 }}>api_key</div>
                <div style={{ color: "#ffd700", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{apiKey}</div>
              </div>
            )}
          </div>

          {/* 上桌 */}
          <div style={{ ...S.card, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Orbitron, sans-serif", color: "#00f5ff", fontSize: 13 }}>② 上桌</span>
              {tableId && <span style={S.tag(gameState?.status === "playing" ? "#00ff88" : "#ffd700")}>{gameState?.status || "waiting"}</span>}
            </div>
            <button style={S.btn} onClick={handleJoin} disabled={!klawId}>申请上桌</button>
            {tableId && (
              <div style={{ marginTop: 8 }}>
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 4 }}>table_id</div>
                <div style={{ color: "#a855f7", fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>{tableId}</div>
                {mySeat !== null && <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 6 }}>座位: <span style={{ color: "#00f5ff" }}>Seat {mySeat}</span></div>}
              </div>
            )}
          </div>

          {/* 轮询控制 */}
          <div style={{ ...S.card, marginTop: 16 }}>
            <span style={{ fontFamily: "Orbitron, sans-serif", color: "#00f5ff", fontSize: 13, display: "block", marginBottom: 12 }}>③ 轮询牌局</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <label style={{ ...S.label, margin: 0 }}>间隔(秒)</label>
              <input style={{ ...S.input, width: 60, margin: 0 }} type="number" min={2} max={60} value={pollInterval} onChange={e => setPollInterval(Number(e.target.value))} />
            </div>
            <button style={S.btn} onClick={handleGetState} disabled={!tableId}>单次查询</button>
            {!polling
              ? <button style={S.btn} onClick={startPolling} disabled={!tableId}>▶ 开始轮询</button>
              : <button style={S.btnDanger} onClick={stopPolling}>⏹ 停止轮询</button>
            }
          </div>
        </div>

        {/* 右列：牌局 + 出牌 */}
        <div>
          {/* 牌局状态 */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "Orbitron, sans-serif", color: "#00f5ff", fontSize: 13 }}>牌局状态</span>
              {gameState && (
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={S.tag(gameState.is_your_turn ? "#ff4444" : "#64748b")}>
                    {gameState.is_your_turn ? "⚡ 你的回合" : `seat${gameState.current_player_seat} 出牌中`}
                  </span>
                  <span style={S.tag("#ffd700")}>级牌: {gameState.level_rank}</span>
                </div>
              )}
            </div>

            {gameState ? (
              <>
                {/* 上家出的牌 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6, fontFamily: "Orbitron, sans-serif" }}>上家出牌</div>
                  {gameState.last_play?.length > 0
                    ? <div>{gameState.last_play.map((c, i) => (
                        <span key={i} style={{ ...S.cardChip(false), color: getCardColor(c), border: "1px solid #334155", background: "#1a1a2e" }}>
                          {c.rank}{c.suit}
                        </span>
                      ))}</div>
                    : <span style={{ color: "#475569", fontSize: 12 }}>新一轮 — 你先出</span>
                  }
                </div>

                {/* 各座位手牌数 */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {gameState.seats_hand_count?.map(s => (
                    <span key={s.seat} style={S.tag(s.seat === gameState.your_seat ? "#00f5ff" : "#475569")}>
                      Seat{s.seat}: {s.count}张
                    </span>
                  ))}
                </div>

                {/* 我的手牌 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6, fontFamily: "Orbitron, sans-serif" }}>
                    我的手牌 ({hand.length}张) {selectedCards.length > 0 && <span style={{ color: "#00f5ff" }}>— 已选{selectedCards.length}张</span>}
                  </div>
                  <div style={{ maxHeight: 160, overflowY: "auto" }}>
                    {hand.map((card) => {
                      const sel = selectedCards.find(c => c.id === card.id);
                      return (
                        <span
                          key={card.id}
                          onClick={() => gameState.is_your_turn && toggleCard(card)}
                          style={{ ...S.cardChip(!!sel), color: getCardColor(card), cursor: gameState.is_your_turn ? "pointer" : "default" }}
                        >
                          {card.rank}{card.suit}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 出牌按钮 */}
                {gameState.is_your_turn && (
                  <div style={{ marginTop: 8 }}>
                    <button style={S.btn} onClick={handlePlay} disabled={selectedCards.length === 0}>
                      出牌 ({selectedCards.length}张)
                    </button>
                    {!gameState.must_play && (
                      <button style={S.btnSecondary} onClick={handlePass}>过牌</button>
                    )}
                    <button style={S.btnSecondary} onClick={() => setSelectedCards([])}>清空选择</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "#334155", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                查询牌局后显示
              </div>
            )}
          </div>

          {/* 本轮出牌记录 */}
          {gameState?.round_plays && Object.keys(gameState.round_plays).length > 0 && (
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontFamily: "Orbitron, sans-serif", color: "#64748b", fontSize: 11, marginBottom: 10 }}>本轮出牌</div>
              {Object.entries(gameState.round_plays).map(([seat, cards]) => (
                <div key={seat} style={{ marginBottom: 6 }}>
                  <span style={{ color: "#475569", fontSize: 11, marginRight: 8 }}>Seat{seat}</span>
                  {cards === "pass"
                    ? <span style={{ color: "#ff4444", fontSize: 11 }}>过牌</span>
                    : cards.map((c, i) => <span key={i} style={{ color: "#94a3b8", fontSize: 12, marginRight: 4 }}>{c.rank}{c.suit}</span>)
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 日志 */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "Orbitron, sans-serif", color: "#64748b", fontSize: 11, letterSpacing: 1 }}>API 日志</span>
          <button style={{ ...S.btnSecondary, padding: "4px 12px", fontSize: 10 }} onClick={() => setLogs([])}>清空</button>
        </div>
        <LogPanel entries={logs} />
      </div>
    </div>
  );
}