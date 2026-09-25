import { useState } from "react";
import { parseTransactionSms } from "../utils/smsParser";
import { playSuccessChime } from "../utils/audioFeedback";

export default function SmsParserModal({ isOpen, onClose, onParsedExpense, t = {} }) {
  const [smsText, setSmsText] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleParse = () => {
    setError("");
    const result = parseTransactionSms(smsText);
    if (!result) {
      setError(t.invalidSms || "Could not detect transaction amount from this text. Please check the SMS.");
      setParsedData(null);
      return;
    }
    setParsedData(result);
  };

  const handleApply = () => {
    if (!parsedData) return;
    playSuccessChime();
    onParsedExpense(parsedData);
    onClose();
  };

  const sampleSms = [
    {
      label: "bKash In",
      text: "You have received Tk 2,500.00 from 01712345678. Ref: Gift. Fee Tk 0.00. Balance Tk 12,500.00. TrxID 9H87G65",
    },
    {
      label: "bKash Pay",
      text: "Payment Tk 650.00 to Agora Superstore successful. Fee Tk 0.00. Balance Tk 4,200.00. TrxID 8A76B54",
    },
    {
      label: "Nagad Out",
      text: "Cash Out of Tk 1,000.00 from 01887654321 is successful. Fee Tk 15.00. TxnID: 71AF99B",
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="custom-modal-header">
          <h3>
            <span>⚡</span>
            {t.smsParserTitle || "Smart SMS Parser"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="custom-modal-close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="custom-modal-body">
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            {t.smsParserDesc || "Paste a transaction SMS from bKash, Nagad, Rocket, or your Bank. We will auto-extract the amount, category, and reference."}
          </p>

          <div className="form-field" style={{ marginBottom: 0 }}>
            <textarea
              rows="4"
              value={smsText}
              onChange={(e) => {
                setSmsText(e.target.value);
                if (error) setError("");
              }}
              placeholder={t.smsPlaceholder || "Paste your SMS message here..."}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {/* Quick Samples */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Quick test:</span>
            {sampleSms.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSmsText(s.text);
                  const res = parseTransactionSms(s.text);
                  setParsedData(res);
                  setError("");
                }}
                className="ghost-btn"
                style={{
                  width: "auto",
                  padding: "4px 10px",
                  fontSize: "12px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.04)"
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "var(--danger)",
              fontSize: "13px"
            }}>
              {error}
            </div>
          )}

          {/* Extracted Details Preview */}
          {parsedData && (
            <div style={{
              padding: "14px",
              borderRadius: "10px",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--brand-primary)", textTransform: "uppercase", fontSize: "11px", letterSpacing: "1px" }}>
                  ✓ Extracted ({parsedData.provider})
                </strong>
                <strong style={{ color: "var(--success)", fontSize: "18px" }}>
                  ৳ {Number(parsedData.amount).toLocaleString()}
                </strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", color: "var(--text-secondary)" }}>
                <div><span style={{ opacity: 0.7 }}>Title:</span> <span style={{ color: "var(--text-primary)" }}>{parsedData.title}</span></div>
                <div><span style={{ opacity: 0.7 }}>Category:</span> <span style={{ color: "var(--text-primary)" }}>{parsedData.category}</span></div>
                {parsedData.trxId && <div><span style={{ opacity: 0.7 }}>TrxID:</span> <span style={{ color: "var(--text-primary)" }}>{parsedData.trxId}</span></div>}
                {parsedData.fee > 0 && <div><span style={{ opacity: 0.7 }}>Fee:</span> <span style={{ color: "var(--text-primary)" }}>৳ {parsedData.fee}</span></div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="custom-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="ghost-btn"
            style={{ width: "auto", padding: "10px 18px" }}
          >
            {t.cancel || "Cancel"}
          </button>
          {!parsedData ? (
            <button
              type="button"
              onClick={handleParse}
              disabled={!smsText.trim()}
              className="primary-btn"
              style={{ width: "auto", padding: "10px 20px" }}
            >
              ⚡ Parse SMS
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="primary-btn"
              style={{
                width: "auto",
                padding: "10px 20px",
                background: "linear-gradient(135deg, #10b981, #059669)"
              }}
            >
              ✓ {t.extractAndAdd || "Apply to Expense"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
