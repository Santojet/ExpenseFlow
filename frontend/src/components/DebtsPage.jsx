import { useState, useMemo, useEffect } from "react";
import { playDebtSound } from "../utils/audioFeedback";

export default function DebtsPage({
  debts = [],
  summary = {},
  formatMoney = (v) => `৳ ${Number(v || 0).toLocaleString("en-BD")}`,
  onRefresh = () => {},
  onCreateDebt = async () => {},
  onUpdateDebt = async () => {},
  onRecordPayment = async () => {},
  onDeleteDebt = async () => {},
  openDebtModal = false,
  setOpenDebtModal = () => {},
  t = {},
}) {
  const [filterType, setFilterType] = useState("all"); // "all" | "lent" | "borrowed"
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "pending" | "partial" | "settled"
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [payingDebt, setPayingDebt] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    person_name: "",
    phone: "",
    type: "lent",
    amount: "",
    paid_amount: "0",
    due_date: "",
    notes: "",
  });

  const handleOpenAdd = () => {
    setForm({
      person_name: "",
      phone: "",
      type: "lent",
      amount: "",
      paid_amount: "0",
      due_date: "",
      notes: "",
    });
    setEditingDebt(null);
    setShowAddModal(true);
  };

  useEffect(() => {
    if (openDebtModal) {
      handleOpenAdd();
      if (typeof setOpenDebtModal === "function") {
        setOpenDebtModal(false);
      }
    }
  }, [openDebtModal, setOpenDebtModal]);

  const handleOpenEdit = (debt) => {
    setEditingDebt(debt);
    setForm({
      person_name: debt.person_name || "",
      phone: debt.phone || "",
      type: debt.type || "lent",
      amount: String(debt.amount || ""),
      paid_amount: String(debt.paid_amount || 0),
      due_date: debt.due_date ? debt.due_date.slice(0, 10) : "",
      notes: debt.notes || "",
    });
    setShowAddModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.person_name.trim() || !form.amount) return;

    setSubmitting(true);
    try {
      if (editingDebt) {
        await onUpdateDebt(editingDebt.id, form);
      } else {
        await onCreateDebt(form);
      }
      playDebtSound();
      setShowAddModal(false);
    } catch (err) {
      console.error("Error saving debt:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = (debt) => {
    setPayingDebt(debt);
    setPaymentAmount("");
    setPaymentNote("");
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!payingDebt || !paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setSubmitting(true);
    try {
      await onRecordPayment(payingDebt.id, {
        amount: parseFloat(paymentAmount),
        notes: paymentNote,
      });
      playDebtSound();
      setPayingDebt(null);
    } catch (err) {
      console.error("Error recording payment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      if (filterType !== "all" && d.type !== filterType) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = d.person_name.toLowerCase().includes(q);
        const phoneMatch = (d.phone || "").toLowerCase().includes(q);
        const notesMatch = (d.notes || "").toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [debts, filterType, filterStatus, search]);

  const totalLentPending = summary.total_lent_pending || 0;
  const totalBorrowedPending = summary.total_borrowed_pending || 0;
  const netBalance =
    summary.net_balance !== undefined
      ? summary.net_balance
      : totalLentPending - totalBorrowedPending;

  return (
    <div className="page-container" style={{ width: "100%", maxWidth: "100%" }}>
      {/* Summary Stat Cards */}
      <div className="stats-grid compact">
        <div className="stat-card">
          <div className="stat-icon green">🤝</div>
          <div className="stat-content">
            <span>{t.totalLent || "Total Lent (Receivable)"}</span>
            <strong style={{ color: "var(--success)" }}>{formatMoney(totalLentPending)}</strong>
          </div>
          <div className="stat-shine" />
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div className="stat-content">
            <span>{t.totalBorrowed || "Total Borrowed (Payable)"}</span>
            <strong style={{ color: "var(--warning)" }}>{formatMoney(totalBorrowedPending)}</strong>
          </div>
          <div className="stat-shine" />
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">⚖️</div>
          <div className="stat-content">
            <span>{t.netDebtBalance || "Net Debt Position"}</span>
            <strong style={{ color: netBalance >= 0 ? "var(--success)" : "var(--danger)" }}>
              {netBalance >= 0 ? "+" : ""}
              {formatMoney(netBalance)}
            </strong>
          </div>
          <div className="stat-shine" />
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">▦</div>
          <div className="stat-content">
            <span>Total Records</span>
            <strong>{debts.length}</strong>
          </div>
          <div className="stat-shine" />
        </div>
      </div>

      {/* Main Content Card */}
      <section className="content-card" style={{ width: "100%" }}>
        <div className="card-header">
          <div>
            <h2>{t.debts || "Debts & Loans Management"}</h2>
            <p>{t.debtsSubtitle || "Track money lent to and borrowed from others with repayment records."}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handleOpenAdd}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
            >
              <span>+</span>
              <span>{t.addDebt || "Add Record"}</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`ghost-btn small ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
              style={{ background: filterType === "all" ? "var(--brand-primary)" : "rgba(255,255,255,0.05)", color: "#fff" }}
            >
              {t.filterAll || "All"}
            </button>
            <button
              type="button"
              className={`ghost-btn small ${filterType === "lent" ? "active" : ""}`}
              onClick={() => setFilterType("lent")}
              style={{ background: filterType === "lent" ? "var(--success)" : "rgba(255,255,255,0.05)", color: "#fff" }}
            >
              ↗ {t.filterLent || "Lent (পাবো)"}
            </button>
            <button
              type="button"
              className={`ghost-btn small ${filterType === "borrowed" ? "active" : ""}`}
              onClick={() => setFilterType("borrowed")}
              style={{ background: filterType === "borrowed" ? "var(--warning)" : "rgba(255,255,255,0.05)", color: "#fff" }}
            >
              ↙ {t.filterBorrowed || "Borrowed (দিতে হবে)"}
            </button>
          </div>

          <div className="search-box" style={{ maxWidth: "320px", width: "100%" }}>
            <span>⌕</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search person or notes..."
            />
          </div>
        </div>

        {/* Table Records */}
        {filteredDebts.length > 0 ? (
          <div className="records-table">
            <div className="table-head" style={{ gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr" }}>
              <span>PERSON / ENTITY</span>
              <span>TYPE</span>
              <span>TOTAL AMOUNT</span>
              <span>PAID</span>
              <span>REMAINING</span>
              <span>ACTIONS</span>
            </div>

            {filteredDebts.map((debt) => {
              const isLent = debt.type === "lent";
              const remaining =
                debt.remaining_amount !== undefined
                  ? debt.remaining_amount
                  : Math.max(0, debt.amount - (debt.paid_amount || 0));

              return (
                <div key={debt.id} className="table-row" style={{ gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1fr" }}>
                  <div className="table-title">
                    <div className="table-icon">{isLent ? "↗" : "↙"}</div>
                    <div>
                      <strong>{debt.person_name}</strong>
                      <small>{debt.phone ? `📞 ${debt.phone}` : debt.notes || "No notes"}</small>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: "600",
                        background: isLent ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: isLent ? "var(--success)" : "var(--warning)",
                        border: `1px solid ${isLent ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                      }}
                    >
                      {isLent ? "Lent (পাবো)" : "Borrowed (দিতে হবে)"}
                    </span>
                  </div>

                  <strong style={{ color: "var(--text-primary)" }}>{formatMoney(debt.amount)}</strong>
                  <strong style={{ color: "var(--success)" }}>{formatMoney(debt.paid_amount || 0)}</strong>
                  <strong style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>
                    {formatMoney(remaining)}
                  </strong>

                  <div className="action-buttons">
                    {debt.status !== "settled" && (
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(debt)}
                        className="ghost-btn small"
                        style={{ background: "rgba(16, 185, 129, 0.2)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "4px 8px", fontSize: "11px" }}
                        title="Record Payment"
                      >
                        ৳ Pay
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn edit"
                      onClick={() => handleOpenEdit(debt)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-btn delete"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this debt record?")) {
                          onDeleteDebt(debt.id);
                        }
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
            <span style={{ fontSize: "40px", display: "block", marginBottom: "12px" }}>🤝</span>
            <strong style={{ fontSize: "16px", color: "var(--text-primary)", display: "block" }}>
              {t.noDebtsFound || "No debt or loan records found."}
            </strong>
            <p style={{ fontSize: "13px", marginTop: "4px" }}>
              Keep track of money lent to friends, family, or loans taken.
            </p>
          </div>
        )}
      </section>

      {/* Add / Edit Record Modal */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-surface, #1e293b)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "28px", maxWidth: "520px", width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                {editingDebt ? "Edit Debt / Loan Record" : (t.addDebt || "Add Debt / Loan Record")}
              </h3>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setShowAddModal(false)}
                style={{ fontSize: "18px", padding: "4px 8px" }}
              >
                ×
              </button>
            </div>

            <form className="modern-form" onSubmit={handleSubmitForm}>
              {/* Type Toggle */}
              <div className="form-field full">
                <label>Record Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "lent" })}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: form.type === "lent" ? "2px solid var(--success)" : "1px solid var(--border-subtle)",
                      background: form.type === "lent" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-base)",
                      color: form.type === "lent" ? "var(--success)" : "var(--text-secondary)",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ↗ {t.lentType || "I Lent (পাবো)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: "borrowed" })}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: form.type === "borrowed" ? "2px solid var(--warning)" : "1px solid var(--border-subtle)",
                      background: form.type === "borrowed" ? "rgba(245, 158, 11, 0.15)" : "var(--bg-base)",
                      color: form.type === "borrowed" ? "var(--warning)" : "var(--text-secondary)",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ↙ {t.borrowedType || "I Borrowed (দিতে হবে)"}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>{t.personName || "Person / Entity Name"} *</label>
                <input
                  type="text"
                  required
                  value={form.person_name}
                  onChange={(e) => setForm({ ...form, person_name: e.target.value })}
                  placeholder="e.g. Rahim, Farhan, Shop"
                />
              </div>

              <div className="form-field">
                <label>{t.personPhone || "Phone (Optional)"}</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="017xxxxxxxx"
                />
              </div>

              <div className="form-field">
                <label>{t.amountLabel || "Total Amount (৳)"} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="5000"
                />
              </div>

              <div className="form-field">
                <label>{t.dueDate || "Due Date"}</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>

              <div className="form-field full">
                <label>{t.paidAmount || "Already Paid / Settled (৳)"}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.paid_amount}
                  onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="form-field full">
                <label>Notes / Reference</label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. For medical emergency, promised next month"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  {t.cancel || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                >
                  {submitting ? (t.saving || "Saving...") : editingDebt ? "Save Changes" : (t.addDebt || "Add Record")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {payingDebt && (
        <div
          className="modal-overlay"
          onClick={() => setPayingDebt(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-surface, #1e293b)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "28px", maxWidth: "440px", width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>
                {t.recordPayment || "Record Repayment"}
              </h3>
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => setPayingDebt(null)}
                style={{ fontSize: "18px", padding: "4px 8px" }}
              >
                ×
              </button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border-subtle)", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Person:</span>
                <strong>{payingDebt.person_name}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Amount:</span>
                <span>{formatMoney(payingDebt.amount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Remaining Due:</span>
                <strong style={{ color: "var(--success)" }}>
                  {formatMoney(
                    payingDebt.remaining_amount !== undefined
                      ? payingDebt.remaining_amount
                      : payingDebt.amount - (payingDebt.paid_amount || 0)
                  )}
                </strong>
              </div>
            </div>

            <form className="modern-form" onSubmit={handleSubmitPayment}>
              <div className="form-field full">
                <label>{t.paymentAmount || "Repayment Amount (৳)"} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={
                    payingDebt.remaining_amount !== undefined
                      ? payingDebt.remaining_amount
                      : payingDebt.amount - (payingDebt.paid_amount || 0)
                  }
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter paid amount"
                  style={{ fontSize: "16px", fontWeight: "600" }}
                />
              </div>

              <div className="form-field full">
                <label>{t.paymentNotes || "Payment Note / Method"}</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Paid via bKash / Cash"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setPayingDebt(null)}
                >
                  {t.cancel || "Cancel"}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting}
                >
                  {submitting ? (t.saving || "Saving...") : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
