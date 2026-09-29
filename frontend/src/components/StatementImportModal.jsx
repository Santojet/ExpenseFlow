import { useState, useRef } from "react";
import { parseTransactionSms } from "../utils/smsParser";
import { playSuccessChime } from "../utils/audioFeedback";
import { API } from "../App";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  "Content-Type": "application/json",
});

export default function StatementImportModal({ isOpen, onClose, onImportSuccess, t = {} }) {
  const [inputText, setInputText] = useState("");
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleParse = () => {
    setError("");
    const lines = inputText.split("\n").filter(l => l.trim().length > 10);
    const results = [];
    
    for (const line of lines) {
      // Basic CSV/TSV naive parsing fallback, but prefer SMS parse
      const smsParsed = parseTransactionSms(line);
      if (smsParsed) {
        results.push({
          ...smsParsed,
          expense_date: new Date().toISOString().slice(0, 10), // Default to today
        });
      } else {
        // Try naive CSV parsing for statement (Date, Title, Amount, Category)
        const parts = line.split(/[\t,]/).map(p => p.trim());
        if (parts.length >= 3) {
          const amount = parseFloat(parts.find(p => !isNaN(p) && parseFloat(p) > 0) || 0);
          if (amount > 0) {
            results.push({
              title: parts[1] || "Imported Expense",
              amount,
              category: parts.length > 3 ? parts[3] : "Other",
              expense_date: new Date().toISOString().slice(0, 10),
            });
          }
        }
      }
    }

    if (results.length === 0) {
      setError("Could not extract any valid transactions from the input. Please check the format.");
    } else {
      setParsedTransactions(results);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setInputText(evt.target.result);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedTransactions.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/expenses/batch`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ expenses: parsedTransactions }),
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        playSuccessChime();
        onImportSuccess?.(json.count);
        onClose();
      } else {
        setError(json.message || "Import failed");
      }
    } catch (err) {
      setError("Network error occurred during import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="custom-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "650px", width: "100%" }}>
        {/* Header */}
        <div className="custom-modal-header">
          <h3>
            <span>📥</span>
            Batch Auto-Import
          </h3>
          <button type="button" onClick={onClose} className="custom-modal-close">✕</button>
        </div>

        {/* Body */}
        <div className="custom-modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {parsedTransactions.length === 0 ? (
            <>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "16px" }}>
                Paste multiple SMS messages or a CSV statement (Date, Title, Amount, Category) to auto-import them as expenses.
              </p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <button 
                  className="ghost-btn" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: "1px dashed var(--brand-primary)", color: "var(--brand-primary)", padding: "8px 16px" }}
                >
                  📄 Upload CSV/TXT
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.txt" 
                  style={{ display: "none" }} 
                />
              </div>

              <textarea
                rows="8"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setError("");
                }}
                placeholder="Paste SMS messages (one per line) or CSV data here..."
                style={{ 
                  width: "100%", padding: "12px", background: "var(--bg-surface)", 
                  border: "1px solid var(--border-subtle)", borderRadius: "8px", 
                  color: "var(--text-primary)", fontSize: "13px", resize: "vertical" 
                }}
              />
              
              {error && <div style={{ marginTop: "12px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>}
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <strong style={{ color: "var(--success)" }}>✓ Found {parsedTransactions.length} transactions</strong>
                <button 
                  className="ghost-btn small" 
                  onClick={() => { setParsedTransactions([]); setError(""); }}
                >
                  ← Edit Input
                </button>
              </div>

              {error && <div style={{ marginBottom: "12px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {parsedTransactions.map((tx, idx) => (
                  <div key={idx} style={{ 
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "var(--bg-surface)", padding: "12px 16px", 
                    borderRadius: "8px", border: "1px solid var(--border-subtle)"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{tx.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {tx.category} • {tx.expense_date}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--danger)" }}>
                      ৳{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="custom-modal-footer">
          <button type="button" onClick={onClose} className="ghost-btn">
            Cancel
          </button>
          
          {parsedTransactions.length === 0 ? (
            <button 
              type="button" 
              onClick={handleParse} 
              disabled={!inputText.trim()} 
              className="primary-btn"
            >
              Parse Data
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleImport} 
              disabled={loading}
              className="primary-btn" 
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {loading ? "Importing..." : `Confirm & Import ${parsedTransactions.length} items`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
