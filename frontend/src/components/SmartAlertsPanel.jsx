import { useCallback, useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "");
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Bypass-Tunnel-Reminder": "true",
});

const SEVERITY_CONFIG = {
  danger:  { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  dot: "#ef4444", label: "Over Budget" },
  warning: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", dot: "#f59e0b", label: "Near Limit" },
  info:    { bg: "rgba(6,182,212,0.10)",  border: "rgba(6,182,212,0.3)",   dot: "#06b6d4", label: "Upcoming" },
};

function AlertCard({ alert, onDismiss, dismissed }) {
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  if (dismissed) return null;

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: "12px", padding: "14px 16px",
      display: "flex", alignItems: "flex-start", gap: "12px",
      animation: "fadeInDown 0.4s ease",
      transition: "all 0.3s ease",
    }}>
      {/* Severity Dot */}
      <div style={{
        width: "10px", height: "10px", borderRadius: "50%",
        background: cfg.dot, flexShrink: 0, marginTop: "4px",
        boxShadow: `0 0 8px ${cfg.dot}`,
      }} />

      <div style={{ flex: 1 }}>
        <div style={{ color: "var(--text-primary)", fontSize: "14px", lineHeight: 1.5, fontWeight: 500 }}>
          {alert.message}
        </div>

        {alert.type === "over_budget" || alert.type === "near_limit" ? (
          <div style={{ marginTop: "8px" }}>
            <div style={{ height: "5px", background: "var(--bg-surface-hover)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, alert.percentage)}%`,
                background: alert.severity === "danger"
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : "linear-gradient(90deg, #f59e0b, #d97706)",
                borderRadius: "3px",
                transition: "width 0.8s ease",
              }} />
            </div>
            <div style={{ color: "var(--text-primary)", fontSize: "11px", marginTop: "4px" }}>
              {alert.percentage}% used — ৳{alert.spent?.toLocaleString()} / ৳{alert.limit?.toLocaleString()}
            </div>
          </div>
        ) : alert.type === "upcoming_recurring" ? (
          <div style={{
            marginTop: "6px", display: "flex", gap: "10px",
            color: "var(--text-primary)", fontSize: "12px",
          }}>
            <span>📅 Due: {new Date(alert.due_date).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}</span>
            <span>💰 ৳{alert.amount?.toLocaleString()}</span>
          </div>
        ) : null}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(alert)}
        style={{
          background: "none", border: "none", color: "var(--text-secondary)",
          cursor: "pointer", fontSize: "16px", padding: "0", flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseEnter={e => e.target.style.color = "#fff"}
        onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}
        title="Dismiss"
      >✕</button>
    </div>
  );
}

