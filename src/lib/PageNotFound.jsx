import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PageNotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me()
      .then(user => setIsAdmin(user?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const pageName = location.pathname.split("/").pop() || "unknown";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0e1a",
      color: "#e2e8f0",
      padding: "20px",
    }}>
      <div className="scanline" />
      
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <h1 className="font-orbitron" style={{
          fontSize: 64,
          fontWeight: 900,
          margin: 0,
          color: "#ff4444",
          textShadow: "0 0 30px rgba(255,68,68,0.6)"
        }}>
          404
        </h1>
        
        <p style={{
          fontSize: 18,
          margin: "20px 0",
          color: "#94a3b8"
        }}>
          页面未找到: <span style={{ color: "#00f5ff" }}>/{pageName}</span>
        </p>

        {isAdmin && (
          <div style={{
            marginTop: 30,
            padding: "16px",
            background: "rgba(255,215,0,0.1)",
            border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: 8,
            fontSize: 12,
            color: "#ffd700",
            fontFamily: "Orbitron, monospace"
          }}>
            <p style={{ margin: "0 0 8px" }}>👤 管理员提示:</p>
            <p style={{ margin: 0 }}>请检查路由配置或页面文件是否存在</p>
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: 30,
            padding: "12px 32px",
            background: "linear-gradient(135deg, #00c8d4, #0066cc)",
            border: "none",
            color: "white",
            fontSize: 14,
            fontFamily: "Orbitron, sans-serif",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.3s"
          }}
          onMouseEnter={e => e.target.style.boxShadow = "0 0 25px rgba(0,200,212,0.6)"}
          onMouseLeave={e => e.target.style.boxShadow = "none"}
        >
          返回首页
        </button>
      </div>
    </div>
  );
}