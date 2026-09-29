import { useCallback, useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "");
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Bypass-Tunnel-Reminder": "true",
  "Content-Type": "application/json",
});

const FREQ_OPTIONS = [
  { value: "daily",   label: "Daily",   icon: "📅" },
  { value: "weekly",  label: "Weekly",  icon: "📆" },
  { value: "monthly", label: "Monthly", icon: "🗓️" },
  { value: "yearly",  label: "Yearly",  icon: "🎉" },
];

const FREQ_MAP = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

const DEFAULT_CATEGORIES = [
  "Utilities", "Food", "Transport", "Healthcare", "Education",
  "Entertainment", "Shopping", "Rent", "EMI/Loan", "Subscription", "Other"
];

function RecurringCard({ expense, onDelete, onSkip }) {
  const today = new Date();
  const dueDate = new Date(expense.next_due_date);
  const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0;
  const isDueToday = daysLeft === 0;
  const isDueSoon = daysLeft <= 3 && daysLeft > 0;

  const urgencyColor = isOverdue ? "#ef4444" : isDueSoon || isDueToday ? "#f59e0b" : "#10b981";
  const urgencyBg = isOverdue ? "rgba(239,68,68,0.1)" : isDueSoon || isDueToday ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.08)";
  const urgencyBorder = isOverdue ? "rgba(239,68,68,0.3)" : isDueSoon || isDueToday ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.2)";

  return (
    <div style={{
      background: urgencyBg,
      border: `1px solid ${urgencyBorder}`,
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "all 0.25s ease",
      cursor: "default",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      {/* Icon */}
      <div style={{
        width: "46px", height: "46px", borderRadius: "12px",
        background: `${urgencyColor}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "20px", flexShrink: 0,
      }}>
        🔄
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px", marginBottom: "2px" }}>
          {expense.title}
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{
            background: "rgba(124,58,237,0.2)", color: "#a78bfa",
            borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 600,
          }}>
            {FREQ_MAP[expense.recurrence_frequency] || expense.recurrence_frequency}
          </span>
          <span style={{ color: "var(--text-primary)", fontSize: "12px" }}>
            📂 {expense.category}
          </span>
        </div>
      </div>

      {/* Amount & Due */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: urgencyColor, fontWeight: 800, fontSize: "18px" }}>
          ৳{parseFloat(expense.amount).toLocaleString("en-BD")}
        </div>
        <div style={{ color: urgencyColor, fontSize: "12px", fontWeight: 600, marginTop: "2px" }}>
          {isOverdue
            ? `⚠️ Overdue by ${Math.abs(daysLeft)}d`
            : isDueToday
            ? "📌 Due Today!"
            : isDueSoon
            ? `⏰ In ${daysLeft} day${daysLeft > 1 ? "s" : ""}`
            : `📅 In ${daysLeft} days`
          }
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "1px" }}>
          {dueDate.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={() => onDelete(expense.id)}
          style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444", borderRadius: "8px", padding: "6px 10px",
            cursor: "pointer", fontSize: "14px", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
          title="Delete recurring expense"
        >🗑</button>
      </div>
    </div>
  );
}

export default function RecurringExpensesPage({ notify, customCategories = [] }) {
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all"); // all | overdue | upcoming
  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "Utilities",
    expense_date: new Date().toISOString().slice(0, 10),
    description: "",
    recurrence_frequency: "monthly",
  });

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name || c)])];

  const loadRecurring = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/expenses?scope=my`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setRecurringExpenses((data.expenses || []).filter(e => e.is_recurring && e.next_due_date));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRecurring(); }, [loadRecurring]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.category || !form.expense_date) {
      notify?.("Please fill all required fields", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/expenses`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          is_recurring: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify?.("Recurring expense added! ✅", "success");
        setShowForm(false);
        setForm({
          title: "", amount: "", category: "Utilities",
          expense_date: new Date().toISOString().slice(0, 10),
          description: "", recurrence_frequency: "monthly",
        });
        await loadRecurring();
      } else {
        notify?.(data.message || "Failed to add", "error");
      }
    } catch {
      notify?.("Network error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this recurring expense?")) return;
    try {
      const res = await fetch(`${API}/api/expenses/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        notify?.("Deleted successfully", "success");
        await loadRecurring();
      } else {
        notify?.(data.message || "Failed to delete", "error");
      }
    } catch {
      notify?.("Network error", "error");
    }
  };

  const today = new Date();
  const filtered = recurringExpenses.filter(e => {
    const due = new Date(e.next_due_date);
    const daysLeft = Math.ceil((due - today) / 86400000);
    if (filter === "overdue") return daysLeft < 0;
    if (filter === "upcoming") return daysLeft >= 0 && daysLeft <= 7;
    return true;
  }).sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));

  const totalMonthly = recurringExpenses.reduce((sum, e) => {
    const amt = parseFloat(e.amount);
    if (e.recurrence_frequency === "daily") return sum + amt * 30;
    if (e.recurrence_frequency === "weekly") return sum + amt * 4;
    if (e.recurrence_frequency === "yearly") return sum + amt / 12;
    return sum + amt;
  }, 0);

  const overdue = recurringExpenses.filter(e => {
    const daysLeft = Math.ceil((new Date(e.next_due_date) - today) / 86400000);
    return daysLeft < 0;
  }).length;

  const dueSoon = recurringExpenses.filter(e => {
    const daysLeft = Math.ceil((new Date(e.next_due_date) - today) / 86400000);
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
        {[
          { label: "Total Recurring", value: recurringExpenses.length, icon: "🔄", color: "#7c3aed" },
          { label: "Monthly Cost", value: `৳${totalMonthly.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`, icon: "💸", color: "#ef4444" },
          { label: "Due This Week", value: dueSoon, icon: "⏰", color: "#f59e0b" },
          { label: "Overdue", value: overdue, icon: "⚠️", color: overdue > 0 ? "#ef4444" : "#10b981" },
        ].map((card, i) => (
          <div key={i} style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "14px", padding: "18px 20px",
          }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>{card.icon}</div>
            <div style={{ color: card.color, fontSize: "22px", fontWeight: 800 }}>{card.value}</div>
            <div style={{ color: "var(--text-primary)", fontSize: "12px", marginTop: "2px" }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Header + Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        {/* Filter Chips */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { key: "all", label: "All" },
            { key: "overdue", label: `⚠️ Overdue (${overdue})` },
            { key: "upcoming", label: `⏰ This Week (${dueSoon})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding: "8px 14px", borderRadius: "8px",
              background: filter === key ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
              border: filter === key ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
              color: filter === key ? "#fff" : "rgba(255,255,255,0.55)",
              cursor: "pointer", fontSize: "13px", fontWeight: filter === key ? 600 : 400,
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        <button
          id="add-recurring-btn"
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "10px 18px", borderRadius: "10px",
            background: showForm ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg, #7c3aed, #5b21b6)",
            border: showForm ? "1px solid rgba(239,68,68,0.3)" : "none",
            color: "var(--text-primary)", cursor: "pointer", fontWeight: 700, fontSize: "14px",
            display: "flex", alignItems: "center", gap: "6px",
            transition: "all 0.25s", boxShadow: showForm ? "none" : "0 4px 15px rgba(124,58,237,0.35)",
          }}
        >
          {showForm ? "✕ Cancel" : "+ Add Recurring"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: "16px", padding: "24px",
          animation: "fadeInDown 0.3s ease",
        }}>
          <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "16px", marginBottom: "20px" }}>
            🔄 Add Recurring Expense
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            {/* Title */}
            <div>
              <label style={{ color: "var(--text-primary)", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                Title *
              </label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Monthly Rent"
                required
                style={{
                  width: "100%", padding: "10px 12px", background: "var(--bg-surface-hover)",
                  border: "1px solid var(--border-subtle)", borderRadius: "8px",
                  color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Amount */}
            <div>
              <label style={{ color: "var(--text-primary)", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                Amount (৳) *
              </label>
              <input
                type="number" min="1" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 12000"
                required
                style={{
                  width: "100%", padding: "10px 12px", background: "var(--bg-surface-hover)",
                  border: "1px solid var(--border-subtle)", borderRadius: "8px",
                  color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ color: "var(--text-primary)", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                Category *
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{
                  width: "100%", padding: "10px 12px", background: "rgba(20,15,40,0.95)",
                  border: "1px solid var(--border-subtle)", borderRadius: "8px",
                  color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              >
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label style={{ color: "var(--text-primary)", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                Start Date *
              </label>
              <input
                type="date" value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                required
                style={{
                  width: "100%", padding: "10px 12px", background: "var(--bg-surface-hover)",
                  border: "1px solid var(--border-subtle)", borderRadius: "8px",
                  color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Frequency Selector */}
          <div style={{ marginTop: "14px" }}>
            <label style={{ color: "var(--text-primary)", fontSize: "12px", display: "block", marginBottom: "8px" }}>
              Recurrence Frequency *
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {FREQ_OPTIONS.map(opt => (
                <button
                  type="button" key={opt.value}
                  onClick={() => setForm(f => ({ ...f, recurrence_frequency: opt.value }))}
                  style={{
                    padding: "10px 16px", borderRadius: "10px",
                    background: form.recurrence_frequency === opt.value
                      ? "linear-gradient(135deg, #7c3aed, #5b21b6)"
                      : "rgba(255,255,255,0.05)",
                    border: form.recurrence_frequency === opt.value
                      ? "1px solid rgba(124,58,237,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary)", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: "6px",
                    transition: "all 0.2s",
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: "14px" }}>
            <label style={{ color: "var(--text-primary)", fontSize: "12px", display: "block", marginBottom: "6px" }}>
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add a note..."
              style={{
                width: "100%", padding: "10px 12px", background: "var(--bg-surface-hover)",
                border: "1px solid var(--border-subtle)", borderRadius: "8px",
                color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
            <button type="submit" disabled={submitting} style={{
              padding: "12px 24px", background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
              border: "none", borderRadius: "10px", color: "var(--text-primary)", cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "14px", opacity: submitting ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: "8px",
              boxShadow: "0 4px 15px rgba(124,58,237,0.35)",
            }}>
              {submitting ? <div className="spinner-sm" /> : "✅"}
              {submitting ? "Adding..." : "Add Recurring Expense"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{
              padding: "12px 18px", background: "var(--bg-surface-hover)",
              border: "1px solid var(--border-subtle)", borderRadius: "10px",
              color: "var(--text-primary)", cursor: "pointer", fontSize: "14px",
            }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔄</div>
          <div style={{ color: "var(--text-primary)", fontSize: "17px", fontWeight: 700, marginBottom: "8px" }}>
            {filter === "all" ? "No Recurring Expenses" : "No items in this filter"}
          </div>
          <div style={{ color: "var(--text-primary)", fontSize: "14px", marginBottom: "20px" }}>
            {filter === "all"
              ? "Add recurring expenses like rent, bills, subscriptions to track them automatically."
              : "Try changing the filter."}
          </div>
          {filter === "all" && (
            <button onClick={() => setShowForm(true)} style={{
              padding: "10px 20px", background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
              border: "none", borderRadius: "10px", color: "var(--text-primary)", cursor: "pointer",
              fontWeight: 700, fontSize: "14px", boxShadow: "0 4px 15px rgba(124,58,237,0.35)",
            }}>
              + Add First Recurring Expense
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(expense => (
            <RecurringCard
              key={expense.id}
              expense={expense}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
