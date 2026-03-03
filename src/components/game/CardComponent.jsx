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

  return (
    <div
      className={`playing-card ${isRed ? "card-red" : "card-black"} ${selected ? "card-selected" : ""}`}
      style={small ? { width: 32, height: 48, padding: "2px 3px" } : {}}
      onClick={onClick}
    >
      {isJoker ? (
        <div className="w-full h-full flex items-center justify-center flex-col">
          <span style={{ fontSize: small ? "8px" : "14px", color: card.rank === "大王" ? "#ff4444" : "#00f5ff" }}>
            {card.rank === "大王" ? "🃏" : "🂿"}
          </span>
          <span style={{ fontSize: small ? "6px" : "10px", color: card.rank === "大王" ? "#ff4444" : "#00f5ff" }}>
            {card.rank}
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-col leading-none">
            <span style={{ fontSize: small ? "8px" : "13px", lineHeight: 1 }}>{card.rank}</span>
            <span style={{ fontSize: small ? "7px" : "11px", lineHeight: 1 }}>{card.suit}</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span style={{ fontSize: small ? "10px" : "18px" }}>{card.suit}</span>
          </div>
          <div className="flex flex-col leading-none rotate-180">
            <span style={{ fontSize: small ? "8px" : "13px", lineHeight: 1 }}>{card.rank}</span>
            <span style={{ fontSize: small ? "7px" : "11px", lineHeight: 1 }}>{card.suit}</span>
          </div>
        </>
      )}
    </div>
  );
}