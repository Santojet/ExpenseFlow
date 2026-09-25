import { useState, useEffect } from "react";

export default function PinLockModal({ isLocked, onUnlock, t = {} }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      const savedPin = localStorage.getItem("ef_pin_code");
      if (savedPin && pin === savedPin) {
        setError(false);
        setPin("");
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 800);
      }
    }
  }, [pin, onUnlock]);

  if (!isLocked) return null;

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="pin-lock-overlay">
      <div className="pin-lock-card">
        {/* Brand & Icon */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <div className="pin-brand-icon">
            🔒
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>ExpenseFlow Pro</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {t.enterPin || "Enter 4-Digit Security PIN"}
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div className="pin-dots-container">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`pin-dot ${idx < pin.length ? (error ? "error" : "filled") : ""}`}
            />
          ))}
        </div>

        {error && (
          <p style={{ fontSize: "12px", color: "var(--danger)", fontWeight: "500", marginTop: "-12px" }}>
            {t.pinIncorrect || "Incorrect PIN. Try again."}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(String(digit))}
              className="pin-key-btn"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="pin-key-btn"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="pin-key-btn backspace"
            aria-label="Delete"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
