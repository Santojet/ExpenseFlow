import { useEffect, useState, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "");

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Bypass-Tunnel-Reminder": "true",
});

// ── Circular Progress Ring ─────────────────────────────────────────────────
function ScoreRing({ score, size = 160 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  const color =
    score >= 85 ? "#00d4ff"
    : score >= 70 ? "#ffd700"
    : score >= 55 ? "#c0c0c0"
    : score >= 35 ? "#cd7f32"
    : "#6b7280";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ── Badge Card ─────────────────────────────────────────────────────────────
function BadgeCard({ badge }) {
  return (
    <div style={{
      background: "rgba(124,58,237,0.15)",
      border: "1px solid rgba(124,58,237,0.35)",
      borderRadius: "12px",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      animation: "fadeInUp 0.5s ease",
    }}>
      <span style={{ fontSize: "26px" }}>{badge.icon}</span>
      <div>
        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px" }}>{badge.name}</div>
        <div style={{ color: "var(--text-primary)", fontSize: "11px" }}>{badge.desc}</div>
      </div>
    </div>
  );
}

// ── Score Bar ──────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ color: "var(--text-primary)", fontSize: "13px" }}>{label}</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px" }}>{value}/{max}</span>
      </div>
      <div style={{ height: "8px", background: "var(--bg-surface-hover)", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: "4px", transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

// ── Day Pattern Bar ────────────────────────────────────────────────────────
function DayPatternChart({ pattern }) {
  if (!pattern || Object.keys(pattern).length === 0) return null;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const shortDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const values = days.map(d => pattern[d] || 0);
  const maxVal = Math.max(...values, 1);

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "60px" }}>
        {values.map((v, i) => {
          const isWeekend = i >= 4;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{
                width: "100%", height: `${(v / maxVal) * 52}px`,
                background: isWeekend
                  ? "linear-gradient(180deg, #ef4444, #b91c1c)"
                  : "linear-gradient(180deg, #7c3aed, #5b21b6)",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.8s ease",
                minHeight: v > 0 ? "4px" : "0",
              }} />
              <span style={{ color: "var(--text-primary)", fontSize: "10px" }}>{shortDays[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GamificationDashboard({ lang = "en" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/insights/gamification`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setData(json);
      else setError("Failed to load data");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-primary)" }}>
      {error}
    </div>
  );

  if (!data) return null;

  const { score, score_breakdown, level, badges, streak, savings_rate, active_tracking_days, behavioral_insights, daily_pattern } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "0 0 32px" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(6,182,212,0.15) 100%)",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: "20px",
        padding: "32px",
        display: "flex",
        flexWrap: "wrap",
        gap: "32px",
        alignItems: "center",
      }}>
        {/* Score Ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ScoreRing score={score} size={160} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)", textAlign: "center",
          }}>
            <div style={{ fontSize: "32px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: "11px", color: "var(--text-primary)", marginTop: "4px" }}>/ 100</div>
          </div>
        </div>

        {/* Level & Info */}
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "6px" }}>
            {level}
          </div>
          <div style={{ color: "var(--text-primary)", fontSize: "14px", marginBottom: "20px" }}>
            Financial Health Score
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#ffd700" }}>🔥 {streak}</div>
              <div style={{ color: "var(--text-primary)", fontSize: "11px" }}>Day Streak</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#10b981" }}>{savings_rate}%</div>
              <div style={{ color: "var(--text-primary)", fontSize: "11px" }}>Savings Rate</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#06b6d4" }}>{active_tracking_days}</div>
              <div style={{ color: "var(--text-primary)", fontSize: "11px" }}>Active Days</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          <div style={{ color: "var(--text-primary)", fontSize: "12px", marginBottom: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Score Breakdown
          </div>
          <ScoreBar label="Budget Adherence" value={score_breakdown.budget_adherence} max={30} color="#7c3aed" />
          <ScoreBar label="Savings Rate" value={score_breakdown.savings_rate} max={30} color="#10b981" />
          <ScoreBar label="Tracking Consistency" value={score_breakdown.tracking_consistency} max={20} color="#06b6d4" />
          <ScoreBar label="Goals Progress" value={score_breakdown.goals_progress} max={20} color="#f59e0b" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>

        {/* Badges */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "24px",
        }}>
          <h3 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
            🏅 Earned Badges ({badges.length})
          </h3>
          {badges.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center", padding: "20px" }}>
              Keep tracking to earn badges!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
            </div>
          )}
        </div>

        {/* Behavioral Insights + Day Pattern */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "24px",
        }}>
          <h3 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
            🧬 Behavioral Insights
          </h3>
          {behavioral_insights.length === 0 ? (
            <div style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center", padding: "20px" }}>
              Add more expenses to unlock insights!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {behavioral_insights.map((ins, i) => (
                <div key={i} style={{
                  background: "var(--bg-surface-hover)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  borderLeft: `3px solid ${ins.type === "weekend_splurge" ? "#ef4444" : "#7c3aed"}`,
                }}>
                  {ins.insight}
                </div>
              ))}
            </div>
          )}

          <div style={{ color: "var(--text-primary)", fontSize: "12px", marginBottom: "8px", fontWeight: 600 }}>
            Weekly Spending Pattern
          </div>
          <DayPatternChart pattern={daily_pattern} />
        </div>
      </div>

      {/* Level Progress Guide */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        padding: "24px",
      }}>
        <h3 style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>
          📈 Level Progression
        </h3>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { label: "🌱 Beginner", range: "0-34", active: score < 35, achieved: true },
            { label: "🥉 Bronze", range: "35-54", active: score >= 35 && score < 55, achieved: score >= 35 },
            { label: "🥈 Silver", range: "55-69", active: score >= 55 && score < 70, achieved: score >= 55 },
            { label: "🥇 Gold", range: "70-84", active: score >= 70 && score < 85, achieved: score >= 70 },
            { label: "💎 Diamond", range: "85-100", active: score >= 85, achieved: score >= 85 },
          ].map((lvl, i) => (
            <div key={i} style={{
              flex: 1, minWidth: "120px",
              padding: "12px",
              borderRadius: "10px",
              textAlign: "center",
              background: lvl.active
                ? "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(6,182,212,0.2))"
                : lvl.achieved
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.02)",
              border: lvl.active
                ? "1px solid rgba(124,58,237,0.6)"
                : "1px solid rgba(255,255,255,0.06)",
              opacity: lvl.achieved ? 1 : 0.4,
            }}>
              <div style={{ fontSize: "13px", fontWeight: lvl.active ? 700 : 500, color: "var(--text-primary)" }}>
                {lvl.label}
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: "11px", marginTop: "2px" }}>
                {lvl.range} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
