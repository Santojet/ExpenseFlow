import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ExpenseFlow Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "600px",
            width: "100%",
            background: "#1e293b",
            border: "1px solid #ef4444",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            <h2 style={{ color: "#ef4444", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span> Application Notice
            </h2>
            <p style={{ color: "#94a3b8", marginBottom: "16px", fontSize: "0.95rem" }}>
              {this.state.error?.message || "An unexpected error occurred while loading ExpenseFlow Pro."}
            </p>
            {this.state.error?.stack && (
              <pre style={{
                background: "#0f172a",
                color: "#f87171",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                overflowX: "auto",
                maxHeight: "180px",
                marginBottom: "20px"
              }}>
                {this.state.error.stack}
              </pre>
            )}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "#6366f1",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: "none"
                }}
              >
                ↻ Reload Page
              </button>
              <button
                onClick={this.handleClearSession}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);