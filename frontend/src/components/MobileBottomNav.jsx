import { useState } from "react";

export default function MobileBottomNav({
  activePage,
  setActivePage,
  onOpenAddExpense,
  onOpenAddDebt,
  onOpenSmsParser,
  pendingSalaryCount = 0,
  t = {},
}) {
  const [fabOpen, setFabOpen] = useState(false);

  const items = [
    { id: "dashboard", icon: "⌂", label: t.dashboard || "Home" },
    { id: "expenses", icon: "↘", label: t.expenses || "Expenses" },
    { id: "debts", icon: "🤝", label: t.debts || "Debts" },
    { id: "reports", icon: "◫", label: t.reports || "Reports" },
    { id: "profile", icon: "◎", label: t.profile || "Profile" },
  ];

  return (
    <>
      {/* Floating Action Button Backdrop */}
      {fabOpen && (
        <div
          className="fab-backdrop"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Popover Action Menu */}
      {fabOpen && (
        <div className="mobile-fab-menu">
          <button
            type="button"
            onClick={() => {
              setFabOpen(false);
              onOpenSmsParser();
            }}
            className="fab-action-btn purple"
          >
            <span>{t.smsParserBtn || "⚡ SMS Parser"}</span>
            <span className="fab-action-icon">⚡</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFabOpen(false);
              onOpenAddDebt();
            }}
            className="fab-action-btn green"
          >
            <span>{t.addDebt || "+ Add Debt"}</span>
            <span className="fab-action-icon">🤝</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFabOpen(false);
              onOpenAddExpense();
            }}
            className="fab-action-btn"
          >
            <span>{t.addNewExpense || "+ Add Expense"}</span>
            <span className="fab-action-icon">+</span>
          </button>
        </div>
      )}

      {/* Floating Action Button (Only visible on mobile <= 768px) */}
      <button
        type="button"
        className="mobile-fab-btn"
        onClick={() => setFabOpen(!fabOpen)}
        aria-label="Quick Actions"
        style={fabOpen ? { transform: "rotate(45deg)", background: "var(--danger)" } : {}}
      >
        +
      </button>

      {/* Mobile Bottom Bar (Only visible on mobile <= 768px) */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {items.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
                className={`mobile-tab-item ${isActive ? "active" : ""}`}
              >
                <span className="mobile-tab-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
