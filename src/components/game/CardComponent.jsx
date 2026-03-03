import React from "react";

const SUIT_SYMBOLS = { "♠": "♠", "♥": "♥", "♦": "♦", "♣": "♣" };
const RED_SUITS = ["♥", "♦"];

export default function CardComponent({ card, selected, onClick, faceDown = false, small = false }) {
  if (faceDown) {
    return (
      <div className={`card-back playing-card ${small ? "w-8 h-12" : ""}`} style={small ? { width: 32, height: 48 } : {}}>
        <div className="w-full h-full flex items-center justify-center">
          <span style={{ fontSize: small ? "12px" : "20px", opacity: 0.5 }}>🦞</span>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const isRed = RED_SUITS.includes(card.suit);
  const isJoker = card.rank === "大王" || card.rank === "小王";

  const w = small ? 28 : 52;
  const h = small ? 42 : 78;
  const fSize = small ? 8 : 14;
  const suitSize = small ? 7 : 12;
  const centerSize = small ? 9 : 20;

  return (
    <div
      onClick={onClick}
      style={{
        width: w, height: h,
        borderRadius: 6,
        background: "#ffffff",
        border: `1.5px solid ${selected ? "#00f5ff" : isRed ? "#e88" : "#99a"}`,
        boxShadow: selected
          ? "0 0 14px rgba(0,245,255,0.9), 0 2px 6px rgba(0,0,0,0.5)"
          : "0 2px 6px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: small ? "2px 3px" : "4px 5px",
        cursor: onClick ? "pointer" : "default",
        transform: selected ? "translateY(-8px)" : undefined,
        transition: "all 0.15s ease",
        userSelect: "none",
        flexShrink: 0,
        color: isRed ? "#cc2222" : "#222244",
      }}
    >
      {isJoker ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <span style={{ fontSize: centerSize, color: card.rank === "大王" ? "#cc2222" : "#2244cc" }}>
            {card.rank === "大王" ? "🃏" : "🂿"}
          </span>
          <span style={{ fontSize: suitSize, fontWeight: 700, color: card.rank === "大王" ? "#cc2222" : "#2244cc" }}>
            {card.rank}
          </span>
        </div>
      ) : (
        <>
          <div style={{ lineHeight: 1, overflow: "hidden" }}>
            <div style={{ fontSize: fSize, fontWeight: 800, lineHeight: 1 }}>{card.rank}</div>
            <div style={{ fontSize: suitSize, lineHeight: 1 }}>{card.suit}</div>
          </div>
          <div style={{ textAlign: "center", fontSize: centerSize, flexShrink: 0 }}>{card.suit}</div>
          <div style={{ lineHeight: 1, transform: "rotate(180deg)", alignSelf: "flex-end", overflow: "hidden" }}>
            <div style={{ fontSize: fSize, fontWeight: 800, lineHeight: 1 }}>{card.rank}</div>
            <div style={{ fontSize: suitSize, lineHeight: 1 }}>{card.suit}</div>
          </div>
        </>
      )}
    </div>
  );
}