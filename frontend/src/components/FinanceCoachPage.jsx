import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "");
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Bypass-Tunnel-Reminder": "true",
});

export default function FinanceCoachPage({ lang = "en" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCoachData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/insights/coach`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCoachData(); }, [loadCoachData]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "0 0 32px" }}>
      
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(139,92,246,0.12) 100%)",
        border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: "20px",
        padding: "28px 32px",
      }}>
        <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>
          🤖 AI Financial Coach
        </h2>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "14px", margin: 0 }}>
          Personalized advice and actionable insights based on your recent spending habits.
        </p>
      </div>

      {/* Advice List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {data?.advice?.map((item, i) => {
          
          let bgColor, borderColor, iconColor;
          switch (item.type) {
            case "danger":
              bgColor = "rgba(239,68,68,0.1)"; borderColor = "rgba(239,68,68,0.3)"; iconColor = "#ef4444";
              break;
            case "warning":
            case "alert":
              bgColor = "rgba(245,158,11,0.1)"; borderColor = "rgba(245,158,11,0.3)"; iconColor = "#f59e0b";
              break;
            case "success":
              bgColor = "rgba(16,185,129,0.1)"; borderColor = "rgba(16,185,129,0.3)"; iconColor = "#10b981";
              break;
            case "insight":
            case "tip":
            default:
              bgColor = "rgba(59,130,246,0.1)"; borderColor = "rgba(59,130,246,0.3)"; iconColor = "#3b82f6";
              break;
          }

          return (
            <div key={i} style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: "16px",
              padding: "20px 24px",
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
              animation: `fadeInUp ${0.3 + i*0.1}s ease`,
            }}>
              <div style={{
                fontSize: "28px",
                background: "rgba(255,255,255,0.05)",
                width: "48px", height: "48px",
                borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 4px 12px ${iconColor}20`
              }}>
                {item.icon}
              </div>
              <div>
                <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, marginBottom: "6px" }}>
                  {item.title}
                </h3>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", lineHeight: "1.5", margin: 0 }}>
                  {item.message}
                </p>
                {item.action && (
                  <button style={{
                    marginTop: "12px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  >
                    {item.action}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
