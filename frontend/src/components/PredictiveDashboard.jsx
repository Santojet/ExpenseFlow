import { useCallback, useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "");
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Bypass-Tunnel-Reminder": "true",
});

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(15,10,30,0.95)", border: "1px solid rgba(124,58,237,0.4)",
        borderRadius: "10px", padding: "10px 14px",
      }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{label}</div>
        <div style={{ color: payload[0].color, fontWeight: 700, fontSize: "15px" }}>
          ৳{Number(payload[0].value).toLocaleString("en-BD")}
        </div>
      </div>
    );
  }
  return null;
}

export default function PredictiveDashboard({ lang = "en" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/insights/predict`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const formatMonth = (key) => {
    if (!key) return "";
    const [y, m] = key.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m)-1]} '${y.slice(2)}`;
  };

  const CATEGORY_COLORS = [
    "#7c3aed","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#3b82f6","#64748b"
  ];

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
      <div className="spinner" />
    </div>
  );

  if (!data || !data.prediction) return (
    <div style={{
      textAlign: "center", padding: "60px 20px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧠</div>
      <div style={{ color: "#fff", fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
        Not Enough Data Yet
      </div>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "14px" }}>
        Add expenses for at least 2 months to unlock AI predictions.
      </div>
    </div>
  );

  const historicalChart = data.historical?.map(h => ({
    month: formatMonth(h.month),
    amount: h.amount,
    isPrediction: false,
  })) || [];

  // Add prediction bar
  if (data.prediction) {
    historicalChart.push({
      month: `${formatMonth(data.next_month)} (Predicted)`,
      amount: data.prediction,
      isPrediction: true,
    });
  }

  const categoryData = Object.entries(data.category_predictions || {})
    .sort(([,a],[,b]) => b - a)
    .map(([cat, amt], i) => ({ cat, amt, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "0 0 32px" }}>

      {/* Header Card */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(16,185,129,0.12) 100%)",
        border: "1px solid rgba(124,58,237,0.35)",
        borderRadius: "20px",
        padding: "28px 32px",
        display: "flex",
        flexWrap: "wrap",
        gap: "32px",
        alignItems: "center",
      }}>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", marginBottom: "6px", fontWeight: 600 }}>
            🧠 AI Prediction for {formatMonth(data.next_month)}
          </div>
          <div style={{ color: "#fff", fontSize: "40px", fontWeight: 900, lineHeight: 1 }}>
            ৳{data.prediction.toLocaleString("en-BD")}
          </div>
          <div style={{
            marginTop: "10px", display: "inline-flex", alignItems: "center", gap: "6px",
            color: data.trend === "increasing" ? "#ef4444" : "#10b981",
            background: data.trend === "increasing" ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
            border: `1px solid ${data.trend === "increasing" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
            borderRadius: "20px", padding: "4px 12px", fontSize: "13px", fontWeight: 600,
          }}>
            {data.trend === "increasing" ? "📈 Spending trending up" : "📉 Spending trending down"}
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#06b6d4" }}>
              {data.months_analyzed}
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>Months Analyzed</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#f59e0b" }}>
              {Object.keys(data.category_predictions || {}).length}
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>Categories</div>
          </div>
        </div>
      </div>

      {/* Historical + Prediction Chart */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "24px",
      }}>
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "15px", marginBottom: "20px" }}>
          Monthly Spending History + AI Forecast
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={historicalChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {historicalChart.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isPrediction
                    ? "url(#predGrad)"
                    : "url(#histGrad)"}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#5b21b6" />
              </linearGradient>
              <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#7c3aed" }} />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Historical</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981" }} />
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>AI Prediction</span>
          </div>
        </div>
      </div>

      {/* Category Predictions */}
      {categoryData.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "24px",
        }}>
          <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "15px", marginBottom: "16px" }}>
            📂 Predicted Spending by Category
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {categoryData.map(({ cat, amt, color }, i) => {
              const maxAmt = categoryData[0].amt;
              const pct = Math.round((amt / maxAmt) * 100);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "13px" }}>{cat}</span>
                    <span style={{ color, fontWeight: 700, fontSize: "13px" }}>৳{amt.toLocaleString("en-BD")}</span>
                  </div>
                  <div style={{ height: "7px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`, background: color,
                      borderRadius: "4px", transition: "width 1s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
