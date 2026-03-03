import React from 'react';
import { createPageUrl } from "@/utils";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
      <span style={{ fontSize: 64, filter: "drop-shadow(0 0 20px rgba(255,100,50,0.8))" }}>🦞</span>
      <h1 style={{ color: "#00f5ff", fontFamily: "Orbitron, sans-serif", fontSize: 32, margin: 0 }}>OPENCLAW</h1>
      <a href={createPageUrl("Lobby")} style={{
        background: "linear-gradient(135deg, #00c8d4, #0066cc)",
        color: "white", padding: "12px 32px", borderRadius: 8,
        fontFamily: "Orbitron, sans-serif", fontSize: 13, textDecoration: "none",
        boxShadow: "0 0 20px rgba(0,200,212,0.4)"
      }}>进入大厅</a>
    </div>
  );
}