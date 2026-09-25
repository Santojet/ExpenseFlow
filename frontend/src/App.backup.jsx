import { useState } from "react";

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Login failed"
        );
      }

      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      setLoggedIn(true);
      setShowLogin(false);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage(
        error.message || "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setLoggedIn(false);
    setShowLogin(false);
    setEmail("");
    setPassword("");
  };

  if (loggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.dashboard}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>ExpenseFlow Pro</h1>
              <p style={styles.subtitle}>
                Welcome to your dashboard
              </p>
            </div>

            <button
              onClick={handleLogout}
              style={styles.logoutButton}
            >
              Logout
            </button>
          </div>

          <div style={styles.grid}>
            <div style={styles.statCard}>
              <h3>Total Expenses</h3>
              <p style={styles.amount}>৳ 0.00</p>
            </div>

            <div style={styles.statCard}>
              <h3>Total Income</h3>
              <p style={styles.amount}>৳ 0.00</p>
            </div>

            <div style={styles.statCard}>
              <h3>Balance</h3>
              <p style={styles.amount}>৳ 0.00</p>
            </div>
          </div>

          <div style={styles.welcomeCard}>
            <h2>Dashboard</h2>
            <p>
              Your ExpenseFlow Pro account is ready.
            </p>
            <p>
              Expense, salary, reports and other features
              will be added here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>ExpenseFlow Pro</h1>

          <p style={styles.subtitle}>
            Login to your account
          </p>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email / Username</label>

              <input
                type="text"
                placeholder="Enter email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <button
              type="submit"
              style={styles.loginButton}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {message && (
            <p style={styles.error}>
              {message}
            </p>
          )}

          <button
            onClick={() => {
              setShowLogin(false);
              setMessage("");
            }}
            style={styles.backButton}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>ExpenseFlow Pro</h1>

        <p style={styles.subtitle}>
          Smart Expense Management System
        </p>

        <button
          onClick={() => setShowLogin(true)}
          style={styles.loginButton}
        >
          Login
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f7fb",
    fontFamily: "Arial, sans-serif",
  },

  dashboard: {
    width: "90%",
    maxWidth: "1100px",
    padding: "30px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },

  card: {
    width: "380px",
    padding: "40px",
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
  },

  title: {
    margin: "0 0 10px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "30px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  label: {
    fontWeight: "bold",
  },

  input: {
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
  },

  loginButton: {
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "6px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    cursor: "pointer",
  },

  logoutButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "6px",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
  },

  backButton: {
    width: "100%",
    marginTop: "15px",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#ffffff",
    cursor: "pointer",
  },

  error: {
    marginTop: "20px",
    color: "#dc2626",
    textAlign: "center",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
  },

  statCard: {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
  },

  amount: {
    fontSize: "28px",
    fontWeight: "bold",
  },

  welcomeCard: {
    marginTop: "25px",
    padding: "30px",
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 5px 20px rgba(0, 0, 0, 0.08)",
  },
};

export default App;