export default function SmartAlertsPanel({ isOpen, onClose, onBudgetClick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ef_dismissed_alerts") || "[]"); }
    catch { return []; }
  });
  const panelRef = useRef(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/insights/alerts`, { headers: authHeaders() });
      const json = await res.json();
      if (json.success) setData(json);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isOpen) loadAlerts();
  }, [isOpen, loadAlerts]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  const handleDismiss = (alert) => {
    const key = `${alert.type}_${alert.category}_${alert.title || ""}`;
    const updated = [...dismissed, key];
    setDismissed(updated);
    localStorage.setItem("ef_dismissed_alerts", JSON.stringify(updated));
  };

  const isAlertDismissed = (alert) => {
    const key = `${alert.type}_${alert.category}_${alert.title || ""}`;
    return dismissed.includes(key);
  };

  const visibleAlerts = data?.alerts?.filter(a => !isAlertDismissed(a)) || [];
  const dangerCount = visibleAlerts.filter(a => a.severity === "danger").length;
  const warningCount = visibleAlerts.filter(a => a.severity === "warning").length;
  const infoCount = visibleAlerts.filter(a => a.severity === "info").length;

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, left: 0,
      zIndex: 9999, display: "flex", justifyContent: "flex-end",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      animation: "fadeIn 0.2s ease",
    }}>
      <div ref={panelRef} style={{
        width: "min(420px, 100vw)",
        background: "rgba(10,6,24,0.98)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.3s ease",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "sticky", top: 0,
          background: "rgba(10,6,24,0.98)",
          backdropFilter: "blur(10px)",
          zIndex: 1,
        }}>
          <div>
            <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "18px" }}>🔔 Smart Alerts</div>
            <div style={{ color: "var(--text-primary)", fontSize: "12px", marginTop: "2px" }}>
              {visibleAlerts.length} active alerts
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--bg-surface-hover)", border: "none", color: "var(--text-primary)",
            width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer",
            fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}>✕</button>
        </div>

        {/* Summary Chips */}
        {!loading && data && (
          <div style={{ padding: "12px 24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {dangerCount > 0 && (
              <span style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: 600,
              }}>❌ {dangerCount} Over Budget</span>
            )}
            {warningCount > 0 && (
              <span style={{
                background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
                color: "#f59e0b", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: 600,
              }}>⚠️ {warningCount} Near Limit</span>
            )}
            {infoCount > 0 && (
              <span style={{
                background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)",
                color: "#06b6d4", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: 600,
              }}>🔄 {infoCount} Upcoming</span>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "8px 24px 24px", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <div className="spinner" />
            </div>
          ) : visibleAlerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <div style={{ color: "var(--text-primary)", fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>
                All Clear!
              </div>
              <div style={{ color: "var(--text-primary)", fontSize: "13px" }}>
                No budget alerts or upcoming expenses right now.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Danger first */}
              {visibleAlerts
                .sort((a, b) => {
                  const order = { danger: 0, warning: 1, info: 2 };
                  return order[a.severity] - order[b.severity];
                })
                .map((alert, i) => (
                  <AlertCard
                    key={`${alert.type}_${alert.category}_${i}`}
                    alert={alert}
                    onDismiss={handleDismiss}
                    dismissed={isAlertDismissed(alert)}
                  />
                ))
              }
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: "10px",
        }}>
          <button
            onClick={() => { onBudgetClick?.(); onClose?.(); }}
            style={{
              flex: 1, padding: "10px", background: "rgba(124,58,237,0.2)",
              border: "1px solid rgba(124,58,237,0.4)", borderRadius: "10px",
              color: "var(--text-primary)", cursor: "pointer", fontSize: "13px", fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.35)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.2)"}
          >
            💰 Manage Budgets
          </button>
          <button
            onClick={() => {
              setDismissed([]);
              localStorage.removeItem("ef_dismissed_alerts");
            }}
            style={{
              padding: "10px 14px", background: "var(--bg-surface-hover)",
              border: "1px solid var(--border-subtle)", borderRadius: "10px",
              color: "var(--text-primary)", cursor: "pointer", fontSize: "12px",
              transition: "all 0.2s",
            }}
            title="Show dismissed alerts"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compact Alert Badge (for nav bar) ─────────────────────────────────────
export function AlertBadge({ onClick }) {
  const [count, setCount] = useState(0);
  const [hasDanger, setHasDanger] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/insights/alerts`, { headers: authHeaders() });
        const json = await res.json();
        if (json.success) {
          setCount(json.alert_count);
          setHasDanger(json.has_danger);
        }
      } catch { /* silent */ }
    };
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      id="alerts-badge-btn"
      onClick={onClick}
      style={{
        position: "relative", background: "var(--bg-surface-hover)",
        border: "1px solid var(--border-subtle)", borderRadius: "10px",
        padding: "8px 10px", cursor: "pointer", color: "var(--text-primary)",
        fontSize: "18px", transition: "all 0.2s", display: "flex", alignItems: "center",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
      title="Smart Alerts"
    >
      🔔
      {count > 0 && (
        <span style={{
          position: "absolute", top: "-6px", right: "-6px",
          background: hasDanger ? "#ef4444" : "#f59e0b",
          color: "var(--text-primary)", borderRadius: "10px",
          fontSize: "10px", fontWeight: 800,
          padding: "1px 5px", minWidth: "16px", textAlign: "center",
          boxShadow: `0 0 8px ${hasDanger ? "#ef444480" : "#f59e0b80"}`,
          animation: hasDanger ? "pulse 2s infinite" : "none",
        }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
