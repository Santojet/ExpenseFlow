import React, { useState, useEffect } from "react";
import { API } from "../App"; // Assuming we can export API from App or we define it

export default function CategoriesPage({ t, formatMoney }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({ name: "", color: "#4f46e5", icon: "📌" });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/api/categories`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Bypass-Tunnel-Reminder": "true"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      const url = editingId ? `${API}/api/categories/${editingId}` : `${API}/api/categories`;
      const method = editingId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchCategories();
      } else {
        alert("Failed to save category");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Bypass-Tunnel-Reminder": "true"
        }
      });
      if (res.ok) {
        fetchCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: "", color: "#4f46e5", icon: "📌" });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, color: cat.color || "#4f46e5", icon: cat.icon || "📌" });
    setShowModal(true);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading categories...</div>;

  return (
    <div className="fade-in" style={{ paddingBottom: 80 }}>
      <header className="page-header" style={{
        background: "linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(16, 185, 129, 0.05))",
        padding: "24px 32px",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        marginBottom: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: "700", background: "linear-gradient(90deg, #818cf8, #a7f3d0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Category Studio
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "4px" }}>
            Personalize your financial tracking with custom tags
          </p>
        </div>
        <button className="primary-btn" onClick={openNew} style={{ display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 15px rgba(79, 70, 229, 0.4)" }}>
          <span style={{ fontSize: "1.2rem" }}>+</span> Create New
        </button>
      </header>

      <section className="content-card" style={{ background: "transparent", border: "none", padding: 0 }}>
        {categories.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--bg-secondary)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.5 }}>📂</div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>No custom categories yet</h3>
            <p style={{ color: "var(--text-secondary)" }}>Create your first category to start organizing your expenses your way.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {categories.map((cat) => (
              <div key={cat.id} className="category-card" style={{
                background: "var(--bg-secondary)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 10px 25px -5px ${cat.color}30`;
                e.currentTarget.style.borderColor = `${cat.color}50`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)";
              }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: cat.color }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}40)`,
                    color: cat.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    boxShadow: `inset 0 0 0 1px ${cat.color}30`
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ display: "flex", gap: "6px", opacity: 0.7, transition: "opacity 0.2s" }} className="category-actions">
                    <button className="icon-btn edit" onClick={() => openEdit(cat)} style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>✎</button>
                    <button className="icon-btn delete" onClick={() => handleDelete(cat.id)} style={{ width: "32px", height: "32px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px" }}>×</button>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>{cat.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color }} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{cat.color}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.6)" }} onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{
            background: "linear-gradient(to bottom, var(--bg-secondary), var(--bg-primary))",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            borderRadius: "20px",
            padding: "32px",
            maxWidth: "480px"
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "24px", color: "var(--text-primary)" }}>
              {editingId ? "Edit Category" : "✨ New Category"}
            </h3>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>Category Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="e.g. Subscriptions"
                  style={{
                    width: "100%",
                    padding: "16px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    fontSize: "1.1rem",
                    color: "var(--text-primary)",
                    outline: "none",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = formData.color || "var(--brand-primary)"}
                  onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "20px", marginTop: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>Theme Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-tertiary)", padding: "8px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <input 
                      type="color" 
                      value={formData.color} 
                      onChange={e => setFormData({ ...formData, color: e.target.value })} 
                      style={{ width: "36px", height: "36px", cursor: "pointer", border: "none", padding: 0, borderRadius: "8px", background: "transparent" }}
                    />
                    <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{formData.color}</span>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>Icon Emoji</label>
                  <input 
                    type="text" 
                    value={formData.icon} 
                    onChange={e => setFormData({ ...formData, icon: e.target.value })} 
                    maxLength={2}
                    style={{ fontSize: "1.5rem", textAlign: "center", padding: "8px", background: "var(--bg-tertiary)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" }}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: "24px", padding: "16px", borderRadius: "12px", background: `linear-gradient(135deg, ${formData.color}15, ${formData.color}05)`, border: `1px solid ${formData.color}30`, display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: `linear-gradient(135deg, ${formData.color}40, ${formData.color}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  {formData.icon || "📌"}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>Preview</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-primary)" }}>{formData.name || "Category Name"}</div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "32px" }}>
                <button type="button" className="ghost-btn" onClick={() => setShowModal(false)} style={{ borderRadius: "8px" }}>Cancel</button>
                <button type="submit" className="primary-btn" style={{ borderRadius: "8px", background: formData.color, borderColor: formData.color, boxShadow: `0 4px 15px ${formData.color}40` }}>Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
