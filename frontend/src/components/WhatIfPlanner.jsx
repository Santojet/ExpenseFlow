import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "");
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Bypass-Tunnel-Reminder": "true",
});

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(15,10,30,0.95)",
        border: "1px solid rgba(124,58,237,0.4)",
        borderRadius: "10px",
        padding: "10px 14px",
      }}>
        <div style={{ color: "var(--text-primary)", fontSize: "12px" }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontWeight: 700, fontSize: "14px" }}>
            ৳{Number(p.value).toLocaleString("en-BD")}
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function WhatIfPlanner({ lang = "en" }) {
  const [monthlySaving, setMonthlySaving] = useState(2000);
  const [simMonths, setSimMonths] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  const fetchData = useCallback(async (saving, months) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/insights/whatif?monthly_saving=${saving}&months=${months}`,
        { headers: authHeaders() }
      );
      const json = await res.json();
      if (json.success) setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Debounced fetch on slider change
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => fetchData(monthlySaving, simMonths), 400);
    setDebounceTimer(t);
    return () => clearTimeout(t);
  }, [monthlySaving, simMonths]);

  const formatMonth = (key) => {
    if (!key) return "";
    const [y, m] = key.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[parseInt(m)-1]} '${y.slice(2)}`;
  };

  const chartData = data?.projection?.map(p => ({
    month: formatMonth(p.month),
    savings: p.savings,
  })) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "0 0 32px" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.1) 100%)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "20px",
        padding: "28px 32px",
      }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>
          📉 "What If" Scenario Planner
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
          Simulate your savings growth — see how much you can save over time.
        </p>
      </div>

      {/* Controls */}
      <div className="content-card" style={{
        padding: "28px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: "32px",
      }}>
        {/* Monthly Saving Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600 }}>
              Extra Monthly Saving
            </label>
            <span style={{
              color: "#10b981", fontWeight: 800, fontSize: "18px",
              background: "rgba(16,185,129,0.12)",
              padding: "2px 10px", borderRadius: "8px",
            }}>
              ৳{monthlySaving.toLocaleString("en-BD")}
            </span>
          </div>
          <input
            type="range" min="500" max="50000" step="500"
            value={monthlySaving}
            onChange={e => setMonthlySaving(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#10b981", cursor: "pointer", height: "6px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px" }}>
            <span>৳500</span>
            <span>৳50,000</span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600 }}>
              Simulation Period
            </label>
            <span style={{
              color: "#06b6d4", fontWeight: 800, fontSize: "18px",
              background: "rgba(6,182,212,0.12)",
              padding: "2px 10px", borderRadius: "8px",
            }}>
              {simMonths} months
            </span>
          </div>
          <input
            type="range" min="3" max="60" step="3"
            value={simMonths}
            onChange={e => setSimMonths(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#06b6d4", cursor: "pointer", height: "6px" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px" }}>
            <span>3 months</span>
            <span>5 years</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
          {[
            { label: "Current Savings", value: `৳${data.current_savings.toLocaleString("en-BD")}`, color: "#7c3aed", icon: "💰" },
            { label: "Extra Saved", value: `৳${data.total_extra_saved.toLocaleString("en-BD")}`, color: "#10b981", icon: "📈" },
            { label: "Total in " + simMonths + " months", value: `৳${((data.projection.at(-1)?.savings) || 0).toLocaleString("en-BD")}`, color: "#06b6d4", icon: "🏦" },
            { label: "Avg Monthly Expense", value: `৳${data.avg_monthly_expense.toLocaleString("en-BD")}`, color: "#f59e0b", icon: "📊" },
          ].map((card, i) => (
            <div key={i} className="content-card" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: "22px", marginBottom: "6px" }}>{card.icon}</div>
              <div style={{ color: card.color, fontSize: "18px", fontWeight: 800 }}>{card.value}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "2px" }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="content-card" style={{ padding: "24px" }}>
        <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px", marginBottom: "20px" }}>
          Savings Projection Chart
        </h3>
        {loading ? (
          <div style={{ height: "220px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => `৳${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="savings" stroke="#10b981" strokeWidth={2.5}
                fill="url(#savingsGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Goal Analysis */}
      {data?.goal_analysis?.length > 0 && (
        <div className="content-card" style={{ padding: "24px" }}>
          <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "15px", marginBottom: "16px" }}>
            🎯 Goal Achievement Timeline
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.goal_analysis.map((g, i) => {
              const pct = Math.min(100, (g.current_savings / g.target_amount) * 100);
              return (
                <div key={i} style={{
                  background: "var(--bg-surface-hover)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  border: g.is_already_achieved
                    ? "1px solid rgba(16,185,129,0.4)"
                    : "1px solid var(--border-subtle)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}>{g.title}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                        ৳{g.current_savings.toLocaleString()} / ৳{g.target_amount.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {g.is_already_achieved ? (
                        <span style={{ color: "#10b981", fontWeight: 700, fontSize: "13px" }}>✅ Achieved!</span>
                      ) : g.achievement_date ? (
                        <span style={{ color: "#f59e0b", fontSize: "12px" }}>
                          ~{g.months_needed?.toFixed(1)} months
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Set a saving amount</span>
                      )}
                    </div>
                  </div>
                  <div style={{ height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: g.is_already_achieved
                        ? "linear-gradient(90deg, #10b981, #06b6d4)"
                        : "linear-gradient(90deg, #7c3aed, #06b6d4)",
                      borderRadius: "3px", transition: "width 1s ease",
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
