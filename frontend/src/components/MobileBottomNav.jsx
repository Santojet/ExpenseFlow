import { useState, useEffect } from "react";

export default function MobileBottomNav({
  activePage,
  setActivePage,
  onOpenAddExpense,
  onOpenAddSalary,
  onOpenAddDebt,
  onOpenAddBudget,
  onOpenAddGoal,
  onOpenSmsParser,
  pendingSalaryCount = 0,
  budgetsOverCount = 0,
  canAccessAdmin = false,
  loadUsers,
  onOpenInstall,
  onOpenSearch,
  unreadNotifCount = 0,
  onOpenNotif,
  theme = "dark",
  onToggleTheme,
  lang = "en",
  onToggleLang,
  currentUser = null,
  getRoleLabel = () => "User",
  onLogout,
  t = {},
}) {
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close menus when activePage changes
  useEffect(() => {
    setFabOpen(false);
    setMoreOpen(false);
  }, [activePage]);

  // Bottom navigation primary tabs (5 tabs)
  const tabs = [
    { id: "dashboard", icon: "⌂", label: t.dashboard || "Home" },
    { id: "expenses", icon: "↘", label: t.expenses || "Expenses" },
    {
      id: "salary",
      icon: "৳",
      label: t.salary || "Salary",
      badge: pendingSalaryCount > 0 ? pendingSalaryCount : null,
      badgeColor: "orange",
    },
    { id: "debts", icon: "🤝", label: t.debts || "Debts" },
    {
      id: "more",
      icon: "☰",
      label: lang === "bn" ? "মেনু" : "More",
      badge: budgetsOverCount > 0 ? "!" : null,
      badgeColor: "danger",
      isMore: true,
      active: [
        "reports",
        "budgets",
        "goals",
        "categories",
        "profile",
        "admin",
      ].includes(activePage),
    },
  ];

  // All features list for the "More" bottom sheet
  const allFeatures = [
    {
      id: "dashboard",
      icon: "⌂",
      title: t.dashboard || "Dashboard",
      subtitle: lang === "bn" ? "সামগ্রিক চিত্র" : "Overview & metrics",
      tone: "blue",
    },
    {
      id: "expenses",
      icon: "↘",
      title: t.expenses || "Expenses",
      subtitle: lang === "bn" ? "দৈনিক খরচ ও তালিকা" : "Daily spending & list",
      tone: "purple",
    },
    {
      id: "salary",
      icon: "৳",
      title: t.salary || "Salary",
      subtitle: lang === "bn" ? "বেতন ও পে-রোল ট্র্যাকিং" : "Payroll & earnings",
      tone: "green",
      badge: pendingSalaryCount > 0 ? `${pendingSalaryCount} ${lang === "bn" ? "বকেয়া" : "pending"}` : null,
      badgeTone: "orange",
    },
    {
      id: "debts",
      icon: "🤝",
      title: t.debts || "Debts & Loans",
      subtitle: lang === "bn" ? "পাওনা ও দেনা ট্র্যাকিং" : "Borrowing & lending",
      tone: "cyan",
    },
    {
      id: "reports",
      icon: "◫",
      title: t.reports || "Reports",
      subtitle: lang === "bn" ? "চার্ট, এনালাইসিস ও PDF" : "Charts & PDF exports",
      tone: "indigo",
    },
    {
      id: "budgets",
      icon: "💰",
      title: t.budgets || "Budgets",
      subtitle: lang === "bn" ? "ক্যাটাগরি অনুযায়ী বাজেট" : "Category limits",
      tone: "amber",
      badge: budgetsOverCount > 0 ? `${budgetsOverCount} ${lang === "bn" ? "সীমা ছাড়িয়েছে" : "over"}` : null,
      badgeTone: "danger",
    },
    {
      id: "goals",
      icon: "📈",
      title: t.savingsGoals || "Savings Goals",
      subtitle: lang === "bn" ? "আর্থিক লক্ষ্য ও অগ্রগতি" : "Financial targets",
      tone: "emerald",
    },
    {
      id: "categories",
      icon: "📌",
      title: t.categories || "Categories",
      subtitle: lang === "bn" ? "কাস্টম ক্যাটাগরি তৈরি" : "Manage categories",
      tone: "rose",
    },
    ...(canAccessAdmin
      ? [
          {
            id: "admin",
            icon: "⚙",
            title: t.admin || "Admin Panel",
            subtitle: lang === "bn" ? "ইউজার ও প্রতিষ্ঠান কন্ট্রোল" : "Users & organization",
            tone: "violet",
          },
        ]
      : []),
    {
      id: "profile",
      icon: "◎",
      title: t.profile || "Profile",
      subtitle: lang === "bn" ? "অ্যাকাউন্ট, পিন ও সেটিংস" : "Security & account",
      tone: "slate",
    },
  ];

  const handleTabClick = (tab) => {
    if (tab.isMore) {
      setMoreOpen((prev) => !prev);
      setFabOpen(false);
    } else {
      setActivePage(tab.id);
      setMoreOpen(false);
      setFabOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFeatureNavigate = (pageId) => {
    if (pageId === "admin" && loadUsers) {
      loadUsers();
    }
    setActivePage(pageId);
    setMoreOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* ── BACKDROPS ────────────────────────────────────────── */}
      {fabOpen && (
        <div
          className="fab-backdrop"
          onClick={() => setFabOpen(false)}
        />
      )}

      {moreOpen && (
        <div
          className="mobile-more-backdrop"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* ── MOBILE "MORE" ALL-FEATURES BOTTOM SHEET ───────────── */}
      {moreOpen && (
        <div className="mobile-more-sheet" role="dialog" aria-modal="true">
          <div className="mobile-sheet-drag-handle" />

          {/* Sheet Header */}
          <div className="mobile-sheet-header">
            <div className="mobile-user-card">
              <div className="mobile-avatar">
                {(currentUser?.full_name || currentUser?.username || "U")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="mobile-user-meta">
                <strong>{currentUser?.full_name || currentUser?.username || "User"}</strong>
                <span>{getRoleLabel ? getRoleLabel(currentUser) : "User"}</span>
              </div>
            </div>
            <button
              type="button"
              className="mobile-sheet-close-btn"
              onClick={() => setMoreOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* All Features Grid */}
          <div className="mobile-sheet-section-title">
            <span>{lang === "bn" ? "সমস্ত পেজ ও ফিচার" : "All Features & Pages"}</span>
          </div>

          <div className="mobile-sheet-grid">
            {allFeatures.map((item) => {
              const isCurrent = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleFeatureNavigate(item.id)}
                  className={`mobile-sheet-card ${item.tone} ${isCurrent ? "current" : ""}`}
                >
                  <div className="mobile-sheet-card-top">
                    <span className="mobile-sheet-card-icon">{item.icon}</span>
                    {item.badge && (
                      <span className={`mobile-sheet-badge ${item.badgeTone || "primary"}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <strong className="mobile-sheet-card-title">{item.title}</strong>
                  <span className="mobile-sheet-card-sub">{item.subtitle}</span>
                </button>
              );
            })}
          </div>

          {/* Utility Tools Row */}
          <div className="mobile-sheet-section-title" style={{ marginTop: "16px" }}>
            <span>{lang === "bn" ? "কুইক টুলস ও সেটিংস" : "Quick Tools & Settings"}</span>
          </div>

          <div className="mobile-sheet-tools">
            {onOpenSearch && (
              <button
                type="button"
                className="sheet-tool-btn"
                onClick={() => {
                  setMoreOpen(false);
                  onOpenSearch();
                }}
              >
                <span className="sheet-tool-icon">🔍</span>
                <span>{lang === "bn" ? "সার্চ" : "Search"}</span>
              </button>
            )}

            {onOpenInstall && (
              <button
                type="button"
                className="sheet-tool-btn"
                onClick={() => {
                  setMoreOpen(false);
                  onOpenInstall();
                }}
              >
                <span className="sheet-tool-icon">📲</span>
                <span>{lang === "bn" ? "ইন্সটল" : "Install"}</span>
              </button>
            )}

            {onOpenNotif && (
              <button
                type="button"
                className="sheet-tool-btn"
                onClick={() => {
                  setMoreOpen(false);
                  onOpenNotif();
                }}
              >
                <span className="sheet-tool-icon">
                  🔔
                  {unreadNotifCount > 0 && <span className="tool-badge-dot" />}
                </span>
                <span>{lang === "bn" ? "নোটিফিকেশন" : "Alerts"}</span>
              </button>
            )}

            {onToggleLang && (
              <button
                type="button"
                className="sheet-tool-btn"
                onClick={onToggleLang}
              >
                <span className="sheet-tool-icon">🌐</span>
                <span>{lang === "en" ? "বাংলা" : "English"}</span>
              </button>
            )}

            {onToggleTheme && (
              <button
                type="button"
                className="sheet-tool-btn"
                onClick={onToggleTheme}
              >
                <span className="sheet-tool-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
                <span>{theme === "dark" ? (t.lightMode || "Light") : (t.darkMode || "Dark")}</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                className="sheet-tool-btn danger"
                onClick={() => {
                  setMoreOpen(false);
                  onLogout();
                }}
              >
                <span className="sheet-tool-icon">↪</span>
                <span>{t.signOut || "Sign Out"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── EXPANDED FLOATING ACTION BUTTON (FAB) MENU ────────── */}
      {fabOpen && (
        <div className="mobile-fab-menu" role="menu">
          <button
            type="button"
            onClick={() => {
              setFabOpen(false);
              if (onOpenSmsParser) onOpenSmsParser();
            }}
            className="fab-action-btn purple"
          >
            <span>{t.smsParserBtn || "⚡ SMS Parser"}</span>
            <span className="fab-action-icon">⚡</span>
          </button>

          {onOpenAddGoal && (
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onOpenAddGoal();
              }}
              className="fab-action-btn rose"
            >
              <span>{t.addGoal || "+ New Goal"}</span>
              <span className="fab-action-icon">📈</span>
            </button>
          )}

          {onOpenAddBudget && (
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onOpenAddBudget();
              }}
              className="fab-action-btn amber"
            >
              <span>{t.setBudget || "+ Set Budget"}</span>
              <span className="fab-action-icon">💰</span>
            </button>
          )}

          {onOpenAddSalary && (
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onOpenAddSalary();
              }}
              className="fab-action-btn emerald"
            >
              <span>{t.addSalaryBtn || "+ Add Salary"}</span>
              <span className="fab-action-icon">৳</span>
            </button>
          )}

          {onOpenAddDebt && (
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
          )}

          {onOpenAddExpense && (
            <button
              type="button"
              onClick={() => {
                setFabOpen(false);
                onOpenAddExpense();
              }}
              className="fab-action-btn primary"
            >
              <span>{t.addNewExpense || "+ Add Expense"}</span>
              <span className="fab-action-icon">+</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Action Button (Only visible on mobile <= 768px) */}
      <button
        type="button"
        className="mobile-fab-btn"
        onClick={() => {
          setFabOpen(!fabOpen);
          if (moreOpen) setMoreOpen(false);
        }}
        aria-label="Quick Actions"
        style={fabOpen ? { transform: "rotate(45deg)", background: "var(--danger)" } : {}}
      >
        +
      </button>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <div className="mobile-bottom-nav-inner">
          {tabs.map((tab) => {
            const isTabActive = tab.isMore ? tab.active : activePage === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                className={`mobile-tab-item ${isTabActive ? "active" : ""}`}
                aria-label={tab.label}
              >
                <div className="mobile-tab-icon-wrapper">
                  <span className="mobile-tab-icon">{tab.icon}</span>
                  {tab.badge && (
                    <span className={`mobile-tab-badge ${tab.badgeColor || "primary"}`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
