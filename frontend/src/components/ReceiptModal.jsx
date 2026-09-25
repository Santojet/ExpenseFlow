export default function ReceiptModal({ receiptUrl, title = "Receipt", onClose }) {
  if (!receiptUrl) return null;

  const isPdf = receiptUrl.toLowerCase().endsWith(".pdf");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="custom-modal-card"
        style={{ maxWidth: "800px", width: "95%", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="custom-modal-header">
          <h3>
            <span>🧾</span>
            {title}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="ghost-btn"
              style={{
                width: "auto",
                padding: "6px 14px",
                fontSize: "12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>↓</span> Download / Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="custom-modal-close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          minHeight: "350px",
          background: "rgba(15, 23, 42, 0.6)"
        }}>
          {isPdf ? (
            <iframe
              src={receiptUrl}
              title="Receipt PDF"
              style={{ width: "100%", height: "600px", border: "1px solid var(--border-subtle)", borderRadius: "8px" }}
            />
          ) : (
            <img
              src={receiptUrl}
              alt="Receipt Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
