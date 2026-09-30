import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://expenseflow-api-56ap.onrender.com" : "http://127.0.0.1:5000");

const COLORS = [
  "#7c3aed",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#3b82f6",
  "#64748b",
];

const NAV_ITEMS = [
  { id: "dashboard", icon: "⌂", label: "Dashboard" },
  { id: "expenses", icon: "↘", label: "Expenses" },
  { id: "salary", icon: "৳", label: "Salary" },
  { id: "reports", icon: "◫", label: "Reports" },
];

function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  const [activePage, setActivePage] = useState("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [users, setUsers] = useState([]);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("All");
  const [userSearch, setUserSearch] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "Utilities",
    expense_date: "",
    description: "",
  });

  const [salaryForm, setSalaryForm] = useState({
    amount: "",
    salary_month: "",
    payment_date: "",
    status: "paid",
    description: "",
  });

  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "user",
  });

  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);

  useEffect(() => {
    if (loggedIn) {
      loadAllData();
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [message]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  });

  const notify = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const safeJson = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadExpenses(),
      loadSalaries(),
      checkAdmin(),
    ]);
  };

  const loadExpenses = async () => {
    try {
      const response = await fetch(`${API}/api/expenses`, {
        headers: authHeaders(),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load expenses");
      }

      setExpenses(data.expenses || []);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const loadSalaries = async () => {
    try {
      const response = await fetch(`${API}/api/salaries`, {
        headers: authHeaders(),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load salaries");
      }

      setSalaries(data.salaries || []);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const checkAdmin = async () => {
    try {
      const response = await fetch(`${API}/api/admin/users`, {
        headers: authHeaders(),
      });

      const data = await safeJson(response);

      if (response.ok && data.success) {
        setIsAdmin(true);
        setUsers(data.users || []);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API}/api/admin/users`, {
        headers: authHeaders(),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load users");
      }

      setUsers(data.users || []);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      notify("Please enter your email and password.", "error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);

      setLoggedIn(true);
      setPassword("");
      notify("Welcome back! Login successful.");
    } catch (error) {
      notify(error.message || "Unable to connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");

    setLoggedIn(false);
    setIsAdmin(false);
    setExpenses([]);
    setSalaries([]);
    setUsers([]);
    setActivePage("dashboard");
    setMessage("");
  };

  const handleExpenseChange = (e) => {
    setExpenseForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSalaryChange = (e) => {
    setSalaryForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUserChange = (e) => {
    setUserForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      amount: "",
      category: "Utilities",
      expense_date: "",
      description: "",
    });

    setEditingExpenseId(null);
  };

  const resetSalaryForm = () => {
    setSalaryForm({
      amount: "",
      salary_month: "",
      payment_date: "",
      status: "paid",
      description: "",
    });

    setEditingSalaryId(null);
  };

  const resetUserForm = () => {
    setUserForm({
      username: "",
      email: "",
      full_name: "",
      password: "",
      role: "user",
    });

    setEditingUserId(null);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();

    if (!expenseForm.title || !expenseForm.amount || !expenseForm.expense_date) {
      notify("Please fill in the required expense fields.", "error");
      return;
    }

    setLoading(true);

    try {
      const url = editingExpenseId
        ? `${API}/api/expenses/${editingExpenseId}`
        : `${API}/api/expenses`;

      const response = await fetch(url, {
        method: editingExpenseId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Operation failed");
      }

      notify(
        editingExpenseId
          ? "Expense updated successfully."
          : "Expense added successfully."
      );

      resetExpenseForm();
      await loadExpenses();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);

    setExpenseForm({
      title: expense.title || "",
      amount: expense.amount || "",
      category: expense.category || "Other",
      expense_date: expense.expense_date || "",
      description: expense.description || "",
    });

    setActivePage("expenses");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense permanently?")) return;

    try {
      const response = await fetch(`${API}/api/expenses/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      notify("Expense deleted successfully.");
      await loadExpenses();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleSalarySubmit = async (e) => {
    e.preventDefault();

    if (!salaryForm.amount || !salaryForm.salary_month) {
      notify("Please enter salary amount and month.", "error");
      return;
    }

    setLoading(true);

    try {
      const url = editingSalaryId
        ? `${API}/api/salaries/${editingSalaryId}`
        : `${API}/api/salaries`;

      const response = await fetch(url, {
        method: editingSalaryId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          ...salaryForm,
          amount: Number(salaryForm.amount),
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Salary operation failed");
      }

      notify(
        editingSalaryId
          ? "Salary updated successfully."
          : "Salary added successfully."
      );

      resetSalaryForm();
      await loadSalaries();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSalary = (salary) => {
    setEditingSalaryId(salary.id);

    setSalaryForm({
      amount: salary.amount || "",
      salary_month: salary.salary_month || "",
      payment_date: salary.payment_date || "",
      status: salary.status || "paid",
      description: salary.description || "",
    });

    setActivePage("salary");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDeleteSalary = async (id) => {
    if (!window.confirm("Delete this salary record permanently?")) return;

    try {
      const response = await fetch(`${API}/api/salaries/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Delete failed");
      }

      notify("Salary record deleted.");
      await loadSalaries();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();

    if (!userForm.username || !userForm.email || !userForm.full_name) {
      notify("Please complete the user information.", "error");
      return;
    }

    setLoading(true);

    try {
      const url = editingUserId
        ? `${API}/api/admin/users/${editingUserId}`
        : `${API}/api/admin/users`;

      const body = { ...userForm };

      if (editingUserId && !body.password) {
        delete body.password;
      }

      const response = await fetch(url, {
        method: editingUserId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "User operation failed");
      }

      notify(
        editingUserId
          ? "User updated successfully."
          : "User created successfully."
      );

      resetUserForm();
      await loadUsers();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUserId(user.id);

    setUserForm({
      username: user.username || "",
      email: user.email || "",
      full_name: user.full_name || "",
      password: "",
      role: user.role || "user",
    });

    setActivePage("admin");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const toggleUserStatus = async (user) => {
    try {
      const response = await fetch(`${API}/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          is_active: !user.is_active,
        }),
      });

      const data = await safeJson(response);

      if (!response.ok) {
        throw new Error(data.message || "Status update failed");
      }

      notify(
        user.is_active
          ? "User deactivated."
          : "User activated."
      );

      await loadUsers();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const totalSalary = salaries.reduce(
    (sum, salary) => sum + Number(salary.amount || 0),
    0
  );

  const paidSalary = salaries
    .filter((salary) => salary.status === "paid")
    .reduce((sum, salary) => sum + Number(salary.amount || 0), 0);

  const pendingSalary = salaries
    .filter((salary) => salary.status === "pending")
    .reduce((sum, salary) => sum + Number(salary.amount || 0), 0);

  const netBalance = totalSalary - totalExpenses;

  const averageExpense =
    expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const savingsRate =
    totalSalary > 0
      ? Math.max(0, Math.min(100, (netBalance / totalSalary) * 100))
      : 0;

  const categoryData = useMemo(() => {
    const grouped = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      grouped[category] =
        (grouped[category] || 0) +
        Number(expense.amount || 0);
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const timelineData = useMemo(() => {
    const grouped = {};

    expenses.forEach((expense) => {
      const date = expense.expense_date;

      if (!date) return;

      grouped[date] =
        (grouped[date] || 0) +
        Number(expense.amount || 0);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, amount]) => ({
        date,
        amount,
      }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const query = expenseSearch.toLowerCase();

      const matchesSearch =
        !query ||
        expense.title?.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query);

      const matchesCategory =
        expenseCategory === "All" ||
        expense.category === expenseCategory;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, expenseSearch, expenseCategory]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = userSearch.toLowerCase();

      if (!query) return true;

      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
    });
  }, [users, userSearch]);

  const formatMoney = (value) =>
    `৳ ${Number(value || 0).toLocaleString("en-BD")}`;

  if (!loggedIn) {
    return (
      <div className="login-shell">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />

        <div className="login-layout">
          <div className="login-showcase">
            <div className="showcase-brand">
              <div className="logo-mark">EF</div>

              <div>
                <strong>ExpenseFlow</strong>
                <span>PRO</span>
              </div>
            </div>

            <div className="showcase-content">
              <span className="eyebrow">PERSONAL FINANCE</span>

              <h1>
                Your money.
                <br />
                <em>Your control.</em>
              </h1>

              <p>
                A beautifully organized workspace for
                expenses, salary and smarter financial decisions.
              </p>

              <div className="showcase-points">
                <div>
                  <span>✓</span>
                  <p>Track every expense</p>
                </div>

                <div>
                  <span>✓</span>
                  <p>Understand your spending</p>
                </div>

                <div>
                  <span>✓</span>
                  <p>Keep your financial life organized</p>
                </div>
              </div>
            </div>

            <div className="showcase-footer">
              <span className="online-dot" />
              Secure financial workspace
            </div>
          </div>

          <div className="login-panel">
            <div className="login-panel-inner">
              <div className="mobile-brand">
                <div className="logo-mark">EF</div>
                <strong>ExpenseFlow <span>PRO</span></strong>
              </div>

              <span className="login-label">WELCOME BACK</span>

              <h2>Sign in to your workspace</h2>

              <p className="login-subtitle">
                Enter your credentials to continue.
              </p>

              <form className="login-form" onSubmit={handleLogin}>
                <Field
                  label="Email or username"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@expenseflow.local"
                />

                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />

                <button
                  className="primary-btn login-btn"
                  disabled={loading}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <span className="btn-arrow">→</span>
                    </>
                  )}
                </button>
              </form>

              {message && (
                <div
                  className={`login-message ${
                    messageType === "error" ? "error" : ""
                  }`}
                >
                  <span>{messageType === "error" ? "!" : "✓"}</span>
                  {message}
                </div>
              )}

              <div className="login-security">
                <span>⌁</span>
                Protected workspace
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageMeta = {
    dashboard: {
      title: "Good to see you.",
      subtitle: "Here’s your financial snapshot for today.",
    },
    expenses: {
      title: "Expenses",
      subtitle: "Track where your money is going.",
    },
    salary: {
      title: "Salary",
      subtitle: "Keep your income records organized.",
    },
    reports: {
      title: "Reports",
      subtitle: "Understand your financial patterns.",
    },
    admin: {
      title: "Admin Control",
      subtitle: "Manage your organization and users.",
    },
  };

  const currentPage = pageMeta[activePage];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="brand-mark">EF</div>

            <div className="brand-text">
              <strong>ExpenseFlow</strong>
              <span>PRO</span>
            </div>
          </div>

          <div className="workspace-label">WORKSPACE</div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => setActivePage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>

                {activePage === item.id && (
                  <span className="nav-arrow">›</span>
                )}
              </button>
            ))}

            {isAdmin && (
              <>
                <div className="nav-divider" />

                <button
                  className={`nav-item ${
                    activePage === "admin" ? "active" : ""
                  }`}
                  onClick={() => {
                    setActivePage("admin");
                    loadUsers();
                  }}
                >
                  <span className="nav-icon">⚙</span>
                  <span>Admin</span>

                  {activePage === "admin" && (
                    <span className="nav-arrow">›</span>
                  )}
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="online-dot" />

            <div>
              <strong>System Online</strong>
              <small>Everything is running</small>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">A</div>

            <div className="profile-info">
              <strong>Administrator</strong>
              <span>{isAdmin ? "Admin account" : "User account"}</span>
            </div>

            <button
              className="logout-icon"
              onClick={handleLogout}
              title="Logout"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div>
            <div className="breadcrumb">
              ExpenseFlow <span>/</span> {currentPage.title}
            </div>

            <h1>{currentPage.title}</h1>
            <p>{currentPage.subtitle}</p>
          </div>

          <div className="header-actions">
            <div className="header-date">
              <span>Today</span>
              <strong>
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
            </div>

            <div className="header-avatar">A</div>
          </div>
        </header>

        {message && (
          <div
            className={`toast ${
              messageType === "error" ? "toast-error" : ""
            }`}
          >
            <span>{messageType === "error" ? "!" : "✓"}</span>
            {message}

            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {activePage === "dashboard" && (
          <Dashboard
            expenses={expenses}
            totalExpenses={totalExpenses}
            totalSalary={totalSalary}
            paidSalary={paidSalary}
            pendingSalary={pendingSalary}
            netBalance={netBalance}
            savingsRate={savingsRate}
            formatMoney={formatMoney}
            setActivePage={setActivePage}
            loadExpenses={loadExpenses}
          />
        )}

        {activePage === "expenses" && (
          <ExpensesPage
            expenses={filteredExpenses}
            totalExpenses={totalExpenses}
            averageExpense={averageExpense}
            expenseForm={expenseForm}
            editingExpenseId={editingExpenseId}
            loading={loading}
            expenseSearch={expenseSearch}
            setExpenseSearch={setExpenseSearch}
            expenseCategory={expenseCategory}
            setExpenseCategory={setExpenseCategory}
            handleExpenseChange={handleExpenseChange}
            handleExpenseSubmit={handleExpenseSubmit}
            handleEditExpense={handleEditExpense}
            handleDeleteExpense={handleDeleteExpense}
            resetExpenseForm={resetExpenseForm}
            loadExpenses={loadExpenses}
            formatMoney={formatMoney}
          />
        )}

        {activePage === "salary" && (
          <SalaryPage
            salaries={salaries}
            totalSalary={totalSalary}
            paidSalary={paidSalary}
            pendingSalary={pendingSalary}
            salaryForm={salaryForm}
            editingSalaryId={editingSalaryId}
            loading={loading}
            handleSalaryChange={handleSalaryChange}
            handleSalarySubmit={handleSalarySubmit}
            handleEditSalary={handleEditSalary}
            handleDeleteSalary={handleDeleteSalary}
            resetSalaryForm={resetSalaryForm}
            loadSalaries={loadSalaries}
            formatMoney={formatMoney}
          />
        )}

        {activePage === "reports" && (
          <ReportsPage
            totalExpenses={totalExpenses}
            totalSalary={totalSalary}
            paidSalary={paidSalary}
            pendingSalary={pendingSalary}
            netBalance={netBalance}
            categoryData={categoryData}
            timelineData={timelineData}
            formatMoney={formatMoney}
          />
        )}

        {activePage === "admin" && isAdmin && (
          <AdminPage
            users={filteredUsers}
            totalUsers={users.length}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userForm={userForm}
            editingUserId={editingUserId}
            loading={loading}
            handleUserChange={handleUserChange}
            handleUserSubmit={handleUserSubmit}
            handleEditUser={handleEditUser}
            toggleUserStatus={toggleUserStatus}
            resetUserForm={resetUserForm}
            loadUsers={loadUsers}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  expenses,
  totalExpenses,
  totalSalary,
  paidSalary,
  pendingSalary,
  netBalance,
  savingsRate,
  formatMoney,
  setActivePage,
  loadExpenses,
}) {
  const recentExpenses = expenses.slice(0, 5);

  const categoryData = useMemo(() => {
    const grouped = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      grouped[category] =
        (grouped[category] || 0) +
        Number(expense.amount || 0);
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const paidPercentage =
    totalSalary > 0
      ? Math.round((paidSalary / totalSalary) * 100)
      : 0;

  return (
    <div className="page-container">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-label">FINANCIAL OVERVIEW</span>

          <h2>
            Your money,
            <br />
            beautifully organized.
          </h2>

          <p>
            Keep an eye on income, expenses and your overall
            financial health from one simple workspace.
          </p>

          <div className="hero-actions">
            <button
              className="primary-btn"
              onClick={() => setActivePage("expenses")}
            >
              + Add Expense
            </button>

            <button
              className="ghost-btn hero-ghost"
              onClick={() => setActivePage("reports")}
            >
              View Reports →
            </button>
          </div>
        </div>

        <div className="hero-balance">
          <span>NET BALANCE</span>

          <strong>{formatMoney(netBalance)}</strong>

          <div className="balance-line">
            <div
              style={{
                width: `${Math.max(4, Math.min(100, savingsRate))}%`,
              }}
            />
          </div>

          <small>{savingsRate.toFixed(0)}% of salary remaining</small>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard
          icon="↘"
          label="Total Expenses"
          value={formatMoney(totalExpenses)}
          tone="purple"
        />

        <StatCard
          icon="৳"
          label="Total Salary"
          value={formatMoney(totalSalary)}
          tone="green"
        />

        <StatCard
          icon="◫"
          label="Transactions"
          value={expenses.length}
          tone="blue"
        />

        <StatCard
          icon="✓"
          label="Paid Salary"
          value={formatMoney(paidSalary)}
          tone="orange"
        />
      </div>

      <div className="dashboard-grid">
        <section className="content-card large">
          <CardHeader
            title="Recent expenses"
            subtitle="Your latest financial activity"
            action={
              <button
                className="text-btn"
                onClick={() => setActivePage("expenses")}
              >
                View all →
              </button>
            }
          />

          {recentExpenses.length > 0 ? (
            <div className="transaction-list">
              {recentExpenses.map((expense) => (
                <div className="transaction" key={expense.id}>
                  <div className="transaction-icon">
                    {getCategoryIcon(expense.category)}
                  </div>

                  <div className="transaction-main">
                    <strong>{expense.title}</strong>
                    <span>
                      {expense.category} · {expense.expense_date}
                    </span>
                  </div>

                  <strong className="transaction-amount expense-amount">
                    - {formatMoney(expense.amount)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="◫"
              title="No expenses yet"
              text="Your recent transactions will appear here."
              action={
                <button
                  className="primary-btn small"
                  onClick={() => setActivePage("expenses")}
                >
                  Add your first expense
                </button>
              }
            />
          )}

          {expenses.length > 0 && (
            <button className="refresh-link" onClick={loadExpenses}>
              ↻ Refresh data
            </button>
          )}
        </section>

        <section className="content-card">
          <CardHeader
            title="Salary status"
            subtitle="Current income position"
          />

          <div
            className="salary-ring"
            style={{
              background: `conic-gradient(#10b981 ${
                paidPercentage * 3.6
              }deg, #edf2f7 0deg)`,
            }}
          >
            <div className="ring-inner">
              <strong>{paidPercentage}%</strong>
              <span>paid</span>
            </div>
          </div>

          <div className="mini-stats">
            <div>
              <span>
                <i className="dot green" />
                Paid
              </span>

              <strong>{formatMoney(paidSalary)}</strong>
            </div>

            <div>
              <span>
                <i className="dot orange" />
                Pending
              </span>

              <strong>{formatMoney(pendingSalary)}</strong>
            </div>
          </div>
        </section>

        <section className="content-card">
          <CardHeader
            title="Expense categories"
            subtitle="Where your money goes"
          />

          {categoryData.length > 0 ? (
            <>
              <div className="mini-donut">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => formatMoney(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="category-list">
                {categoryData.slice(0, 4).map((item, index) => (
                  <div key={item.name}>
                    <span>
                      <i
                        className="category-dot"
                        style={{
                          background:
                            COLORS[index % COLORS.length],
                        }}
                      />

                      {item.name}
                    </span>

                    <strong>{formatMoney(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon="◌"
              title="No category data"
              text="Add expenses to see the breakdown."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ExpensesPage({
  expenses,
  totalExpenses,
  averageExpense,
  expenseForm,
  editingExpenseId,
  loading,
  expenseSearch,
  setExpenseSearch,
  expenseCategory,
  setExpenseCategory,
  handleExpenseChange,
  handleExpenseSubmit,
  handleEditExpense,
  handleDeleteExpense,
  resetExpenseForm,
  loadExpenses,
  formatMoney,
}) {
  const categories = [
    "All",
    "Utilities",
    "Food",
    "Transport",
    "Office",
    "Shopping",
    "Entertainment",
    "Medical",
    "Other",
  ];

  return (
    <div className="page-container">
      <div className="stats-grid compact">
        <StatCard
          icon="↘"
          label="Total Expenses"
          value={formatMoney(totalExpenses)}
          tone="purple"
        />

        <StatCard
          icon="◫"
          label="Transactions"
          value={expenses.length}
          tone="blue"
        />

        <StatCard
          icon="≈"
          label="Average Expense"
          value={formatMoney(averageExpense)}
          tone="orange"
        />

        <StatCard
          icon="▦"
          label="Categories"
          value={new Set(expenses.map((e) => e.category)).size}
          tone="green"
        />
      </div>

      <section className="content-card form-card">
        <CardHeader
          title={editingExpenseId ? "Edit expense" : "Add new expense"}
          subtitle="Record and manage your spending"
          action={
            editingExpenseId ? (
              <button className="ghost-btn" onClick={resetExpenseForm}>
                Cancel
              </button>
            ) : null
          }
        />

        <form className="modern-form" onSubmit={handleExpenseSubmit}>
          <Field
            label="Expense title"
            name="title"
            value={expenseForm.title}
            onChange={handleExpenseChange}
            placeholder="Internet Bill"
          />

          <Field
            label="Amount"
            name="amount"
            type="number"
            min="0"
            value={expenseForm.amount}
            onChange={handleExpenseChange}
            placeholder="5000"
          />

          <SelectField
            label="Category"
            name="category"
            value={expenseForm.category}
            onChange={handleExpenseChange}
            options={categories.slice(1)}
          />

          <Field
            label="Expense date"
            name="expense_date"
            type="date"
            value={expenseForm.expense_date}
            onChange={handleExpenseChange}
          />

          <div className="form-field full">
            <label>Description</label>

            <textarea
              name="description"
              value={expenseForm.description}
              onChange={handleExpenseChange}
              placeholder="Add a note about this expense..."
            />
          </div>

          <div className="form-submit">
            <button className="primary-btn" disabled={loading}>
              {loading
                ? "Saving..."
                : editingExpenseId
                ? "Update Expense"
                : "+ Add Expense"}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader
          title="Expense records"
          subtitle={`${expenses.length} transaction${
            expenses.length === 1 ? "" : "s"
          }`}
          action={
            <button className="ghost-btn" onClick={loadExpenses}>
              ↻ Refresh
            </button>
          }
        />

        <div className="filter-bar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              placeholder="Search expenses..."
            />
          </div>

          <select
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            className="filter-select"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {expenses.length > 0 ? (
          <div className="records-table">
            <div className="table-head">
              <span>EXPENSE</span>
              <span>CATEGORY</span>
              <span>DATE</span>
              <span>AMOUNT</span>
              <span>ACTIONS</span>
            </div>

            {expenses.map((expense) => (
              <div className="table-row" key={expense.id}>
                <div className="table-title">
                  <div className="table-icon">
                    {getCategoryIcon(expense.category)}
                  </div>

                  <div>
                    <strong>{expense.title}</strong>
                    <small>
                      {expense.description || "No description"}
                    </small>
                  </div>
                </div>

                <span className="category-badge">
                  {expense.category}
                </span>

                <span className="muted">
                  {expense.expense_date}
                </span>

                <strong className="amount-negative">
                  - {formatMoney(expense.amount)}
                </strong>

                <div className="action-buttons">
                  <button
                    type="button"
                    className="icon-btn edit"
                    onClick={() => handleEditExpense(expense)}
                    title="Edit"
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    className="icon-btn delete"
                    onClick={() =>
                      handleDeleteExpense(expense.id)
                    }
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="◫"
            title="No matching expenses"
            text="Try another search or add a new expense."
          />
        )}
      </section>
    </div>
  );
}

function SalaryPage({
  salaries,
  totalSalary,
  paidSalary,
  pendingSalary,
  salaryForm,
  editingSalaryId,
  loading,
  handleSalaryChange,
  handleSalarySubmit,
  handleEditSalary,
  handleDeleteSalary,
  resetSalaryForm,
  loadSalaries,
  formatMoney,
}) {
  return (
    <div className="page-container">
      <div className="stats-grid compact">
        <StatCard
          icon="৳"
          label="Total Salary"
          value={formatMoney(totalSalary)}
          tone="green"
        />

        <StatCard
          icon="✓"
          label="Paid Salary"
          value={formatMoney(paidSalary)}
          tone="blue"
        />

        <StatCard
          icon="◷"
          label="Pending Salary"
          value={formatMoney(pendingSalary)}
          tone="orange"
        />

        <StatCard
          icon="◫"
          label="Salary Records"
          value={salaries.length}
          tone="purple"
        />
      </div>

      <section className="content-card form-card">
        <CardHeader
          title={editingSalaryId ? "Edit salary" : "Add new salary"}
          subtitle="Track monthly income records"
          action={
            editingSalaryId ? (
              <button className="ghost-btn" onClick={resetSalaryForm}>
                Cancel
              </button>
            ) : null
          }
        />

        <form className="modern-form" onSubmit={handleSalarySubmit}>
          <Field
            label="Salary amount"
            name="amount"
            type="number"
            min="0"
            value={salaryForm.amount}
            onChange={handleSalaryChange}
            placeholder="30000"
          />

          <Field
            label="Salary month"
            name="salary_month"
            type="date"
            value={salaryForm.salary_month}
            onChange={handleSalaryChange}
          />

          <Field
            label="Payment date"
            name="payment_date"
            type="date"
            value={salaryForm.payment_date}
            onChange={handleSalaryChange}
            required={false}
          />

          <SelectField
            label="Payment status"
            name="status"
            value={salaryForm.status}
            onChange={handleSalaryChange}
            options={[
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
            ]}
          />

          <div className="form-field full">
            <label>Description</label>

            <textarea
              name="description"
              value={salaryForm.description}
              onChange={handleSalaryChange}
              placeholder="August 2026 Salary"
            />
          </div>

          <div className="form-submit">
            <button className="primary-btn" disabled={loading}>
              {loading
                ? "Saving..."
                : editingSalaryId
                ? "Update Salary"
                : "+ Add Salary"}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader
          title="Salary records"
          subtitle={`${salaries.length} record${
            salaries.length === 1 ? "" : "s"
          }`}
          action={
            <button className="ghost-btn" onClick={loadSalaries}>
              ↻ Refresh
            </button>
          }
        />

        {salaries.length > 0 ? (
          <div className="salary-list">
            {salaries.map((salary) => (
              <div className="salary-record" key={salary.id}>
                <div className="salary-record-icon">৳</div>

                <div className="salary-record-main">
                  <strong>
                    {salary.description || "Salary Record"}
                  </strong>

                  <span>
                    Salary month: {salary.salary_month}
                  </span>

                  <small>
                    Payment date:{" "}
                    {salary.payment_date || "Not paid yet"}
                  </small>
                </div>

                <div className="salary-record-right">
                  <span
                    className={
                      salary.status === "paid"
                        ? "status-badge paid"
                        : "status-badge pending"
                    }
                  >
                    {(salary.status || "pending").toUpperCase()}
                  </span>

                  <strong>{formatMoney(salary.amount)}</strong>

                  <div className="action-buttons">
                    <button
                      type="button"
                      className="icon-btn edit"
                      onClick={() => handleEditSalary(salary)}
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      className="icon-btn delete"
                      onClick={() =>
                        handleDeleteSalary(salary.id)
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="৳"
            title="No salary records"
            text="Add your first salary record to start tracking income."
          />
        )}
      </section>
    </div>
  );
}

function ReportsPage({
  totalExpenses,
  totalSalary,
  paidSalary,
  pendingSalary,
  netBalance,
  categoryData,
  timelineData,
  formatMoney,
}) {
  const comparisonData = [
    {
      name: "Overview",
      Salary: totalSalary,
      Expenses: totalExpenses,
    },
  ];

  return (
    <div className="page-container">
      <div className="stats-grid">
        <StatCard
          icon="৳"
          label="Total Salary"
          value={formatMoney(totalSalary)}
          tone="green"
        />

        <StatCard
          icon="↘"
          label="Total Expenses"
          value={formatMoney(totalExpenses)}
          tone="purple"
        />

        <StatCard
          icon="◈"
          label="Net Balance"
          value={formatMoney(netBalance)}
          tone="blue"
        />

        <StatCard
          icon="◷"
          label="Pending Salary"
          value={formatMoney(pendingSalary)}
          tone="orange"
        />
      </div>

      <div className="reports-grid">
        <section className="content-card">
          <CardHeader
            title="Salary vs expenses"
            subtitle="Overall financial comparison"
          />

          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="name" />
                <YAxis />

                <Tooltip
                  formatter={(value) => formatMoney(value)}
                />

                <Legend />

                <Bar
                  dataKey="Salary"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />

                <Bar
                  dataKey="Expenses"
                  fill="#7c3aed"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="content-card">
          <CardHeader
            title="Expense distribution"
            subtitle="Spending by category"
          />

          <div className="chart-box">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={3}
                    label
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) => formatMoney(value)}
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon="◌"
                title="No data available"
                text="Add expenses to generate analytics."
              />
            )}
          </div>
        </section>
      </div>

      <section className="content-card">
        <CardHeader
          title="Expense timeline"
          subtitle="Spending activity by date"
        />

        <div className="chart-box timeline">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis dataKey="date" />
                <YAxis />

                <Tooltip
                  formatter={(value) => formatMoney(value)}
                />

                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon="⌁"
              title="No timeline data"
              text="Expense activity will appear here."
            />
          )}
        </div>
      </section>

      <section className="content-card">
        <CardHeader
          title="Financial summary"
          subtitle="Your overall financial position"
        />

        <div className="summary-grid">
          <SummaryItem label="Total Salary" value={totalSalary} />
          <SummaryItem label="Paid Salary" value={paidSalary} />
          <SummaryItem label="Pending Salary" value={pendingSalary} />
          <SummaryItem label="Total Expenses" value={totalExpenses} />
          <SummaryItem
            label="Net Balance"
            value={netBalance}
            highlight
          />
        </div>
      </section>
    </div>
  );
}

function AdminPage({
  users,
  totalUsers,
  userSearch,
  setUserSearch,
  userForm,
  editingUserId,
  loading,
  handleUserChange,
  handleUserSubmit,
  handleEditUser,
  toggleUserStatus,
  resetUserForm,
  loadUsers,
}) {
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;

  return (
    <div className="page-container">
      <div className="stats-grid compact">
        <StatCard
          icon="♙"
          label="Total Users"
          value={totalUsers}
          tone="purple"
        />

        <StatCard
          icon="✓"
          label="Active Users"
          value={activeUsers}
          tone="green"
        />

        <StatCard
          icon="○"
          label="Inactive Users"
          value={inactiveUsers}
          tone="orange"
        />

        <StatCard
          icon="⚙"
          label="Workspace"
          value="Admin"
          tone="blue"
        />
      </div>

      <section className="content-card form-card">
        <CardHeader
          title={editingUserId ? "Edit user" : "Create new user"}
          subtitle="Control accounts and access permissions"
          action={
            editingUserId ? (
              <button className="ghost-btn" onClick={resetUserForm}>
                Cancel
              </button>
            ) : null
          }
        />

        <form className="modern-form" onSubmit={handleUserSubmit}>
          <Field
            label="Username"
            name="username"
            value={userForm.username}
            onChange={handleUserChange}
            placeholder="user@expenseflow.local"
            disabled={Boolean(editingUserId)}
          />

          <Field
            label="Email"
            name="email"
            type="email"
            value={userForm.email}
            onChange={handleUserChange}
            placeholder="user@example.com"
          />

          <Field
            label="Full name"
            name="full_name"
            value={userForm.full_name}
            onChange={handleUserChange}
            placeholder="John Doe"
          />

          <Field
            label={
              editingUserId
                ? "New password (optional)"
                : "Password"
            }
            name="password"
            type="password"
            value={userForm.password}
            onChange={handleUserChange}
            placeholder="••••••••"
            required={!editingUserId}
          />

          <SelectField
            label="Role"
            name="role"
            value={userForm.role}
            onChange={handleUserChange}
            options={[
              { value: "user", label: "User" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <div className="form-submit">
            <button className="primary-btn" disabled={loading}>
              {loading
                ? "Saving..."
                : editingUserId
                ? "Update User"
                : "+ Create User"}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader
          title="User management"
          subtitle="All organization accounts"
          action={
            <button className="ghost-btn" onClick={loadUsers}>
              ↻ Refresh
            </button>
          }
        />

        <div className="filter-bar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users..."
            />
          </div>
        </div>

        {users.length > 0 ? (
          <div className="user-list">
            {users.map((user) => (
              <div className="user-row" key={user.id}>
                <div className="user-identity">
                  <div className="user-avatar">
                    {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <strong>{user.full_name}</strong>
                    <span>{user.email}</span>
                    <small>Username: {user.username}</small>
                  </div>
                </div>

                <div className="user-meta">
                  <span className="role-badge">
                    {(user.role || "user").toUpperCase()}
                  </span>

                  <span
                    className={
                      user.is_active
                        ? "status-badge active"
                        : "status-badge inactive"
                    }
                  >
                    {user.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>

                  <div className="action-buttons">
                    <button
                      type="button"
                      className="icon-btn edit"
                      onClick={() => handleEditUser(user)}
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      className={
                        user.is_active
                          ? "action-btn danger"
                          : "action-btn success"
                      }
                      onClick={() => toggleUserStatus(user)}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="♙"
            title="No users found"
            text="Try another search or create a new user."
          />
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  disabled = false,
  min,
}) {
  return (
    <div className="form-field">
      <label>{label}</label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div className="form-field">
      <label>{label}</label>

      <select
        name={name}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? { value: option, label: option }
              : option;

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "purple",
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>

      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="stat-shine" />
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {action}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight = false,
}) {
  return (
    <div className={`summary-item ${highlight ? "highlight" : ""}`}>
      <span>{label}</span>

      <strong>
        ৳ {Number(value || 0).toLocaleString("en-BD")}
      </strong>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>

      <h3>{title}</h3>
      <p>{text}</p>

      {action}
    </div>
  );
}

function getCategoryIcon(category) {
  const icons = {
    Utilities: "⌁",
    Food: "◒",
    Transport: "⌖",
    Office: "▣",
    Shopping: "◇",
    Entertainment: "◉",
    Medical: "+",
    Other: "•",
  };

  return icons[category] || "•";
}

export default App;