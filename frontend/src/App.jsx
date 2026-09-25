import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { translations } from "./i18n";
import DebtsPage from "./components/DebtsPage";
import SmsParserModal from "./components/SmsParserModal";
import PinLockModal from "./components/PinLockModal";
import MobileBottomNav from "./components/MobileBottomNav";
import { playSuccessChime, playExpenseSound, playDebtSound, playSalarySound } from "./utils/audioFeedback";
import { exportToCsv, generatePdfStatement } from "./utils/exportUtils";
import CategoriesPage from "./components/CategoriesPage";

export const API = import.meta.env.VITE_API_URL || "";

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
  { id: "debts", icon: "🤝", label: "Debts & Loans" },
  { id: "salary", icon: "৳", label: "Salary" },
  { id: "reports", icon: "◫", label: "Reports" },
  { id: "budgets", icon: "💰", label: "Budgets" },
  { id: "goals", icon: "📈", label: "Goals" },
  { id: "categories", icon: "📌", label: "Categories" },
  { id: "profile", icon: "◎", label: "Profile" },
];

function App() {
  // ── Language ──────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("expenseflow_lang") || "en";
  });
  const t = translations[lang] || translations.en;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("access_token"))
  );
  const [activePage, setActivePage] = useState("dashboard");
  const [openDebtModal, setOpenDebtModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("expenseflow_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [resetCodeModal, setResetCodeModal] = useState(null);

  // ── Login form ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  // ── Data ───────────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [users, setUsers] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [expenseScope, setExpenseScope] = useState("my"); // "my" | "all"
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [currentSavings, setCurrentSavings] = useState(0);
  const [debts, setDebts] = useState([]);
  const [debtSummary, setDebtSummary] = useState({});
  const [smsParserOpen, setSmsParserOpen] = useState(false);
  const [isPinLocked, setIsPinLocked] = useState(() => Boolean(localStorage.getItem("ef_pin_code")));

  // ── UI state ───────────────────────────────────────────────────────────────
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null); // { message, onConfirm }

  // ── NEW UI Features ────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem("ef_theme") || "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ef_notif_read") || "[]"); } catch { return []; }
  });
  const [customCategories, setCustomCategories] = useState([]);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [drillUser, setDrillUser] = useState(null); // { id, full_name }
  const notifRef = useRef(null);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("All");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [salaryDateFrom, setSalaryDateFrom] = useState("");
  const [salaryDateTo, setSalaryDateTo] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    category: "Utilities",
    expense_date: "",
    description: "",
    quantity: "",
    unit_price: "",
    is_recurring: false,
    recurrence_frequency: "monthly",
    receipt_url: "",
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
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    language: "en",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // ── Edit IDs ───────────────────────────────────────────────────────────────
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingSalaryId, setEditingSalaryId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    if (loggedIn) loadAllData();
  }, [loggedIn]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  // Theme effect
  useEffect(() => {
    document.body.classList.toggle("light-mode", theme === "light");
    localStorage.setItem("ef_theme", theme);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === "Escape") {
        setGlobalSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close notification panel on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Sync profile form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const userLang = currentUser.language || lang || "en";
      setProfileForm((prev) => ({
        ...prev,
        full_name: currentUser.full_name || "",
        email: currentUser.email || "",
        language: userLang,
      }));
      if (currentUser.language && (currentUser.language === "en" || currentUser.language === "bn") && currentUser.language !== lang) {
        setLang(currentUser.language);
        localStorage.setItem("expenseflow_lang", currentUser.language);
      }
    }
  }, [currentUser]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    "Bypass-Tunnel-Reminder": "true",
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

  // Central fetch wrapper — auto-logout on 401
  const apiFetch = async (url, options = {}) => {
    const headers = { ...authHeaders(), ...options.headers };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      _doLogout();
      throw new Error("Session expired. Please sign in again.");
    }
    return response;
  };

  const _doLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("expenseflow_user");
    setLoggedIn(false);
    setIsAdmin(false);
    setIsAdminView(false);
    setCurrentUser(null);
    setExpenses([]);
    setSalaries([]);
    setUsers([]);
    setMonthlyData([]);
    setActivePage("dashboard");
    setMessage("");
  };

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadCurrentUser = async () => {
    try {
      const response = await apiFetch(`${API}/api/auth/me`);
      const data = await safeJson(response);
      if (response.ok && data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem("expenseflow_user", JSON.stringify(data.user));
        if (data.user.role === "admin" || data.user.role === "super_admin") {
          setIsAdmin(true);
        }
      }
    } catch {
      // Ignore
    }
  };

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        loadCurrentUser(),
        loadExpenses(),
        loadSalaries(),
        checkAdmin(),
        loadMonthlyData(),
        loadBudgets(),
        loadGoals(),
        loadDebts(),
        loadCustomCategories(),
        loadUpcomingExpenses(),
      ]);
    } finally {
      setDataLoading(false);
    }
  };

  const loadDebts = async () => {
    try {
      const response = await apiFetch(`${API}/api/debts`);
      const data = await safeJson(response);
      if (response.ok && data.success) {
        setDebts(data.debts || []);
        setDebtSummary(data.summary || {});
      }
    } catch {
      // silently fail
    }
  };

  const handleCreateDebt = async (debtData) => {
    try {
      const response = await apiFetch(`${API}/api/debts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(debtData),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to create debt record");
      notify(data.message || "Debt record created", "success");
      await loadDebts();
    } catch (error) {
      notify(error.message, "error");
      throw error;
    }
  };

  const handleUpdateDebt = async (debtId, debtData) => {
    try {
      const response = await apiFetch(`${API}/api/debts/${debtId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(debtData),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to update debt record");
      notify(data.message || "Debt record updated", "success");
      await loadDebts();
    } catch (error) {
      notify(error.message, "error");
      throw error;
    }
  };

  const handleRecordDebtPayment = async (debtId, paymentData) => {
    try {
      const response = await apiFetch(`${API}/api/debts/${debtId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to record payment");
      notify(data.message || "Payment recorded", "success");
      await loadDebts();
    } catch (error) {
      notify(error.message, "error");
      throw error;
    }
  };

  const handleDeleteDebt = async (debtId) => {
    try {
      const response = await apiFetch(`${API}/api/debts/${debtId}`, {
        method: "DELETE",
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to delete debt record");
      notify("Debt record deleted", "success");
      await loadDebts();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const loadBudgets = async () => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const response = await apiFetch(`${API}/api/budgets?month=${month}`);
      const data = await safeJson(response);
      if (response.ok) setBudgets(data.budgets || []);
    } catch { /* silently fail */ }
  };

  const loadGoals = async () => {
    try {
      const response = await apiFetch(`${API}/api/goals`);
      const data = await safeJson(response);
      if (response.ok) {
        setGoals(data.goals || []);
        setCurrentSavings(data.current_savings || 0);
      }
    } catch { /* silently fail */ }
  };

  const loadCustomCategories = async () => {
    try {
      const response = await apiFetch(`${API}/api/categories`);
      const data = await safeJson(response);
      if (response.ok) {
        setCustomCategories(data.categories || []);
      }
    } catch { /* silently fail */ }
  };



  const loadUpcomingExpenses = async () => {
    try {
      const response = await apiFetch(`${API}/api/expenses/upcoming`);
      const data = await safeJson(response);
      if (response.ok) {
        setUpcomingExpenses(data.upcoming || []);
      }
    } catch { /* silently fail */ }
  };

  const loadExpenses = async (scope = expenseScope, targetUserId = null) => {
    try {
      let url = `${API}/api/expenses?scope=${scope}`;
      if (targetUserId) url += `&user_id=${targetUserId}`;
      const response = await apiFetch(url);
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to load expenses");
      setExpenses(data.expenses || []);
      setIsAdminView(Boolean(data.is_admin_view));
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const loadSalaries = async () => {
    try {
      const response = await apiFetch(`${API}/api/salaries`);
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to load salaries");
      setSalaries(data.salaries || []);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const checkAdmin = async () => {
    try {
      const response = await apiFetch(`${API}/api/admin/users`);
      const data = await safeJson(response);
      if (response.ok && data.success) {
        setIsAdmin(true);
        setUsers(data.users || []);
      } else {
        setIsAdmin(Boolean(currentUser?.role === "admin" || currentUser?.role === "super_admin"));
      }
    } catch {
      setIsAdmin(Boolean(currentUser?.role === "admin" || currentUser?.role === "super_admin"));
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiFetch(`${API}/api/admin/users`);
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to load users");
      setUsers(data.users || []);
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const loadMonthlyData = async () => {
    try {
      const response = await fetch(`${API}/api/reports/monthly`, {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const data = await safeJson(response);
      setMonthlyData(data.monthly || []);
    } catch {
      // silently fail
    }
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = (email || "").trim();
    if (!cleanEmail || !password) {
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
          "Bypass-Tunnel-Reminder": "true",
        },
        body: JSON.stringify({ username: cleanEmail, password }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("access_token", data.access_token);
      if (data.user) {
        localStorage.setItem("expenseflow_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        if (data.user.role === "admin" || data.user.role === "super_admin") {
          setIsAdmin(true);
        }
      }
      setLoggedIn(true);
      setPassword("");
      notify("Welcome back! Login successful.");
    } catch (error) {
      notify(error.message || "Unable to connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResetCode = async (user) => {
    setLoading(true);
    try {
      const response = await apiFetch(
        `${API}/api/admin/users/${user.id}/reset-code`,
        { method: "POST" }
      );
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Unable to generate reset code");
      setResetCodeModal({
        fullName: user.full_name,
        username: user.username,
        code: data.code,
        expiresInMinutes: data.expires_in_minutes,
      });
      notify(`Reset code generated for ${user.full_name}.`);
    } catch (error) {
      notify(error.message || "Unable to connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetUsername || !resetCode || !resetNewPassword) {
      notify("Please fill in all fields.", "error");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      notify("New password and confirmation do not match.", "error");
      return;
    }
    if (resetNewPassword.length < 6) {
      notify("New password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: resetUsername,
          code: resetCode,
          new_password: resetNewPassword,
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Unable to reset password");
      notify("Password reset! You can now sign in with your new password.");
      setShowResetForm(false);
      setResetUsername("");
      setResetCode("");
      setResetNewPassword("");
      setResetConfirmPassword("");
    } catch (error) {
      notify(error.message || "Unable to connect to server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => _doLogout();

  // ── Profile handler ───────────────────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name || !profileForm.email) {
      notify(lang === "bn" ? "পুরো নাম ও ইমেইল আবশ্যক।" : "Full name and email are required.", "error");
      return;
    }
    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) {
      notify(lang === "bn" ? "নতুন পাসওয়ার্ড মেলেনি।" : "New passwords do not match.", "error");
      return;
    }
    if (profileForm.new_password && profileForm.new_password.length < 6) {
      notify(lang === "bn" ? "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" : "New password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    try {
      const selectedLang = profileForm.language || "en";
      const body = {
        full_name: profileForm.full_name,
        email: profileForm.email,
        language: selectedLang,
      };
      if (profileForm.new_password) {
        body.current_password = profileForm.current_password;
        body.new_password = profileForm.new_password;
      }
      const response = await apiFetch(`${API}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Profile update failed");
      
      setLang(selectedLang);
      localStorage.setItem("expenseflow_lang", selectedLang);

      setCurrentUser((prev) => ({
        ...prev,
        full_name: profileForm.full_name,
        email: profileForm.email,
        language: selectedLang,
      }));
      setProfileForm((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
      notify(selectedLang === "bn" ? "প্রোফাইল সফলভাবে আপডেট করা হয়েছে।" : "Profile updated successfully.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    if (name === "language") {
      setLang(value);
      localStorage.setItem("expenseflow_lang", value);
    }
  };

  // ── Form change handlers ───────────────────────────────────────────────────
  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setExpenseForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "category") {
        const pieceCategories = ["Cigarette Bill", "Food", "Shopping"];
        if (!pieceCategories.includes(value)) {
          next.quantity = "";
          next.unit_price = "";
        }
      }
      if (name === "quantity" || name === "unit_price") {
        const q = name === "quantity" ? parseFloat(value) : parseFloat(prev.quantity);
        const p = name === "unit_price" ? parseFloat(value) : parseFloat(prev.unit_price);
        if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
          next.amount = (Math.round(q * p * 100) / 100).toString();
        }
      }
      return next;
    });
  };

  const handleSalaryChange = (e) =>
    setSalaryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleUserChange = (e) =>
    setUserForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetExpenseForm = () => {
    setExpenseForm({
      title: "",
      amount: "",
      category: "Utilities",
      expense_date: "",
      description: "",
      quantity: "",
      unit_price: "",
      is_recurring: false,
      recurrence_frequency: "monthly",
      receipt_url: "",
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

  // ── Expense CRUD ───────────────────────────────────────────────────────────
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
      const response = await apiFetch(url, {
        method: editingExpenseId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          amount: Number(expenseForm.amount),
          quantity: expenseForm.quantity !== "" ? Number(expenseForm.quantity) : null,
          unit_price: expenseForm.unit_price !== "" ? Number(expenseForm.unit_price) : null,
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Operation failed");
      notify(editingExpenseId ? "Expense updated successfully." : "Expense added successfully.");
      playExpenseSound();
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
      amount: expense.amount != null ? String(expense.amount) : "",
      category: expense.category || "Other",
      expense_date: expense.expense_date || "",
      description: expense.description || "",
      quantity: expense.quantity != null ? String(expense.quantity) : "",
      unit_price: expense.unit_price != null ? String(expense.unit_price) : "",
      is_recurring: Boolean(expense.is_recurring),
      recurrence_frequency: expense.recurrence_frequency || "monthly",
      receipt_url: expense.receipt_url || "",
    });
    setActivePage("expenses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteExpense = (id) => {
    setDeleteModal({
      message: "Delete this expense permanently?",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`${API}/api/expenses/${id}`, {
            method: "DELETE",
          });
          const data = await safeJson(response);
          if (!response.ok) throw new Error(data.message || "Delete failed");
          notify("Expense deleted successfully.");
          await loadExpenses();
        } catch (error) {
          notify(error.message, "error");
        }
      },
    });
  };

  // ── Salary CRUD ────────────────────────────────────────────────────────────
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
      const response = await apiFetch(url, {
        method: editingSalaryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...salaryForm,
          amount: Number(salaryForm.amount),
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Salary operation failed");
      notify(editingSalaryId ? "Salary updated successfully." : "Salary added successfully.");
      playSalarySound();
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSalary = (id) => {
    setDeleteModal({
      message: "Delete this salary record permanently?",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`${API}/api/salaries/${id}`, {
            method: "DELETE",
          });
          const data = await safeJson(response);
          if (!response.ok) throw new Error(data.message || "Delete failed");
          notify("Salary record deleted.");
          await loadSalaries();
        } catch (error) {
          notify(error.message, "error");
        }
      },
    });
  };

  // ── User CRUD (Admin) ──────────────────────────────────────────────────────
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
      if (editingUserId && !body.password) delete body.password;
      const response = await apiFetch(url, {
        method: editingUserId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "User operation failed");
      notify(editingUserId ? "User updated successfully." : "User created successfully.");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleUserStatus = async (user) => {
    if (user.role === "super_admin" && !isSuperAdmin) {
      notify("Admin cannot deactivate a Super Admin account", "error");
      return;
    }
    if (user.id === currentUser?.id && user.is_active) {
      notify("You cannot deactivate your own account", "error");
      return;
    }
    try {
      const response = await apiFetch(`${API}/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Status update failed");
      notify(user.is_active ? "User deactivated." : "User activated.");
      await loadUsers();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleDeleteUser = (user) => {
    setDeleteModal({
      message: `Permanently delete "${user.full_name}"? This will erase ALL their expenses, salaries and account data. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await apiFetch(`${API}/api/admin/users/${user.id}`, {
            method: "DELETE",
          });
          const data = await safeJson(response);
          if (!response.ok) throw new Error(data.message || "Delete failed");
          notify(
            `${user.full_name} deleted — ${data.deleted?.expenses || 0} expenses, ${data.deleted?.salaries || 0} salary records removed.`
          );
          await loadUsers();
        } catch (error) {
          notify(error.message, "error");
        }
      },
    });
  };

  // ── Permissions ───────────────────────────────────────────────────────────
  const isSuperAdmin = currentUser?.role === "super_admin";
  const canAccessAdmin = isAdmin || isSuperAdmin || currentUser?.role === "admin";

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportExpensesCSV = () => {
    const headers = ["Title", "Category", "Quantity", "Unit Price (৳)", "Amount (৳)", "Date", "Description"];
    const rows = filteredExpenses.map((e) => [
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${e.category || ""}"`,
      e.quantity ?? "",
      e.unit_price ?? "",
      e.amount || 0,
      e.expense_date || "",
      `"${(e.description || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Expenses exported successfully.");
  };

  // ── Salary CSV Export ──────────────────────────────────────────────────────
  const exportSalariesCSV = () => {
    const headers = ["Employee", "Description", "Salary Month", "Payment Date", "Status", "Amount (৳)"];
    const rows = filteredSalaries.map((s) => [
      `"${(s.user_name || currentUser?.full_name || "").replace(/"/g, '""')}"`,
      `"${(s.description || "").replace(/"/g, '""')}"`,
      s.salary_month || "",
      s.payment_date || "",
      s.status || "",
      s.amount || 0,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salaries_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Salaries exported successfully.");
  };

  // ── CSV Report Export ─────────────────────────────────────────────────────
  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API}/api/reports/export`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Bypass-Tunnel-Reminder": "true"
        }
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify("CSV report downloaded!");
    } catch (err) {
      console.error(err);
      notify("Failed to export CSV", "error");
    }
  };

  // ── PDF Report Export ─────────────────────────────────────────────────────
  const exportPDF = async () => {
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const margin = 18;
      let y = margin;
      const dateStr = new Date().toLocaleDateString("en-BD", { year: "numeric", month: "long", day: "numeric" });

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("ExpenseFlow Pro — Financial Report", margin, 18);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${dateStr}`, pageW - margin, 22, { align: "right" });
      y = 40;

      // User info
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(10);
      doc.text(`User: ${currentUser?.full_name || "—"}   |   Org: ${currentUser?.username || "—"}`, margin, y);
      y += 12;

      // Summary table
      const summaryRows = [
        ["Total Salary", `BDT ${totalSalary.toLocaleString("en-BD")}`],
        ["Paid Salary", `BDT ${paidSalary.toLocaleString("en-BD")}`],
        ["Pending Salary", `BDT ${pendingSalary.toLocaleString("en-BD")}`],
        ["Total Expenses", `BDT ${totalExpenses.toLocaleString("en-BD")}`],
        ["Net Balance", `BDT ${netBalance.toLocaleString("en-BD")}`],
        ["Avg Expense", `BDT ${Math.round(averageExpense).toLocaleString("en-BD")}`],
      ];

      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 60);
      doc.text("Financial Summary", margin, y); y += 6;
      doc.setDrawColor(200, 200, 220);
      doc.line(margin, y, pageW - margin, y); y += 6;

      summaryRows.forEach(([label, value], i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 249, 252);
          doc.rect(margin, y - 4, pageW - 2 * margin, 10, "F");
        }
        doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 70, 90);
        doc.text(label, margin + 4, y + 3);
        doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 80);
        doc.text(value, pageW - margin - 4, y + 3, { align: "right" });
        y += 10;
      });
      y += 8;

      // Category Breakdown
      if (categoryData.length > 0) {
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 60);
        doc.text("Expense by Category", margin, y); y += 6;
        doc.setDrawColor(200, 200, 220);
        doc.line(margin, y, pageW - margin, y); y += 6;
        categoryData.forEach((cat, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(margin, y - 4, pageW - 2 * margin, 10, "F"); }
          doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 70, 90);
          doc.text(cat.name, margin + 4, y + 3);
          doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 80);
          doc.text(`BDT ${cat.value.toLocaleString("en-BD")}`, pageW - margin - 4, y + 3, { align: "right" });
          y += 10;
          if (y > 260) { doc.addPage(); y = 20; }
        });
        y += 8;
      }

      // Recent Expenses
      const recentExp = expenses.slice(0, 15);
      if (recentExp.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 60);
        doc.text("Recent Expenses", margin, y); y += 6;
        doc.line(margin, y, pageW - margin, y); y += 6;
        recentExp.forEach((exp, i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 249, 252); doc.rect(margin, y - 4, pageW - 2 * margin, 10, "F"); }
          doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 70, 90);
          const title = (exp.title || "").substring(0, 30);
          doc.text(title, margin + 4, y + 3);
          doc.text(exp.category || "", margin + 75, y + 3);
          doc.text(exp.expense_date || "", margin + 115, y + 3);
          doc.setFont("helvetica", "bold"); doc.setTextColor(180, 40, 40);
          doc.text(`BDT ${Number(exp.amount).toLocaleString("en-BD")}`, pageW - margin - 4, y + 3, { align: "right" });
          y += 10;
          if (y > 270) { doc.addPage(); y = 20; }
        });
      }

      // Footer
      doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(150, 150, 160);
      doc.text("Generated by ExpenseFlow Pro — Confidential", pageW / 2, 290, { align: "center" });

      doc.save(`financial_report_${new Date().toISOString().split("T")[0]}.pdf`);
      notify("PDF report downloaded!");
    } catch (err) {
      notify("PDF export failed: " + err.message, "error");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Budget CRUD ────────────────────────────────────────────────────────────
  const handleSetBudget = async (category, month, monthly_limit) => {
    try {
      const response = await apiFetch(`${API}/api/budgets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, month, monthly_limit }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to set budget");
      notify(t.budgetAdded || "Budget set!");
      await loadBudgets();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleDeleteBudget = async (id) => {
    try {
      const response = await apiFetch(`${API}/api/budgets/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete budget");
      notify(t.budgetDeleted || "Budget removed.");
      await loadBudgets();
    } catch (err) { notify(err.message, "error"); }
  };

  // ── Goals CRUD ─────────────────────────────────────────────────────────────
  const handleAddGoal = async (form) => {
    try {
      const response = await apiFetch(`${API}/api/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.message || "Failed to create goal");
      notify(t.goalAdded || "Goal created!");
      await loadGoals();
    } catch (err) { notify(err.message, "error"); }
  };

  const handleDeleteGoal = (id) => {
    setDeleteModal({
      message: "Delete this savings goal permanently?",
      onConfirm: async () => {
        try {
          const response = await apiFetch(`${API}/api/goals/${id}`, { method: "DELETE" });
          if (!response.ok) throw new Error("Delete failed");
          notify(t.goalDeleted || "Goal deleted.");
          await loadGoals();
        } catch (err) { notify(err.message, "error"); }
      },
    });
  };

  // ── Notifications logic ────────────────────────────────────────────────────
  const notifications = useMemo(() => {
    const items = [];
    const pendingCount = salaries.filter((s) => s.status === "pending").length;
    if (pendingCount > 0) {
      items.push({ id: "pending_salary", type: "warn", icon: "⏱", title: `${pendingCount} pending salary record${pendingCount > 1 ? "s" : ""}`, time: "Now" });
    }
    budgets.forEach((b) => {
      if (b.is_over) {
        items.push({ id: `budget_over_${b.id}`, type: "danger", icon: "💸", title: `${b.category} exceeded budget limit (${b.percentage}%)`, time: b.month });
      } else if (b.is_warning) {
        items.push({ id: `budget_warn_${b.id}`, type: "warn", icon: "⚠️", title: `${b.category} is near budget limit (${b.percentage}%)`, time: b.month });
      }
    });
    goals.forEach((g) => {
      if (g.is_achieved) {
        items.push({ id: `goal_done_${g.id}`, type: "success", icon: "🎉", title: `Goal "${g.title}" achieved!`, time: "" });
      }
    });
    return items;
  }, [salaries, budgets, goals]);

  const unreadNotifCount = notifications.filter((n) => !notifRead.includes(n.id)).length;

  const markAllNotifRead = () => {
    const ids = notifications.map((n) => n.id);
    setNotifRead(ids);
    localStorage.setItem("ef_notif_read", JSON.stringify(ids));
  };

  // ── Global Search ─────────────────────────────────────────────────────────
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return { expenses: [], salaries: [], users: [] };
    const q = globalSearchQuery.toLowerCase();
    return {
      expenses: expenses.filter((e) => e.title?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)).slice(0, 5),
      salaries: salaries.filter((s) => s.description?.toLowerCase().includes(q) || s.salary_month?.includes(q)).slice(0, 3),
      users: users.filter((u) => u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)).slice(0, 3),
    };
  }, [globalSearchQuery, expenses, salaries, users]);

  // ── Admin Drill-down ───────────────────────────────────────────────────────
  const filteredExpensesForDrill = useMemo(() => {
    if (!drillUser) return null;
    return expenses.filter((e) => e.user_id === drillUser.id);
  }, [drillUser, expenses]);

  // ── Computed values ────────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );
  const totalSalary = salaries.reduce(
    (sum, s) => sum + Number(s.amount || 0),
    0
  );
  const paidSalary = salaries
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const pendingSalary = salaries
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const pendingSalaryCount = salaries.filter((s) => s.status === "pending").length;
  const netBalance = totalSalary - totalExpenses;
  const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const savingsRate =
    totalSalary > 0
      ? Math.max(0, Math.min(100, (netBalance / totalSalary) * 100))
      : 0;

  const categoryData = useMemo(() => {
    const grouped = {};
    expenses.forEach((expense) => {
      const category = expense.category || "Other";
      grouped[category] = (grouped[category] || 0) + Number(expense.amount || 0);
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
      grouped[date] = (grouped[date] || 0) + Number(expense.amount || 0);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const query = expenseSearch.toLowerCase();
      const matchesSearch =
        !query ||
        expense.title?.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query) ||
        expense.user_name?.toLowerCase().includes(query);
      const matchesCategory =
        expenseCategory === "All" || expense.category === expenseCategory;
      const matchesFrom = !expenseDateFrom || expense.expense_date >= expenseDateFrom;
      const matchesTo = !expenseDateTo || expense.expense_date <= expenseDateTo;
      return matchesSearch && matchesCategory && matchesFrom && matchesTo;
    });
  }, [expenses, expenseSearch, expenseCategory, expenseDateFrom, expenseDateTo]);

  const filteredSalaries = useMemo(() => {
    return salaries.filter((salary) => {
      const matchesFrom = !salaryDateFrom || salary.salary_month >= salaryDateFrom;
      const matchesTo = !salaryDateTo || salary.salary_month <= salaryDateTo;
      return matchesFrom && matchesTo;
    });
  }, [salaries, salaryDateFrom, salaryDateTo]);

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

  const getRoleLabel = (user) => {
    if (!user) return t.userRole;
    if (user.role === "super_admin") return t.superAdminRole;
    if (user.role === "admin") return t.adminRole;
    return t.userRole;
  };

  // Nav label map expanded
  const navLabels = {
    dashboard: t.dashboard,
    expenses: t.expenses,
    debts: t.debts || "Debts & Loans",
    salary: t.salary,
    reports: t.reports,
    budgets: t.budgets || "Budgets",
    goals: t.savingsGoals || "Goals",
    profile: t.profile,
  };

  // ── LOGIN PAGE ─────────────────────────────────────────────────────────────
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
                <div><span>✓</span><p>Track every expense</p></div>
                <div><span>✓</span><p>Understand your spending</p></div>
                <div><span>✓</span><p>Keep your financial life organized</p></div>
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

              <span className="login-label">
                {showResetForm === "reset"
                  ? "RESET PASSWORD"
                  : showResetForm === "request"
                  ? "REQUEST RESET"
                  : "WELCOME BACK"}
              </span>

              <h2>
                {showResetForm === "reset"
                  ? "Set a new password"
                  : showResetForm === "request"
                  ? "Request password reset"
                  : "Sign in to your workspace"}
              </h2>

              <p className="login-subtitle">
                {showResetForm === "reset"
                  ? "Enter the reset code your admin shared with you, then choose a new password."
                  : showResetForm === "request"
                  ? "Enter your email or username. An admin will generate a code for you."
                  : "Enter your credentials to continue."}
              </p>

              {!showResetForm ? (
                <>
                  <form className="login-form" onSubmit={handleLogin}>
                    <Field
                      label="Email or username"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@expenseflow.local"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      autoComplete="username"
                    />
                    <Field
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoCapitalize="none"
                      autoComplete="current-password"
                    />
                    <button className="primary-btn login-btn" disabled={loading} type="submit">
                      {loading ? (
                        <><span className="spinner" />Signing in...</>
                      ) : (
                        <>Sign in<span className="btn-arrow">→</span></>
                      )}
                    </button>
                  </form>
                  <button
                    type="button"
                    className="ghost-btn login-forgot-link"
                    onClick={() => { setShowResetForm("request"); setMessage(""); }}
                  >
                    Forgot password?
                  </button>
                </>
              ) : showResetForm === "request" ? (
                <>
                  <form
                    className="login-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!resetUsername) { notify("Please enter username or email", "error"); return; }
                      setLoading(true);
                      try {
                        const res = await fetch(`${API}/api/auth/request-reset`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ username: resetUsername }),
                        });
                        const data = await safeJson(res);
                        notify(data.message || "Request sent!");
                        setShowResetForm("reset");
                      } catch {
                        notify("Failed to request reset", "error");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Field
                      label="Email or username"
                      type="text"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="admin@expenseflow.local"
                    />
                    <button className="primary-btn login-btn" disabled={loading} type="submit">
                      {loading ? (
                        <><span className="spinner" />Requesting...</>
                      ) : (
                        <>Request Reset Code<span className="btn-arrow">→</span></>
                      )}
                    </button>
                  </form>
                  <button type="button" className="ghost-btn login-forgot-link" onClick={() => { setShowResetForm("reset"); setMessage(""); }}>
                    Already have a code?
                  </button>
                  <button type="button" className="ghost-btn login-forgot-link" style={{ marginTop: 0 }} onClick={() => { setShowResetForm(false); setMessage(""); }}>
                    ← Back to sign in
                  </button>
                </>
              ) : (
                <>
                  <form className="login-form" onSubmit={handleResetPassword}>
                    <Field label="Email or username" type="text" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} placeholder="admin@expenseflow.local" />
                    <Field label="Reset code" type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value)} placeholder="6-digit code" />
                    <Field label="New password" type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="At least 6 characters" />
                    <Field label="Confirm new password" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
                    <button className="primary-btn login-btn" disabled={loading} type="submit">
                      {loading ? (
                        <><span className="spinner" />Resetting...</>
                      ) : (
                        <>Reset password<span className="btn-arrow">→</span></>
                      )}
                    </button>
                  </form>
                  <button type="button" className="ghost-btn login-forgot-link" onClick={() => { setShowResetForm(false); setMessage(""); }}>
                    ← Back to sign in
                  </button>
                </>
              )}

              {message && (
                <div className={`login-message ${messageType === "error" ? "error" : ""}`}>
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

  // ── PAGE META ──────────────────────────────────────────────────────────────
  const pageMeta = {
    dashboard: t.pageTitles.dashboard,
    expenses: t.pageTitles.expenses,
    debts: { title: t.debts || "Debts & Loans", subtitle: t.debtsSubtitle || "Track money lent and borrowed with repayment records." },
    salary: t.pageTitles.salary,
    reports: t.pageTitles.reports,
    admin: t.pageTitles.admin,
    profile: t.pageTitles.profile,
  };

  // navLabels already defined above

  const currentPage = pageMeta[activePage] || pageMeta.dashboard;

  // ── MAIN APP ───────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar${sidebarOpen ? " mobile-open" : ""}`}>
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
                className={`nav-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{navLabels[item.id] || item.label}</span>
                {item.id === "salary" && pendingSalaryCount > 0 && (
                  <span className="nav-badge">{pendingSalaryCount}</span>
                )}
                {item.id === "budgets" && budgets.some((b) => b.is_over) && (
                  <span className="nav-badge danger">!</span>
                )}
                {activePage === item.id && <span className="nav-arrow">›</span>}
              </button>
            ))}

            {canAccessAdmin && (
              <>
                <div className="nav-divider" />
                <button
                  className={`nav-item ${activePage === "admin" ? "active" : ""}`}
                  onClick={() => { setActivePage("admin"); loadUsers(); setSidebarOpen(false); }}
                >
                  <span className="nav-icon">⚙</span>
                  <span>{t.admin}</span>
                  {activePage === "admin" && <span className="nav-arrow">›</span>}
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className="online-dot" />
            <div>
              <strong>{t.systemOnline}</strong>
              <small>{t.allRunning}</small>
            </div>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">
              {(currentUser?.full_name || currentUser?.username || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="profile-info">
              <strong>{currentUser?.full_name || currentUser?.username || "User"}</strong>
              <span>{getRoleLabel(currentUser)}</span>
            </div>
            <button className="logout-icon" onClick={handleLogout} title={t.signOut}>
              ↪
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger for mobile */}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
            <div>
              <div className="breadcrumb">
                ExpenseFlow <span>/</span> {currentPage.title}
              </div>
              <h1>{currentPage.title}</h1>
              <p>{currentPage.subtitle}</p>
            </div>
          </div>
          <div className="header-actions">
            {/* Install App Button */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setInstallModalOpen(true)}
              title="Install Mobile & Desktop App"
              style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))", border: "1px solid rgba(168, 85, 247, 0.4)", color: "#c084fc", fontWeight: "600", gap: "6px" }}
            >
              📲 <span>Install App</span>
            </button>

            {/* Global search */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setGlobalSearchOpen(true)}
              title="Search (Ctrl+K)"
              style={{ gap: "6px" }}
            >
              🔍 <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>Ctrl+K</span>
            </button>

            {/* Notification Bell */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                type="button"
                className={`notif-bell${unreadNotifCount > 0 ? " has-notif" : ""}`}
                onClick={() => setNotifOpen((o) => !o)}
                title={t.notifications || "Notifications"}
              >
                🔔
                {unreadNotifCount > 0 && (
                  <span className="notif-count-badge">{unreadNotifCount}</span>
                )}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <h3>{t.notifications || "Notifications"}</h3>
                    {notifications.length > 0 && (
                      <button onClick={markAllNotifRead}>{t.markAllRead || "Mark all read"}</button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <div style={{ fontSize: "32px" }}>✅</div>
                        <p>{t.noNotifications || "All caught up!"}</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`notif-item${!notifRead.includes(n.id) ? " unread" : ""}`}>
                          <div className={`notif-icon ${n.type}`}>{n.icon}</div>
                          <div className="notif-body">
                            <p>{n.title}</p>
                            {n.time && <span>{n.time}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => {
                const nextLang = lang === "en" ? "bn" : "en";
                setLang(nextLang);
                localStorage.setItem("expenseflow_lang", nextLang);
                setProfileForm((prev) => ({ ...prev, language: nextLang }));
                apiFetch(`${API}/api/auth/profile`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ full_name: currentUser?.full_name || "", email: currentUser?.email || "", language: nextLang }),
                }).catch(() => {});
              }}
              title="Switch Language / ভাষা পরিবর্তন করুন"
            >
              🌐 {lang === "en" ? "EN" : "বাং"}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
              title={theme === "dark" ? (t.lightMode || "Light Mode") : (t.darkMode || "Dark Mode")}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <div className="header-date">
              <span>{lang === "bn" ? "আজ" : "Today"}</span>
              <strong>
                {new Date().toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
              </strong>
            </div>
            <div
              className="header-avatar"
              title={currentUser?.full_name || "User"}
              onClick={() => setActivePage("profile")}
              style={{ cursor: "pointer" }}
            >
              {(currentUser?.full_name || currentUser?.username || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {message && (
          <div className={`toast ${messageType === "error" ? "toast-error" : ""}`}>
            <span>{messageType === "error" ? "!" : "✓"}</span>
            {message}
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {dataLoading && (
          <div className="skeleton-bar">
            <div className="skeleton-shimmer" />
          </div>
        )}

        {activePage === "dashboard" && (
          <DashboardPage
            totalExpenses={totalExpenses}
            averageExpense={averageExpense}
            expenses={expenses}
            salaries={salaries}
            totalSalary={totalSalary}
            paidSalary={paidSalary}
            pendingSalary={pendingSalary}
            monthlyData={monthlyData}
            netBalance={netBalance}
            categoryData={categoryData}
            timelineData={timelineData}
            savingsRate={savingsRate}
            upcomingExpenses={upcomingExpenses}
            formatMoney={formatMoney}
            setActivePage={setActivePage}
            loadExpenses={loadExpenses}
            getCategoryIcon={getCategoryIcon}
            t={t}
          />
        )}

        {activePage === "expenses" && (
          <ExpensesPage
            expenses={drillUser ? (filteredExpensesForDrill || []) : filteredExpenses}
            allExpenses={expenses}
            totalExpenses={drillUser ? (filteredExpensesForDrill || []).reduce((s, e) => s + Number(e.amount || 0), 0) : totalExpenses}
            averageExpense={averageExpense}
            expenseForm={expenseForm}
            editingExpenseId={editingExpenseId}
            loading={loading}
            expenseSearch={expenseSearch}
            setExpenseSearch={setExpenseSearch}
            expenseCategory={expenseCategory}
            setExpenseCategory={setExpenseCategory}
            expenseDateFrom={expenseDateFrom}
            setExpenseDateFrom={setExpenseDateFrom}
            expenseDateTo={expenseDateTo}
            setExpenseDateTo={setExpenseDateTo}
            handleExpenseChange={handleExpenseChange}
            handleExpenseSubmit={handleExpenseSubmit}
            handleEditExpense={handleEditExpense}
            handleDeleteExpense={handleDeleteExpense}
            resetExpenseForm={resetExpenseForm}
            loadExpenses={loadExpenses}
            formatMoney={formatMoney}
            exportCSV={exportExpensesCSV}
            exportPDF={exportPDF}
            pdfLoading={pdfLoading}
            isAdminView={isAdminView}
            expenseScope={expenseScope}
            setExpenseScope={setExpenseScope}
            drillUser={drillUser}
            clearDrill={() => { setDrillUser(null); loadExpenses("my"); }}
            onOpenSmsParser={() => setSmsParserOpen(true)}
            customCategories={customCategories}
            t={t}
          />
        )}

        {activePage === "debts" && (
          <DebtsPage
            debts={debts}
            summary={debtSummary}
            formatMoney={formatMoney}
            onRefresh={loadDebts}
            onCreateDebt={handleCreateDebt}
            onUpdateDebt={handleUpdateDebt}
            onRecordPayment={handleRecordDebtPayment}
            onDeleteDebt={handleDeleteDebt}
            openDebtModal={openDebtModal}
            setOpenDebtModal={setOpenDebtModal}
            t={t}
          />
        )}

        {activePage === "salary" && (
          <SalaryPage
            salaries={filteredSalaries}
            allSalaries={salaries}
            totalSalary={totalSalary}
            paidSalary={paidSalary}
            pendingSalary={pendingSalary}
            salaryForm={salaryForm}
            editingSalaryId={editingSalaryId}
            loading={loading}
            salaryDateFrom={salaryDateFrom}
            setSalaryDateFrom={setSalaryDateFrom}
            salaryDateTo={salaryDateTo}
            setSalaryDateTo={setSalaryDateTo}
            handleSalaryChange={handleSalaryChange}
            handleSalarySubmit={handleSalarySubmit}
            handleEditSalary={handleEditSalary}
            handleDeleteSalary={handleDeleteSalary}
            resetSalaryForm={resetSalaryForm}
            loadSalaries={loadSalaries}
            formatMoney={formatMoney}
            exportSalariesCSV={exportSalariesCSV}
            isAdminView={isAdminView}
            t={t}
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
            monthlyData={monthlyData}
            formatMoney={formatMoney}
            exportPDF={exportPDF}
            exportCSV={exportCSV}
            pdfLoading={pdfLoading}
            t={t}
          />
        )}

        {activePage === "budgets" && (
          <BudgetsPage
            budgets={budgets}
            formatMoney={formatMoney}
            handleSetBudget={handleSetBudget}
            handleDeleteBudget={handleDeleteBudget}
            customCategories={customCategories}
            t={t}
          />
        )}

        {activePage === "goals" && (
          <GoalsPage
            goals={goals}
            currentSavings={currentSavings}
            formatMoney={formatMoney}
            handleAddGoal={handleAddGoal}
            handleDeleteGoal={handleDeleteGoal}
            t={t}
          />
        )}

        {activePage === "categories" && (
          <CategoriesPage
            formatMoney={formatMoney}
            t={t}
          />
        )}

        {activePage === "admin" && canAccessAdmin && (
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
            handleDeleteUser={handleDeleteUser}
            isSuperAdmin={currentUser?.role === "super_admin"}
            resetUserForm={resetUserForm}
            loadUsers={loadUsers}
            handleGenerateResetCode={handleGenerateResetCode}
            currentUser={currentUser}
            onViewExpenses={(user) => { setDrillUser(user); loadExpenses("my", user.id); setActivePage("expenses"); }}
            t={t}
          />
        )}

        {activePage === "profile" && (
          <ProfilePage
            currentUser={currentUser}
            profileForm={profileForm}
            handleProfileChange={handleProfileChange}
            handleProfileSubmit={handleProfileSubmit}
            loading={loading}
            getRoleLabel={getRoleLabel}
            t={t}
          />
        )}
      </main>

      {/* Global Search Modal */}
      {globalSearchOpen && (
        <GlobalSearchModal
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          results={globalSearchResults}
          onClose={() => { setGlobalSearchOpen(false); setGlobalSearchQuery(""); }}
          onNavigate={(page, id) => {
            setActivePage(page);
            setGlobalSearchOpen(false);
            setGlobalSearchQuery("");
          }}
          formatMoney={formatMoney}
          t={t}
        />
      )}

      {installModalOpen && (
        <AppInstallModal
          onClose={() => setInstallModalOpen(false)}
          deferredPrompt={deferredPrompt}
        />
      )}

      {resetCodeModal && (
        <ResetCodeModal
          data={resetCodeModal}
          onClose={() => setResetCodeModal(null)}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          message={deleteModal.message}
          onConfirm={async () => {
            setDeleteModal(null);
            await deleteModal.onConfirm();
          }}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {/* PWA Install Prompt */}
      {pwaPrompt && (
        <div className="pwa-install-bar">
          <p>
            <strong>Install ExpenseFlow</strong>
            <span>Add to home screen for quick access</span>
          </p>
          <button className="pwa-install-btn" onClick={async () => {
            pwaPrompt.prompt();
            const { outcome } = await pwaPrompt.userChoice;
            if (outcome === "accepted") setPwaPrompt(null);
          }}>Install</button>
          <button className="pwa-dismiss-btn" onClick={() => setPwaPrompt(null)}>×</button>
        </div>
      )}

      {/* Mobile App Bottom Navigation & FAB */}
      {loggedIn && (
        <MobileBottomNav
          activePage={activePage}
          setActivePage={setActivePage}
          onOpenAddExpense={() => {
            resetExpenseForm();
            setActivePage("expenses");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenAddDebt={() => {
            setActivePage("debts");
            setOpenDebtModal(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenSmsParser={() => setSmsParserOpen(true)}
          pendingSalaryCount={pendingSalaryCount}
          t={t}
        />
      )}

      {/* Smart SMS Parser Modal */}
      <SmsParserModal
        isOpen={smsParserOpen}
        onClose={() => setSmsParserOpen(false)}
        onParsedExpense={(parsed) => {
          setExpenseForm((prev) => ({
            ...prev,
            title: parsed.title,
            amount: String(parsed.amount),
            category: parsed.category,
            description: parsed.description,
            expense_date: parsed.date,
          }));
          setActivePage("expenses");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        t={t}
      />

      {/* Security PIN Lock Screen */}
      <PinLockModal
        isLocked={isPinLocked}
        onUnlock={() => setIsPinLocked(false)}
        t={t}
      />
    </div>
  );
}

// ── DELETE CONFIRM MODAL ───────────────────────────────────────────────────
function DeleteConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">⚠</div>
        <h3>Confirm Delete</h3>
        <p>{message}</p>
        <div className="delete-modal-actions">
          <button className="ghost-btn" onClick={onCancel}>Cancel</button>
          <button className="danger-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── RESET CODE MODAL ───────────────────────────────────────────────────────
function ResetCodeModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="reset-code-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rcm-header">
          <div className="rcm-icon">🔑</div>
          <div>
            <h3>Password Reset Code</h3>
            <p>Generated for <strong>{data.fullName}</strong> (@{data.username})</p>
          </div>
          <button className="rcm-close" onClick={onClose}>×</button>
        </div>

        <div className="rcm-body">
          <div className="rcm-code-label">One-time reset code</div>
          <div className="rcm-code-box">
            <span className="rcm-code">{data.code}</span>
            <button
              className={`rcm-copy-btn ${copied ? "copied" : ""}`}
              onClick={handleCopy}
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

          <div className="rcm-warning">
            <span>⏱</span>
            <span>
              Expires in <strong>{data.expiresInMinutes} minutes</strong>.
              Share this code securely — it will only be shown once.
            </span>
          </div>

          <div className="rcm-steps">
            <div className="rcm-step">
              <div className="rcm-step-num">1</div>
              <span>Share this code securely with the user</span>
            </div>
            <div className="rcm-step">
              <div className="rcm-step-num">2</div>
              <span>User goes to "Forgot password" on login page</span>
            </div>
            <div className="rcm-step">
              <div className="rcm-step-num">3</div>
              <span>User enters this code and sets a new password</span>
            </div>
          </div>
        </div>

        <div className="rcm-footer">
          <button className="primary-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function DashboardPage({
  expenses = [],
  totalExpenses = 0,
  totalSalary = 0,
  paidSalary = 0,
  pendingSalary = 0,
  netBalance = 0,
  savingsRate = 0,
  formatMoney = (v) => `৳ ${Number(v || 0).toLocaleString("en-BD")}`,
  setActivePage = () => {},
  loadExpenses = () => {},
  getCategoryIcon = () => "•",
  upcomingExpenses = [],
  t = {},
}) {
  const recentExpenses = (expenses || []).slice(0, 5);

  const categoryData = useMemo(() => {
    const grouped = {};
    (expenses || []).forEach((expense) => {
      const category = expense.category || "Other";
      grouped[category] = (grouped[category] || 0) + Number(expense.amount || 0);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const safeSalary = Number(totalSalary || 0);
  const safePaid = Number(paidSalary || 0);
  const paidPercentage =
    safeSalary > 0 ? Math.round((safePaid / safeSalary) * 100) : 0;
  const safeSavingsRate = Number(savingsRate || 0);

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
            <button className="primary-btn" onClick={() => setActivePage("expenses")}>
              {t?.addExpenseBtn || "+ Add Expense"}
            </button>
            <button className="ghost-btn hero-ghost" onClick={() => setActivePage("reports")}>
              View Reports →
            </button>
          </div>
        </div>

        <div className="hero-balance">
          <span>{t?.netBalance ? t.netBalance.toUpperCase() : "NET BALANCE"}</span>
          <strong>{formatMoney(netBalance)}</strong>
          <div className="balance-line">
            <div style={{ width: `${Math.max(4, Math.min(100, safeSavingsRate))}%` }} />
          </div>
          <small>{safeSavingsRate.toFixed(0)}% of salary remaining</small>
        </div>
      </section>

      {upcomingExpenses && upcomingExpenses.length > 0 && (
        <section className="upcoming-alerts fade-in" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--brand-primary)" }}>
            <span style={{ fontSize: "1.2rem" }}>🔔</span>
            <strong style={{ fontSize: "1.1rem" }}>Upcoming Bills (Next 7 Days)</strong>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {upcomingExpenses.map((exp) => (
              <div key={`upcoming-${exp.id}`} className="alert-card" style={{ background: "rgba(79, 70, 229, 0.05)", border: "1px solid rgba(79, 70, 229, 0.15)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--brand-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                    {getCategoryIcon(exp.category)}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "1.05rem", marginBottom: "4px" }}>{exp.title}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span>Due on: {new Date(exp.next_due_date).toLocaleDateString()}</span>
                      <span style={{ background: "var(--bg-tertiary)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                        {exp.recurrence_frequency}
                      </span>
                    </div>
                  </div>
                </div>
                <strong style={{ color: "var(--text-primary)", fontSize: "1.1rem" }}>{formatMoney(exp.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="stats-grid">
        <StatCard icon="↘" label={t?.totalExpenses || "Total Expenses"} value={formatMoney(totalExpenses)} tone="purple" />
        <StatCard icon="৳" label={t?.totalSalary || "Total Salary"} value={formatMoney(totalSalary)} tone="green" />
        <StatCard icon="◫" label={t?.transactionsCount || "Transactions"} value={expenses.length} tone="blue" />
        <StatCard icon="✓" label={t?.paidSalary || "Paid Salary"} value={formatMoney(paidSalary)} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <section className="content-card large">
          <CardHeader
            title={t?.recentExpenses || "Recent expenses"}
            subtitle="Your latest financial activity"
            action={
              <button className="text-btn" onClick={() => setActivePage("expenses")}>
                View all →
              </button>
            }
          />

          {recentExpenses.length > 0 ? (
            <div className="transaction-list">
              {recentExpenses.map((expense) => (
                <div className="transaction" key={expense.id}>
                  <div className="transaction-icon">{getCategoryIcon ? getCategoryIcon(expense.category) : "•"}</div>
                  <div className="transaction-main">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <strong>{expense.title}</strong>
                      {expense.quantity != null && expense.unit_price != null && (
                        <span style={{
                          fontSize: "0.7rem",
                          background: "rgba(99, 102, 241, 0.12)",
                          color: "#818cf8",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: "500",
                        }}>
                          {expense.quantity} pcs × ৳{expense.unit_price}
                        </span>
                      )}
                    </div>
                    <span>{expense.category} · {expense.expense_date}</span>
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
              title={t?.noExpensesYet || "No expenses yet"}
              text="Your recent transactions will appear here."
              action={
                <button className="primary-btn small" onClick={() => setActivePage("expenses")}>
                  {t?.addFirstExpense || "Add your first expense"}
                </button>
              }
            />
          )}

          {expenses.length > 0 && (
            <button className="refresh-link" onClick={loadExpenses}>
              ↻ {t?.refresh || "Refresh data"}
            </button>
          )}
        </section>

        <section className="content-card">
          <CardHeader title="Salary status" subtitle="Current income position" />

          <div
            className="salary-ring"
            style={{
              background: `conic-gradient(#10b981 ${paidPercentage * 3.6}deg, #edf2f7 0deg)`,
            }}
          >
            <div className="ring-inner">
              <strong>{paidPercentage}%</strong>
              <span>paid</span>
            </div>
          </div>

          <div className="mini-stats">
            <div>
              <span><i className="dot green" />Paid</span>
              <strong>{formatMoney(paidSalary)}</strong>
            </div>
            <div>
              <span><i className="dot orange" />Pending</span>
              <strong>{formatMoney(pendingSalary)}</strong>
            </div>
          </div>
        </section>

        <section className="content-card">
          <CardHeader title="Expense categories" subtitle="Where your money goes" />

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
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="category-list">
                {categoryData.slice(0, 4).map((item, index) => (
                  <div key={item.name}>
                    <span>
                      <i className="category-dot" style={{ background: COLORS[index % COLORS.length] }} />
                      {item.name}
                    </span>
                    <strong>{formatMoney(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon="◌" title="No category data" text="Add expenses to see the breakdown." />
          )}
        </section>
      </div>
    </div>
  );
}
const Dashboard = DashboardPage;

// ── EXPENSES PAGE ──────────────────────────────────────────────────────────
function ExpensesPage({
  expenses = [],
  allExpenses = [],
  totalExpenses = 0,
  averageExpense = 0,
  expenseForm = {},
  editingExpenseId = null,
  loading = false,
  expenseSearch = "",
  setExpenseSearch = () => {},
  expenseCategory = "All",
  setExpenseCategory = () => {},
  expenseDateFrom = "",
  setExpenseDateFrom = () => {},
  expenseDateTo = "",
  setExpenseDateTo = () => {},
  handleExpenseChange = () => {},
  handleExpenseSubmit = () => {},
  handleEditExpense = () => {},
  handleDeleteExpense = () => {},
  resetExpenseForm = () => {},
  loadExpenses = () => {},
  formatMoney = (v) => `৳ ${Number(v || 0).toLocaleString("en-BD")}`,
  exportCSV = () => {},
  exportPDF = null,
  pdfLoading = false,
  isAdminView = false,
  expenseScope = "my",
  setExpenseScope = () => {},
  drillUser = null,
  clearDrill = () => {},
  onOpenSmsParser = () => {},
  customCategories = [],
  t = {},
}) {
  const defaultCategories = [
    "Utilities", "Food", "Transport", "Office",
    "Shopping", "Entertainment", "Medical", "Room Rent", "Cigarette Bill", "Other",
  ];
  const categories = ["All", ...new Set([...defaultCategories, ...customCategories.map(c => c.name)])];
  const formCategories = [...new Set([...defaultCategories, ...customCategories.map(c => c.name)])];

  const PIECE_BASED_CATEGORIES = ["Cigarette Bill", "Food", "Shopping"];
  const [showQuantity, setShowQuantity] = useState(false);
  const [expenseView, setExpenseView] = useState("list"); // "list" | "calendar"
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calSelectedDay, setCalSelectedDay] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const handleReceiptFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploadingReceipt(true);
    try {
      const response = await fetch(`${API}/api/expenses/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed");
      handleExpenseChange({ target: { name: "receipt_url", value: data.url } });
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Build calendar data
  const allExpenses_raw = expenses; // already filtered
  const expensesByDate = useMemo(() => {
    const map = {};
    allExpenses_raw.forEach((e) => {
      if (!e.expense_date) return;
      const d = e.expense_date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [allExpenses_raw]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const isPieceCategory = PIECE_BASED_CATEGORIES.includes(expenseForm?.category);
  const shouldShowQuantity = isPieceCategory || Boolean(expenseForm.quantity || expenseForm.unit_price) || showQuantity;

  const clearFilters = () => {
    setExpenseSearch("");
    setExpenseCategory("All");
    setExpenseDateFrom("");
    setExpenseDateTo("");
  };

  const hasFilters = expenseSearch || expenseCategory !== "All" || expenseDateFrom || expenseDateTo;

  return (
    <div className="page-container">
      {drillUser && (
        <div className="content-card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>👤</span>
            <div>
              <strong style={{ fontSize: "14px", display: "block" }}>Viewing expenses for: {drillUser.name || drillUser.username || drillUser.email}</strong>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Showing filtered records for specific user</span>
            </div>
          </div>
          <button className="ghost-btn small" onClick={clearDrill}>×</button>
        </div>
      )}

      <div className="stats-grid compact">
        <StatCard icon="↘" label="Total Expenses" value={formatMoney(totalExpenses)} tone="purple" />
        <StatCard icon="◫" label="Shown" value={expenses.length} tone="blue" />
        <StatCard icon="≈" label="Average Expense" value={formatMoney(averageExpense)} tone="orange" />
        <StatCard icon="▦" label="Categories" value={new Set(expenses.map((e) => e.category)).size} tone="green" />
      </div>

      <section className="content-card form-card">
        <CardHeader
          title={editingExpenseId ? "Edit expense" : "Add new expense"}
          subtitle="Record and manage your spending"
          action={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={onOpenSmsParser}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-primary, #6366f1)", fontWeight: 600, fontSize: "0.82rem" }}
              >
                <span>⚡</span> {t.smsParserBtn || "SMS Parser"}
              </button>
              {editingExpenseId ? (
                <button className="ghost-btn" onClick={() => { resetExpenseForm(); setShowQuantity(false); }}>Cancel</button>
              ) : null}
            </div>
          }
        />

        <form className="modern-form" onSubmit={handleExpenseSubmit}>
          <Field
            label="Expense title"
            name="title"
            value={expenseForm.title}
            onChange={handleExpenseChange}
            placeholder={isPieceCategory ? "e.g. Benson & Hedges, Tea, Snacks" : "e.g. Room Rent, Electricity Bill, Internet"}
          />
          <SelectField label="Category" name="category" value={expenseForm.category} onChange={handleExpenseChange} options={categories.slice(1)} />

          {shouldShowQuantity ? (
            <>
              <Field label="Quantity / সংখ্যা (Pcs)" name="quantity" type="number" min="0" step="any" value={expenseForm.quantity} onChange={handleExpenseChange} placeholder="e.g. 5" />
              <Field label="Price per piece / প্রতি পিসের দাম (৳)" name="unit_price" type="number" min="0" step="any" value={expenseForm.unit_price} onChange={handleExpenseChange} placeholder="e.g. 15" />
              <Field label="Total Amount / মোট টাকা (৳)" name="amount" type="number" min="0" step="any" value={expenseForm.amount} onChange={handleExpenseChange} placeholder="e.g. 75" />
            </>
          ) : (
            <Field label="Total Amount / মোট টাকা (৳)" name="amount" type="number" min="0" step="any" value={expenseForm.amount} onChange={handleExpenseChange} placeholder="e.g. 8000" />
          )}

          <Field label="Expense date" name="expense_date" type="date" value={expenseForm.expense_date} onChange={handleExpenseChange} />

          {shouldShowQuantity && Boolean(expenseForm.quantity && expenseForm.unit_price && !isNaN(Number(expenseForm.quantity)) && !isNaN(Number(expenseForm.unit_price))) && (
            <div className="form-field full" style={{ marginTop: "-6px", marginBottom: "4px" }}>
              <span style={{
                fontSize: "0.82rem",
                color: "#818cf8",
                background: "rgba(99, 102, 241, 0.1)",
                padding: "6px 12px",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(99, 102, 241, 0.2)"
              }}>
                ✨ হিসাব: {expenseForm.quantity} pcs × ৳{expenseForm.unit_price} = ৳{(Number(expenseForm.quantity) * Number(expenseForm.unit_price)).toFixed(2)}
              </span>
            </div>
          )}

          {!shouldShowQuantity && (
            <div className="form-field full" style={{ marginTop: "-8px", marginBottom: "4px" }}>
              <button
                type="button"
                onClick={() => setShowQuantity(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-primary, #6366f1)",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  opacity: 0.85
                }}
              >
                + পিস / পরিমাণ অনুযায়ী হিসাব যোগ করুন (ঐচ্ছিক)
              </button>
            </div>
          )}

          {/* Recurring Expense Field */}
          <div className="form-field full" style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-subtle)", margin: "4px 0 10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.85rem", userSelect: "none" }}>
              <input
                type="checkbox"
                name="is_recurring"
                checked={Boolean(expenseForm.is_recurring)}
                onChange={(e) => handleExpenseChange({ target: { name: "is_recurring", value: e.target.checked } })}
                style={{ width: "16px", height: "16px", accentColor: "var(--brand-primary)" }}
              />
              <span>🔁 Recurring Expense / নিয়মিত নির্দিষ্ট মেয়াদের খরচ</span>
            </label>
            {expenseForm.is_recurring && (
              <select
                name="recurrence_frequency"
                value={expenseForm.recurrence_frequency || "monthly"}
                onChange={handleExpenseChange}
                style={{ padding: "5px 10px", borderRadius: "6px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: "0.82rem" }}
              >
                <option value="monthly">Monthly / প্রতি মাসে</option>
                <option value="weekly">Weekly / প্রতি সপ্তাহে</option>
                <option value="daily">Daily / প্রতিদিন</option>
                <option value="yearly">Yearly / প্রতি বছর</option>
              </select>
            )}
          </div>

          {/* Receipt Upload Field */}
          <div className="form-field full" style={{ margin: "2px 0 10px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem" }}>🧾 Attach Receipt / Bill Image (মেমো/মেমো ছবি)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label className="ghost-btn" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", padding: "6px 12px" }}>
                📎 {uploadingReceipt ? "Uploading Image..." : "Choose Receipt Image / PDF"}
                <input type="file" accept="image/*,.pdf" onChange={handleReceiptFile} disabled={uploadingReceipt} style={{ display: "none" }} />
              </label>
              {expenseForm.receipt_url && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "4px 10px", borderRadius: "6px" }}>
                  <a href={`${API}${expenseForm.receipt_url}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#10b981", textDecoration: "underline" }}>
                    📄 View Uploaded Receipt
                  </a>
                  <button
                    type="button"
                    onClick={() => handleExpenseChange({ target: { name: "receipt_url", value: "" } })}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                    title="Remove receipt"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

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
              {loading ? "Saving..." : editingExpenseId ? "Update Expense" : "+ Add Expense"}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader
          title={`Expense records${isAdminView ? " (All Users)" : ""}`}
          subtitle={`${expenses.length} transaction${expenses.length === 1 ? "" : "s"}`}
          action={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {/* View Toggle */}
              <div className="view-toggle">
                <button className={`view-toggle-btn${expenseView === "list" ? " active" : ""}`} onClick={() => setExpenseView("list")}>☰ List</button>
                <button className={`view-toggle-btn${expenseView === "calendar" ? " active" : ""}`} onClick={() => setExpenseView("calendar")}>📅 Calendar</button>
              </div>
              <button className="export-btn csv" onClick={exportCSV} title="Export to CSV">↓ CSV</button>
              {exportPDF && (
                <button className="export-btn pdf" onClick={exportPDF} disabled={pdfLoading} title="Export PDF">
                  {pdfLoading ? "..." : "↓ PDF"}
                </button>
              )}
              <button className="ghost-btn" onClick={loadExpenses}>↻ Refresh</button>
            </div>
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

          <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="filter-select">
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <input
            type="date"
            className="filter-select"
            value={expenseDateFrom}
            onChange={(e) => setExpenseDateFrom(e.target.value)}
            title="From date"
          />
          <input
            type="date"
            className="filter-select"
            value={expenseDateTo}
            onChange={(e) => setExpenseDateTo(e.target.value)}
            title="To date"
          />

          {hasFilters && (
            <button className="ghost-btn small" onClick={clearFilters}>
              × Clear
            </button>
          )}
        </div>

        {expenseView === "calendar" ? (
          // ── Calendar View ──
          <div>
            <div className="calendar-nav">
              <button onClick={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }}>‹</button>
              <h3>{new Date(calYear, calMonth).toLocaleString("en-US", { month: "long", year: "numeric" })}</h3>
              <button onClick={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }}>›</button>
            </div>

            <div className="calendar-grid">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="calendar-day-label">{d}</div>
              ))}
              {(() => {
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const daysInPrev = new Date(calYear, calMonth, 0).getDate();
                const cells = [];
                for (let i = firstDay - 1; i >= 0; i--) {
                  cells.push(<div key={`prev-${i}`} className="calendar-cell other-month"><span className="cal-date">{daysInPrev - i}</span></div>);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const dayExps = expensesByDate[dateStr] || [];
                  const dayTotal = dayExps.reduce((s, e) => s + Number(e.amount || 0), 0);
                  const isToday = dateStr === todayStr;
                  const hasExp = dayExps.length > 0;
                  const isSelected = calSelectedDay === dateStr;
                  cells.push(
                    <div
                      key={day}
                      className={`calendar-cell${isToday ? " today" : ""}${hasExp ? " has-expense" : ""}${isSelected ? " selected" : ""}`}
                      onClick={() => setCalSelectedDay(isSelected ? null : dateStr)}
                    >
                      <span className="cal-date">{day}</span>
                      {hasExp && <span className="cal-amount">- {formatMoney(dayTotal)}</span>}
                    </div>
                  );
                }
                const totalCells = cells.length;
                const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                for (let i = 1; i <= remaining; i++) {
                  cells.push(<div key={`next-${i}`} className="calendar-cell other-month"><span className="cal-date">{i}</span></div>);
                }
                return cells;
              })()}
            </div>

            {calSelectedDay && expensesByDate[calSelectedDay] && (
              <div className="calendar-day-detail">
                <h4>{new Date(calSelectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h4>
                <div className="cal-expense-list">
                  {expensesByDate[calSelectedDay].map((e) => (
                    <div key={e.id} className="cal-expense-row">
                      <span>{getCategoryIcon(e.category)} {e.title}</span>
                      <strong style={{ color: "var(--danger)" }}>- {formatMoney(e.amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // ── List View ──
          <>
        {expenses.length > 0 ? (
          <div className="records-table">
            <div className={`table-head ${isAdminView ? "admin-head" : ""}`}>
              <span>EXPENSE</span>
              <span>CATEGORY</span>
              <span>DATE</span>
              {isAdminView && <span>USER</span>}
              <span>AMOUNT</span>
              <span>ACTIONS</span>
            </div>

            {expenses.map((expense) => (
              <div className={`table-row ${isAdminView ? "admin-row" : ""}`} key={expense.id}>
                <div className="table-title">
                  <div className="table-icon">{getCategoryIcon(expense.category)}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <strong>{expense.title}</strong>
                      {expense.quantity != null && expense.unit_price != null && (
                        <span style={{
                          fontSize: "0.72rem",
                          background: "rgba(99, 102, 241, 0.15)",
                          color: "#818cf8",
                          padding: "2px 7px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          border: "1px solid rgba(99, 102, 241, 0.25)",
                        }}>
                          {expense.quantity} pcs × ৳{expense.unit_price}
                        </span>
                      )}
                      {expense.is_recurring && (
                        <span style={{
                          fontSize: "0.72rem",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          padding: "2px 7px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          border: "1px solid rgba(245, 158, 11, 0.25)",
                        }}>
                          🔁 {expense.recurrence_frequency || "Recurring"}
                        </span>
                      )}
                      {expense.receipt_url && (
                        <button
                          type="button"
                          onClick={() => setReceiptPreviewUrl(expense.receipt_url)}
                          style={{
                            fontSize: "0.72rem",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            padding: "2px 7px",
                            borderRadius: "6px",
                            fontWeight: "600",
                            border: "1px solid rgba(16, 185, 129, 0.25)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          🧾 Receipt
                        </button>
                      )}
                    </div>
                    <small>{expense.description || "No description"}</small>
                  </div>
                </div>

                <span className="category-badge">{expense.category}</span>
                <span className="muted">{expense.expense_date}</span>
                {isAdminView && (
                  <span className="muted user-name-badge">{expense.user_name || "—"}</span>
                )}
                <strong className="amount-negative">- {formatMoney(expense.amount)}</strong>

                <div className="action-buttons">
                  <button type="button" className="icon-btn edit" onClick={() => handleEditExpense(expense)} title="Edit">✎</button>
                  <button type="button" className="icon-btn delete" onClick={() => handleDeleteExpense(expense.id)} title="Delete">×</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="◫" title="No matching expenses" text="Try another search or add a new expense." />
        )}
          </>
        )}
      </section>

      {/* Lightbox Modal for Receipt Image Preview */}
      {receiptPreviewUrl && (
        <div className="modal-overlay" onClick={() => setReceiptPreviewUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-secondary, #1e293b)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "24px", maxWidth: "650px", width: "100%", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🧾 Receipt / Bill Preview</h3>
              <button className="ghost-btn small" onClick={() => setReceiptPreviewUrl(null)} style={{ padding: "4px 10px", fontSize: "16px" }}>×</button>
            </div>
            <div style={{ margin: "12px 0", maxHeight: "65vh", overflow: "auto", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "#000" }}>
              {receiptPreviewUrl.endsWith(".pdf") ? (
                <iframe src={`${API}${receiptPreviewUrl}`} title="Receipt PDF" style={{ width: "100%", height: "500px", border: "none" }} />
              ) : (
                <img src={`${API}${receiptPreviewUrl}`} alt="Receipt" style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" }} />
              )}
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
              <a href={`${API}${receiptPreviewUrl}`} target="_blank" rel="noreferrer" className="primary-btn" style={{ textDecoration: "none", fontSize: "0.85rem", padding: "8px 16px" }}>Open Original ↗</a>
              <button className="ghost-btn" onClick={() => setReceiptPreviewUrl(null)} style={{ padding: "8px 16px" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SALARY PAGE ────────────────────────────────────────────────────────────
function SalaryPage({
  salaries = [],
  allSalaries = [],
  totalSalary = 0,
  paidSalary = 0,
  pendingSalary = 0,
  salaryForm = {},
  editingSalaryId = null,
  loading = false,
  salaryDateFrom = "",
  setSalaryDateFrom = () => {},
  salaryDateTo = "",
  setSalaryDateTo = () => {},
  handleSalaryChange = () => {},
  handleSalarySubmit = () => {},
  handleEditSalary = () => {},
  handleDeleteSalary = () => {},
  resetSalaryForm = () => {},
  loadSalaries = () => {},
  formatMoney = (v) => `৳ ${Number(v || 0).toLocaleString("en-BD")}`,
  exportSalariesCSV = null,
  isAdminView = false,
  t = {},
}) {
  const clearFilters = () => { setSalaryDateFrom(""); setSalaryDateTo(""); };
  const hasFilters = salaryDateFrom || salaryDateTo;

  return (
    <div className="page-container">
      <div className="stats-grid compact">
        <StatCard icon="৳" label={t?.totalSalary || "Total Salary"} value={formatMoney(totalSalary)} tone="green" />
        <StatCard icon="✓" label={t?.paidSalary || "Paid Salary"} value={formatMoney(paidSalary)} tone="blue" />
        <StatCard icon="◷" label={t?.pendingSalary || "Pending Salary"} value={formatMoney(pendingSalary)} tone="orange" />
        <StatCard icon="◫" label={t?.salaryRecords || "Records"} value={(salaries || []).length} tone="purple" />
      </div>

      <section className="content-card form-card">
        <CardHeader
          title={editingSalaryId ? (t?.editSalary || "Edit salary") : (t?.addNewSalary || "Add new salary")}
          subtitle="Track monthly income records"
          action={
            editingSalaryId ? (
              <button className="ghost-btn" onClick={resetSalaryForm}>{t?.cancel || "Cancel"}</button>
            ) : null
          }
        />

        <form className="modern-form" onSubmit={handleSalarySubmit}>
          <Field label={t?.amountLabel || "Salary amount"} name="amount" type="number" min="0" value={salaryForm.amount} onChange={handleSalaryChange} placeholder="30000" />
          <Field label={t?.salaryMonth || "Salary month"} name="salary_month" type="date" value={salaryForm.salary_month} onChange={handleSalaryChange} />
          <Field label={t?.paymentDate || "Payment date"} name="payment_date" type="date" value={salaryForm.payment_date} onChange={handleSalaryChange} required={false} />
          <SelectField
            label={t?.statusLabel || "Payment status"}
            name="status"
            value={salaryForm.status}
            onChange={handleSalaryChange}
            options={[
              { value: "paid", label: t?.paid || "Paid" },
              { value: "pending", label: t?.pending || "Pending" },
            ]}
          />

          <div className="form-field full">
            <label>{t?.description || "Description"}</label>
            <textarea
              name="description"
              value={salaryForm.description}
              onChange={handleSalaryChange}
              placeholder="August 2026 Salary"
            />
          </div>

          <div className="form-submit">
            <button className="primary-btn" disabled={loading}>
              {loading ? (t?.saving || "Saving...") : editingSalaryId ? (t?.updateSalaryBtn || "Update Salary") : (t?.addSalaryBtn || "+ Add Salary")}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader
          title={`${t?.salaryRecords || "Salary records"}${isAdminView ? " (All Users)" : ""}`}
          subtitle={`${salaries.length} ${t?.transactionsCount || "records"}`}
          action={
            <div style={{ display: "flex", gap: "8px" }}>
              {exportSalariesCSV && (
                <button className="export-btn csv" onClick={exportSalariesCSV} title="Export to CSV">
                  ↓ CSV
                </button>
              )}
              <button className="ghost-btn" onClick={loadSalaries}>↻ {t?.refresh || "Refresh"}</button>
            </div>
          }
        />

        <div className="filter-bar">
          <input
            type="date"
            className="filter-select"
            value={salaryDateFrom}
            onChange={(e) => setSalaryDateFrom(e.target.value)}
            title="From month"
          />
          <input
            type="date"
            className="filter-select"
            value={salaryDateTo}
            onChange={(e) => setSalaryDateTo(e.target.value)}
            title="To month"
          />
          {hasFilters && (
            <button className="ghost-btn small" onClick={clearFilters}>{t?.clearFilters || "× Clear"}</button>
          )}
        </div>

        {salaries.length > 0 ? (
          <div className="salary-list">
            {salaries.map((salary) => (
              <div className="salary-record" key={salary.id}>
                <div className="salary-record-icon">৳</div>
                <div className="salary-record-main">
                  <strong>{salary.description || "Salary Record"}</strong>
                  <span>{t?.salaryMonth || "Salary month"}: {salary.salary_month}</span>
                  {isAdminView && salary.user_name && (
                    <span className="muted" style={{ fontSize: "12px" }}>
                      Employee: {salary.user_name}
                    </span>
                  )}
                  <small>{t?.paymentDate || "Payment date"}: {salary.payment_date || "Not paid yet"}</small>
                </div>
                <div className="salary-record-right">
                  <span className={salary.status === "paid" ? "status-badge paid" : "status-badge pending"}>
                    {salary.status === "paid" ? (t?.paid || "PAID") : (t?.pending || "PENDING")}
                  </span>
                  <strong>{formatMoney(salary.amount)}</strong>
                  <div className="action-buttons">
                    <button type="button" className="icon-btn edit" onClick={() => handleEditSalary(salary)}>✎</button>
                    <button type="button" className="icon-btn delete" onClick={() => handleDeleteSalary(salary.id)}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="৳" title={t?.noMatchingSalary || "No salary records"} text="Add your first salary record to start tracking income." />
        )}
      </section>
    </div>
  );
}

// ── REPORTS PAGE ───────────────────────────────────────────────────────────
function ReportsPage({
  totalExpenses = 0,
  totalSalary = 0,
  paidSalary = 0,
  pendingSalary = 0,
  netBalance = 0,
  categoryData = [],
  timelineData = [],
  monthlyData = [],
  formatMoney = (v) => `৳ ${Number(v || 0).toLocaleString("en-BD")}`,
  exportPDF = null,
  exportCSV = null,
  pdfLoading = false,
  t = {},
}) {
  const comparisonData = [{ name: "Overview", Salary: totalSalary, Expenses: totalExpenses }];

  return (
    <div className="page-container">
      <div className="stats-grid">
        <StatCard icon="৳" label={t?.totalSalary || "Total Salary"} value={formatMoney(totalSalary)} tone="green" />
        <StatCard icon="↘" label={t?.totalExpenses || "Total Expenses"} value={formatMoney(totalExpenses)} tone="purple" />
        <StatCard icon="◈" label={t?.netBalance || "Net Balance"} value={formatMoney(netBalance)} tone="blue" />
        <StatCard icon="◷" label={t?.pendingSalary || "Pending Salary"} value={formatMoney(pendingSalary)} tone="orange" />
      </div>

      {exportPDF && (
        <section className="content-card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}>
          <div>
            <strong style={{ fontSize: "15px" }}>Export Financial Report</strong>
            <p style={{ fontSize: "13px" }}>Download a complete PDF report with charts and data</p>
          </div>
            <button className="export-btn pdf" onClick={exportPDF} disabled={pdfLoading}>
              {pdfLoading ? "Generating..." : "↓ Download PDF"}
            </button>
            <button className="export-btn outline" onClick={exportCSV} style={{ marginLeft: '12px' }}>
              ↓ Download CSV
            </button>
          </section>
      )}

      {/* Monthly Trend */}
      {monthlyData.length > 0 && (
        <section className="content-card">
          <CardHeader title={t?.monthlyOverview || "Monthly trend"} subtitle="Income vs expenses per month" />
          <div className="chart-box timeline">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="salary" name={t?.salary || "Salary"} fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name={t?.expenses || "Expenses"} fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="reports-grid">
        <section className="content-card">
          <CardHeader title="Salary vs expenses" subtitle="Overall financial comparison" />
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Legend />
                <Bar dataKey="Salary" name={t?.salary || "Salary"} fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expenses" name={t?.expenses || "Expenses"} fill="#7c3aed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="content-card">
          <CardHeader title={t?.spendingByCategory || "Expense distribution"} subtitle="Spending by category" />
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
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="◌" title={t?.noCategoryData || "No data available"} text="Add expenses to generate analytics." />
            )}
          </div>
        </section>
      </div>

      <section className="content-card">
        <CardHeader title={t?.financialTimeline || "Expense timeline"} subtitle="Spending activity by date" />
        <div className="chart-box timeline">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Line type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="⌁" title={t?.noTimelineData || "No timeline data"} text="Expense activity will appear here." />
          )}
        </div>
      </section>

      <section className="content-card">
        <CardHeader title="Financial summary" subtitle="Your overall financial position" />
        <div className="summary-grid">
          <SummaryItem label={t?.totalSalary || "Total Salary"} value={totalSalary} />
          <SummaryItem label={t?.paidSalary || "Paid Salary"} value={paidSalary} />
          <SummaryItem label={t?.pendingSalary || "Pending Salary"} value={pendingSalary} />
          <SummaryItem label={t?.totalExpenses || "Total Expenses"} value={totalExpenses} />
          <SummaryItem label={t?.netBalance || "Net Balance"} value={netBalance} highlight />
        </div>
      </section>
    </div>
  );
}

// ── PROFILE PAGE ───────────────────────────────────────────────────────────
function ProfilePage({
  currentUser = null,
  profileForm = {},
  handleProfileChange = () => {},
  handleProfileSubmit = () => {},
  loading = false,
  getRoleLabel = () => "User",
  t = {},
}) {
  const roleText = (getRoleLabel && getRoleLabel(currentUser)) || "USER";

  return (
    <div className="page-container fade-in" style={{ paddingBottom: 60 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(16, 185, 129, 0.05))",
        borderRadius: "24px",
        padding: "40px",
        display: "flex",
        alignItems: "center",
        gap: "24px",
        marginBottom: "32px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)"
      }}>
        <div style={{
          width: "100px",
          height: "100px",
          borderRadius: "30%",
          background: "linear-gradient(135deg, #4f46e5, #ec4899)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "40px",
          fontWeight: "bold",
          boxShadow: "0 10px 25px -5px rgba(236, 72, 153, 0.4)",
          textShadow: "0 2px 4px rgba(0,0,0,0.2)"
        }}>
          {(currentUser?.full_name || currentUser?.username || "U").charAt(0).toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
            {currentUser?.full_name || currentUser?.username || "User"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "600",
              letterSpacing: "1px",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.05)"
            }}>
              {roleText.toUpperCase()}
            </span>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "1rem" }}>
              @{currentUser?.username || "user"}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        <section className="content-card form-card" style={{ background: "var(--bg-secondary)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.03)", padding: "32px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)" }}>
          <div style={{ marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "20px" }}>
            <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary)", marginBottom: "4px" }}>{t?.profileSettings || "Personal information"}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{t?.personalInfoSubtitle || "Update your profile details"}</p>
          </div>

        <form className="modern-form" onSubmit={handleProfileSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
            <Field
              label={t?.fullName || "Full name"}
              name="full_name"
              value={profileForm.full_name}
              onChange={handleProfileChange}
              placeholder="John Doe"
            />
            <Field
              label={t?.emailAddress || "Email address"}
              name="email"
              type="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              placeholder="john@example.com"
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <SelectField
              label={t?.language || "Language / ভাষা"}
              name="language"
              value={profileForm.language || "en"}
              onChange={handleProfileChange}
              options={[
                { value: "en", label: "🇺🇸 English" },
                { value: "bn", label: "🇧🇩 বাংলা (Bangla)" },
              ]}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "32px 0 24px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
            <span style={{ fontSize: "0.85rem", color: "var(--brand-primary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>
              {t?.changePasswordOpt || "Security Settings"}
            </span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
            <Field
              label={t?.currentPassword || "Current password"}
              name="current_password"
              type="password"
              value={profileForm.current_password}
              onChange={handleProfileChange}
              placeholder="Required to change password"
              required={false}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <Field
                label={t?.newPassword || "New password"}
                name="new_password"
                type="password"
                value={profileForm.new_password}
                onChange={handleProfileChange}
                placeholder="At least 6 characters"
                required={false}
              />
              <Field
                label={t?.confirmNewPassword || "Confirm new password"}
                name="confirm_password"
                type="password"
                value={profileForm.confirm_password}
                onChange={handleProfileChange}
                placeholder="Re-enter new password"
                required={false}
              />
            </div>
          </div>

          <div className="form-submit" style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
            <button className="primary-btn" disabled={loading}>
              {loading ? (t?.updating || "Saving...") : (t?.saveChanges || "Save Changes")}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card" style={{ background: "var(--bg-secondary)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.03)", padding: "32px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)" }}>
        <div style={{ marginBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "20px" }}>
          <h3 style={{ fontSize: "1.4rem", color: "var(--text-primary)", marginBottom: "4px" }}>Account details</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Your account information</p>
        </div>
        <div className="account-details-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "20px" }}>
          <div className="account-detail-item" style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>{t?.username || "Username"}</span>
            <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>@{currentUser?.username}</strong>
          </div>
          <div className="account-detail-item" style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>{t?.role || "Role"}</span>
            <strong style={{ fontSize: "1.1rem", color: "var(--brand-primary)" }}>{getRoleLabel(currentUser)}</strong>
          </div>
          <div className="account-detail-item" style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>{t?.emailAddress || "Email"}</span>
            <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{currentUser?.email}</strong>
          </div>
          <div className="account-detail-item" style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>{t?.language || "Language"}</span>
            <strong style={{ fontSize: "1.1rem", color: "var(--text-primary)" }}>{profileForm.language === "bn" ? "🇧🇩 বাংলা" : "🇺🇸 English"}</strong>
          </div>
          <div className="account-detail-item" style={{ background: "var(--bg-tertiary)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Status</span>
            <strong style={{ color: "#10b981", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }}></span>
              Active
            </strong>
          </div>
        </div>
      </section>

      {/* Security & App Preferences */}
      <section className="content-card">
        <CardHeader
          title={t?.pinLock || "Security & App Preferences"}
          subtitle={t?.pinLockDesc || "Configure 4-digit PIN lock and sound effects."}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "8px 0" }}>
          {/* PIN Lock Controller */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "14px 18px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "0.95rem" }}>
                <span>🔒</span>
                <span>{t?.pinLock || "4-Digit PIN Lock"}</span>
                {Boolean(localStorage.getItem("ef_pin_code")) ? (
                  <span style={{ fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>● Active</span>
                ) : (
                  <span style={{ fontSize: "0.72rem", background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(148, 163, 184, 0.3)" }}>Disabled</span>
                )}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {t?.pinLockDesc || "Require a 4-digit PIN every time the app opens"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {Boolean(localStorage.getItem("ef_pin_code")) ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    if (window.confirm("Disable PIN lock?")) {
                      localStorage.removeItem("ef_pin_code");
                      window.location.reload();
                    }
                  }}
                  style={{ color: "#ef4444", fontSize: "0.82rem" }}
                >
                  {t?.disablePin || "Disable PIN"}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    const newPin = window.prompt("Enter new 4-digit PIN (digits only):");
                    if (newPin && /^\d{4}$/.test(newPin.trim())) {
                      localStorage.setItem("ef_pin_code", newPin.trim());
                      alert(t?.pinSaved || "PIN saved successfully!");
                      window.location.reload();
                    } else if (newPin) {
                      alert("Please enter exactly 4 numbers (e.g. 1234).");
                    }
                  }}
                  style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                >
                  {t?.setPin || "Set 4-Digit PIN"}
                </button>
              )}
            </div>
          </div>

          {/* Sound Feedback Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "14px 18px", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🔊</span>
              <div>
                <strong style={{ fontSize: "0.92rem", display: "block" }}>{t?.soundFeedback || "Sound Feedback"}</strong>
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Play subtle chime sound when transactions are added</span>
              </div>
            </div>
            <label style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                defaultChecked={localStorage.getItem("ef_sound_enabled") !== "false"}
                onChange={(e) => {
                  localStorage.setItem("ef_sound_enabled", e.target.checked ? "true" : "false");
                }}
                style={{ width: "18px", height: "18px", accentColor: "var(--brand-primary, #6366f1)" }}
              />
            </label>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}

// ── ADMIN PAGE ─────────────────────────────────────────────────────────────
function AdminPage({
  users = [],
  totalUsers = 0,
  userSearch = "",
  setUserSearch = () => {},
  userForm = {},
  editingUserId = null,
  loading = false,
  handleUserChange = () => {},
  handleUserSubmit = () => {},
  handleEditUser = () => {},
  toggleUserStatus = () => {},
  handleDeleteUser = () => {},
  isSuperAdmin = false,
  resetUserForm = () => {},
  loadUsers = () => {},
  handleGenerateResetCode = () => {},
  currentUser = null,
  onViewExpenses = null,
  t = {},
}) {
  const activeUsers = (users || []).filter((user) => user.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;

  return (
    <div className="page-container">
      <div className="stats-grid compact">
        <StatCard icon="♙" label={t?.totalUsers || "Total Users"} value={totalUsers} tone="purple" />
        <StatCard icon="✓" label={t?.activeUsers || "Active Users"} value={activeUsers} tone="green" />
        <StatCard icon="○" label={t?.inactiveUsers || "Inactive Users"} value={inactiveUsers} tone="orange" />
        <StatCard icon="⚙" label={t?.workspace || "Workspace"} value="Admin" tone="blue" />
      </div>

      <section className="content-card form-card">
        <CardHeader
          title={editingUserId ? (t?.editUser || "Edit user") : (t?.createNewUser || "Create new user")}
          subtitle={t?.controlAccountsSubtitle || "Control accounts and access permissions"}
          action={
            editingUserId ? (
              <button className="ghost-btn" onClick={resetUserForm}>{t?.cancel || "Cancel"}</button>
            ) : null
          }
        />

        <form className="modern-form" onSubmit={handleUserSubmit}>
          <Field label={t?.username || "Username"} name="username" value={userForm.username} onChange={handleUserChange} placeholder="user@expenseflow.local" disabled={Boolean(editingUserId)} />
          <Field label={t?.emailAddress || "Email"} name="email" type="email" value={userForm.email} onChange={handleUserChange} placeholder="user@example.com" />
          <Field label={t?.fullName || "Full name"} name="full_name" value={userForm.full_name} onChange={handleUserChange} placeholder="John Doe" />
          <Field
            label={editingUserId ? (t?.passwordOptional || "New password (optional)") : (t?.passwordRequired || "Password")}
            name="password"
            type="password"
            value={userForm.password}
            onChange={handleUserChange}
            placeholder="••••••••"
            required={!editingUserId}
          />
          <SelectField
            label={t?.role || "Role"}
            name="role"
            value={userForm.role}
            onChange={handleUserChange}
            options={[
              { value: "user", label: t?.userRole || "User" },
              { value: "admin", label: t?.adminRole || "Admin" },
              ...(isSuperAdmin
                ? [{ value: "super_admin", label: t?.superAdminRole || "Super Admin" }]
                : []),
            ]}
          />

          <div className="form-submit">
            <button className="primary-btn" disabled={loading}>
              {loading ? (t?.saving || "Saving...") : editingUserId ? (t?.updateUserBtn || "Update User") : (t?.createUserBtn || "+ Create User")}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader
          title={t?.userManagement || "User management"}
          subtitle={t?.allOrgAccounts || "All organization accounts"}
          action={
            <button className="ghost-btn" onClick={loadUsers}>↻ {t?.refresh || "Refresh"}</button>
          }
        />

        <div className="filter-bar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t?.searchUsers || "Search users..."}
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
                    <small>{t?.username || "Username"}: {user.username}</small>
                  </div>
                </div>

                <div className="user-meta">
                  <span className="role-badge">
                    {user.role === "super_admin" ? (t?.superAdminRole || "Super Admin").toUpperCase() : user.role === "admin" ? (t?.adminRole || "Admin").toUpperCase() : (t?.userRole || "User").toUpperCase()}
                  </span>
                  <span className={user.is_active ? "status-badge active" : "status-badge inactive"}>
                    {user.is_active ? (t?.activeUsers || "ACTIVE") : (t?.inactiveUsers || "INACTIVE")}
                  </span>

                  <div className="action-buttons">
                    {user.role === "super_admin" && !isSuperAdmin ? (
                      <span style={{ fontSize: "0.78rem", fontStyle: "italic", opacity: 0.65, padding: "4px 8px" }} title="Only Super Admin can manage Super Admin accounts">
                        🔒 {t?.protectedBadge || "Protected"}
                      </span>
                    ) : (
                      <>
                        <button type="button" className="icon-btn edit" onClick={() => handleEditUser(user)}>✎</button>
                        <button type="button" className="action-btn" onClick={() => handleGenerateResetCode(user)} title="Generate a one-time password reset code">
                          {t?.resetCode || "Reset code"}
                        </button>
                        {onViewExpenses && (
                          <button type="button" className="action-btn" onClick={() => onViewExpenses(user)} title="View this user's expenses">
                            {t?.viewExpenses || "View Expenses"}
                          </button>
                        )}
                        <button
                          type="button"
                          className={user.is_active ? "action-btn danger" : "action-btn success"}
                          onClick={() => toggleUserStatus(user)}
                        >
                          {user.is_active ? (t?.deactivate || "Deactivate") : (t?.activate || "Activate")}
                        </button>
                        {isSuperAdmin && user.id !== currentUser?.id && (
                          <button
                            type="button"
                            className="icon-btn delete"
                            onClick={() => handleDeleteUser(user)}
                            title="Permanently delete this user and all their data"
                            style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                          >
                            🗑 {t?.delete || "Delete"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="♙" title={t?.noUsersFound || "No users found"} text="Try another search or create a new user." />
        )}
      </section>
    </div>
  );
}

// ── SHARED COMPONENTS ──────────────────────────────────────────────────────
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
  ...props
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
        {...props}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <select name={name} value={value} onChange={onChange}>
        {options.map((option) => {
          const item =
            typeof option === "string" ? { value: option, label: option } : option;
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

function StatCard({ icon, label, value, tone = "purple" }) {
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

function CardHeader({ title, subtitle, action }) {
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

function SummaryItem({ label, value, highlight = false }) {
  return (
    <div className={`summary-item ${highlight ? "highlight" : ""}`}>
      <span>{label}</span>
      <strong>৳ {Number(value || 0).toLocaleString("en-BD")}</strong>
    </div>
  );
}

function EmptyState({ icon, title, text, action }) {
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
    "Room Rent": "⌂",
    "Cigarette Bill": "♨",
    Other: "•",
  };
  return icons[category] || "•";
}

export default App;

// ── BUDGETS PAGE ────────────────────────────────────────────────────────────
function BudgetsPage({ budgets = [], formatMoney, handleSetBudget, handleDeleteBudget, customCategories = [], t = {} }) {
  const defaultCategories = ["Utilities","Food","Transport","Office","Shopping","Entertainment","Medical","Room Rent","Cigarette Bill","Other"];
  const categories = [...new Set([...defaultCategories, ...customCategories.map(c => c.name)])];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({ category: categories[0], month: currentMonth, monthly_limit: "" });
  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.monthly_limit || Number(form.monthly_limit) <= 0) return;
    setFormLoading(true);
    await handleSetBudget(form.category, form.month, Number(form.monthly_limit));
    setFormLoading(false);
    setForm((prev) => ({ ...prev, monthly_limit: "" }));
  };

  return (
    <div className="page-container">
      <section className="content-card form-card">
        <CardHeader title={t.budgetLimit || "Budget Limits"} subtitle={t.budgetSubtitle || "Set monthly spending limits per category"} />
        <form className="modern-form" onSubmit={handleSubmit}>
          <SelectField label={t.categoryLabel || "Category"} name="category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} options={categories} />
          <Field label={t.selectMonth || "Month"} name="month" type="month" value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} />
          <Field label={t.monthlyLimit || "Monthly Limit (৳)"} name="monthly_limit" type="number" min="1" step="any" value={form.monthly_limit} onChange={(e) => setForm((p) => ({ ...p, monthly_limit: e.target.value }))} placeholder="e.g. 10000" />
          <div className="form-submit">
            <button className="primary-btn" disabled={formLoading}>
              {formLoading ? "Saving..." : (t.setBudget || "Set Budget")}
            </button>
          </div>
        </form>
      </section>

      <section className="content-card">
        <CardHeader title={t.budgetLimit || "Your Budgets"} subtitle={`${budgets.length} budgets for ${currentMonth}`} />
        {budgets.length > 0 ? (
          <div className="budget-grid">
            {budgets.map((b) => {
              const pct = Math.min(100, b.percentage);
              const cls = b.is_over ? "over" : b.is_warning ? "warning" : "";
              const fillCls = b.is_over ? "over" : b.is_warning ? "warn" : "ok";
              const statusLabel = b.is_over ? (t.overBudget || "OVER BUDGET") : b.is_warning ? (t.nearLimit || "NEAR LIMIT") : (t.onTrack || "ON TRACK");
              const statusCls = b.is_over ? "over-budget" : b.is_warning ? "near-limit" : "on-track";
              return (
                <div key={b.id} className={`budget-item${cls ? " " + cls : ""}`}>
                  <div className="budget-item-header">
                    <div className="budget-item-title">
                      <span>{getCategoryIcon(b.category)}</span>
                      <strong>{b.category}</strong>
                      <span className="budget-item-meta">{b.month}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`budget-status-badge ${statusCls}`}>{statusLabel}</span>
                      <button className="icon-btn delete" onClick={() => handleDeleteBudget(b.id)} title="Remove budget">×</button>
                    </div>
                  </div>
                  <div className="budget-progress-bar">
                    <div className={`budget-progress-fill ${fillCls}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="budget-item-stats">
                    <span>💸 {t.spent || "Spent"}: <strong style={{ color: "var(--text-primary)" }}>{formatMoney(b.spent)}</strong></span>
                    <span>🎯 {t.remaining || "Remaining"}: <strong style={{ color: "var(--success)" }}>{formatMoney(b.remaining)}</strong></span>
                    <span style={{ marginLeft: "auto", fontWeight: 700 }}>{b.percentage}% / {formatMoney(b.monthly_limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="💰" title={t.noBudgets || "No budgets set"} text={t.noBudgetsText || "Set a monthly budget for any category to track spending."} />
        )}
      </section>
    </div>
  );
}

// ── GOALS PAGE ──────────────────────────────────────────────────────────────
function GoalsPage({ goals = [], currentSavings = 0, formatMoney, handleAddGoal, handleDeleteGoal, t = {} }) {
  const [form, setForm] = useState({ title: "", target_amount: "", target_date: "", description: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.target_amount) return;
    setFormLoading(true);
    await handleAddGoal({ ...form, target_amount: Number(form.target_amount) });
    setFormLoading(false);
    setForm({ title: "", target_amount: "", target_date: "", description: "" });
    setShowForm(false);
  };

  return (
    <div className="page-container">
      <section className="content-card" style={{ background: "linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.05))", borderColor: "rgba(99,102,241,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>{t.currentSavings || "Current Savings"}</h2>
            <p style={{ fontSize: "13px" }}>{t.savingsGoalsSubtitle || "Track your financial targets"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <strong style={{ fontSize: "36px", color: "var(--success)", display: "block" }}>{formatMoney(currentSavings)}</strong>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Paid Salary − Total Expenses</span>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="content-card form-card">
          <CardHeader title={t.addGoal || "+ Add Goal"} subtitle="" action={<button className="ghost-btn" onClick={() => setShowForm(false)}>{t.cancel || "Cancel"}</button>} />
          <form className="modern-form" onSubmit={handleSubmit}>
            <Field label={t.goalTitle || "Goal title"} name="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Emergency Fund" />
            <Field label={t.targetAmount || "Target Amount (৳)"} name="target_amount" type="number" min="1" step="any" value={form.target_amount} onChange={(e) => setForm((p) => ({ ...p, target_amount: e.target.value }))} placeholder="e.g. 50000" />
            <Field label={t.targetDate || "Target Date (optional)"} name="target_date" type="date" value={form.target_date} onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} required={false} />
            <div className="form-field full">
              <label>{t.goalDescription || "Description (optional)"}</label>
              <textarea name="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What are you saving for?" />
            </div>
            <div className="form-submit">
              <button className="primary-btn" disabled={formLoading}>{formLoading ? "Saving..." : (t.addGoal || "+ Add Goal")}</button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card">
        <CardHeader
          title={t.savingsGoals || "Savings Goals"}
          subtitle={`${goals.length} goal${goals.length !== 1 ? "s" : ""}`}
          action={!showForm && (
            <button className="primary-btn small" onClick={() => setShowForm(true)}>{t.addGoal || "+ Add Goal"}</button>
          )}
        />
        {goals.length > 0 ? (
          <div className="goals-grid">
            {goals.map((g) => {
              const r = 50;
              const circ = 2 * Math.PI * r;
              const offset = circ - (g.percentage / 100) * circ;
              const daysLeft = g.target_date ? Math.ceil((new Date(g.target_date) - Date.now()) / 86400000) : null;
              return (
                <div key={g.id} className={`goal-card${g.is_achieved ? " achieved" : ""}`}>
                  <div className="goal-card-header">
                    <div className="goal-title-wrap">
                      <strong>{g.title}</strong>
                      {g.target_date && <span>📅 {g.target_date}</span>}
                    </div>
                    <button className="goal-delete-btn" onClick={() => handleDeleteGoal(g.id)}>×</button>
                  </div>

                  <div className="goal-circular" style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
                    <svg className="goal-circle-svg" width="120" height="120" viewBox="0 0 120 120">
                      <circle className="goal-circle-bg" cx="60" cy="60" r={r} strokeWidth="10" />
                      <circle
                        className={`goal-circle-fill ${g.is_achieved ? "achieved" : "in-progress"}`}
                        cx="60" cy="60" r={r} strokeWidth="10"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <div className="goal-circle-text">
                      <span className="goal-circle-pct">{Math.round(g.percentage)}%</span>
                      <span className="goal-circle-label">done</span>
                    </div>
                  </div>

                  <div className="goal-amounts">
                    <div><span>{t.currentSavings || "Saved"}</span><strong style={{ color: "var(--brand-primary)" }}>{formatMoney(g.current_savings)}</strong></div>
                    <div><span>Target</span><strong>{formatMoney(g.target_amount)}</strong></div>
                    <div><span>{t.remaining || "Left"}</span><strong style={{ color: "var(--warning)" }}>{formatMoney(g.remaining)}</strong></div>
                  </div>

                  {g.is_achieved && <div className="goal-achieved-badge">{t.goalAchieved || "🎉 Goal Achieved!"}</div>}
                  {!g.is_achieved && daysLeft !== null && (
                    <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                      {daysLeft > 0 ? `${daysLeft} ${t.daysLeft || "days left"}` : "Past target date"}
                    </div>
                  )}
                  {g.description && <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", textAlign: "center" }}>{g.description}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="📈" title={t.noGoals || "No savings goals yet"} text={t.noGoalsText || "Create a savings goal to track your financial progress."} action={<button className="primary-btn small" onClick={() => setShowForm(true)}>{t.addGoal || "+ Add Goal"}</button>} />
        )}
      </section>
    </div>
  );
}

// ── GLOBAL SEARCH MODAL ─────────────────────────────────────────────────────
function GlobalSearchModal({ query, setQuery, results, onClose, onNavigate, formatMoney, t = {} }) {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const hasResults = results.expenses.length > 0 || results.salaries.length > 0 || results.users.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="global-search-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="global-search-box">
        <div className="global-search-input">
          <span>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.globalSearch || "Search everything..."}
          />
          <span className="search-hint-badge">Esc to close</span>
        </div>

        <div className="search-results">
          {!hasQuery && (
            <div className="search-no-results" style={{ padding: "24px" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔍</div>
              <p>Start typing to search expenses, salary records, and users...</p>
            </div>
          )}

          {hasQuery && !hasResults && (
            <div className="search-no-results">{t.searchNoResults || "No results found"}</div>
          )}

          {results.expenses.length > 0 && (
            <>
              <div className="search-result-group-label">Expenses</div>
              {results.expenses.map((e) => (
                <div key={e.id} className="search-result-item" onClick={() => onNavigate("expenses", e.id)}>
                  <div className="search-result-icon">{getCategoryIcon(e.category)}</div>
                  <div className="search-result-main">
                    <strong>{e.title}</strong>
                    <span>{e.category} · {e.expense_date}</span>
                  </div>
                  <span className="search-result-right" style={{ color: "var(--danger)" }}>- {formatMoney(e.amount)}</span>
                </div>
              ))}
            </>
          )}

          {results.salaries.length > 0 && (
            <>
              <div className="search-result-group-label">Salary Records</div>
              {results.salaries.map((s) => (
                <div key={s.id} className="search-result-item" onClick={() => onNavigate("salary", s.id)}>
                  <div className="search-result-icon">৳</div>
                  <div className="search-result-main">
                    <strong>{s.description || "Salary Record"}</strong>
                    <span>{s.salary_month} · {s.status}</span>
                  </div>
                  <span className="search-result-right" style={{ color: "var(--success)" }}>{formatMoney(s.amount)}</span>
                </div>
              ))}
            </>
          )}

          {results.users.length > 0 && (
            <>
              <div className="search-result-group-label">Users</div>
              {results.users.map((u) => (
                <div key={u.id} className="search-result-item" onClick={() => onNavigate("admin", u.id)}>
                  <div className="search-result-icon" style={{ background: "rgba(139,92,246,0.15)", color: "var(--purple)", fontWeight: 700 }}>
                    {(u.full_name || u.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="search-result-main">
                    <strong>{u.full_name || u.username}</strong>
                    <span>{u.email} · {u.role}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP INSTALLATION MODAL ──────────────────────────────────────────────────
function AppInstallModal({ onClose, deferredPrompt }) {
  const handlePwaPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        alert("App installed successfully! 🎉");
      }
    } else {
      alert("Notice: PWA Installation is active! If you don't see a popup, tap your browser menu (⋮ or Share) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-secondary, #1e293b)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "28px", maxWidth: "600px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>📲</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Download & Install ExpenseFlow Pro</h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>Use as a standalone Mobile or Desktop Application</p>
            </div>
          </div>
          <button className="ghost-btn small" onClick={onClose} style={{ padding: "6px 12px", fontSize: "16px" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Option 1: PWA Web/Mobile App */}
          <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "14px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <strong style={{ fontSize: "0.95rem", display: "block", color: "#818cf8", marginBottom: "3px" }}>📱 Mobile & Desktop PWA App</strong>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Instant 1-Click Install for Android, iOS, Windows & Mac</span>
            </div>
            <button className="primary-btn" onClick={handlePwaPrompt} style={{ whiteSpace: "nowrap", padding: "8px 16px", fontSize: "0.85rem" }}>
              Install Now ⚡
            </button>
          </div>

          {/* Option 2: Windows Software Installer */}
          <div style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: "14px", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <strong style={{ fontSize: "0.95rem", display: "block", color: "#c084fc", marginBottom: "3px" }}>💻 Windows Desktop Installer (.bat)</strong>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Creates Desktop Shortcut icon on Windows PC</span>
            </div>
            <a href="/ExpenseFlow-Pro-Setup.bat" download="ExpenseFlow-Pro-Setup.bat" className="ghost-btn" style={{ whiteSpace: "nowrap", padding: "8px 16px", fontSize: "0.85rem", textDecoration: "none", color: "#c084fc", borderColor: "rgba(168, 85, 247, 0.4)" }}>
              Download (.bat) 📥
            </a>
          </div>

          {/* Option 3: Mobile App Instructions */}
          <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "14px", padding: "16px" }}>
            <strong style={{ fontSize: "0.95rem", display: "block", color: "#34d399", marginBottom: "6px" }}>🤖 Mobile Device Setup (Android / iPhone)</strong>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              1. Open this website on your mobile browser (Chrome/Safari).<br />
              2. Tap browser menu (<strong>⋮</strong> on Android or <strong>Share</strong> icon on iPhone).<br />
              3. Tap <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>.<br />
              <em>ExpenseFlow Pro will function like a native mobile app!</em>
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right", marginTop: "20px" }}>
          <button className="ghost-btn" onClick={onClose} style={{ padding: "8px 16px" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

