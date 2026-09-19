"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PersonBusiness, BUSINESS_CATEGORIES, EventItem, AdminUser } from "@/lib/types";

export default function AdminDashboardPage() {
  // Auth State
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Login Form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation
  const [activeTab, setActiveTab] = useState<"businesses" | "events" | "settings">("businesses");

  // Businesses State
  const [businesses, setBusinesses] = useState<PersonBusiness[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [bizSearch, setBizSearch] = useState("");
  const [debouncedBizSearch, setDebouncedBizSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [bizPage, setBizPage] = useState(1);
  const [bizLimit] = useState(20);
  const [bizPagination, setBizPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [bizStats, setBizStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
  });

  // Business Modal
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Partial<PersonBusiness> | null>(null);
  const [deleteBizModal, setDeleteBizModal] = useState<PersonBusiness | null>(null);

  // Events State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<EventItem> | null>(null);
  const [deleteEventModal, setDeleteEventModal] = useState<EventItem | null>(null);


  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Check existing session on load
  useEffect(() => {
    const savedToken = localStorage.getItem("kp_admin_token");
    if (savedToken) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setToken(savedToken);
            setCurrentUser(data.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("kp_admin_token");
          }
        })
        .catch(() => {
          localStorage.removeItem("kp_admin_token");
        })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  // Debounce search query (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBizSearch(bizSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [bizSearch]);

  // Reset to page 1 on search or filter changes
  useEffect(() => {
    setBizPage(1);
  }, [debouncedBizSearch, statusFilter, categoryFilter]);

  // Load businesses when authenticated or query params change
  useEffect(() => {
    if (isAuthenticated && token) {
      loadBusinesses(bizPage, debouncedBizSearch, statusFilter, categoryFilter);
    }
  }, [isAuthenticated, token, bizPage, debouncedBizSearch, statusFilter, categoryFilter]);

  // Load events on initial authentication
  useEffect(() => {
    if (isAuthenticated && token) {
      loadEvents();
    }
  }, [isAuthenticated, token]);

  const loadBusinesses = async (
    pageToLoad = bizPage,
    search = debouncedBizSearch,
    status = statusFilter,
    cat = categoryFilter
  ) => {
    if (!token) return;
    setLoadingBiz(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageToLoad));
      params.set("limit", String(bizLimit));
      if (status !== "all") params.set("status", status);
      if (cat !== "all") params.set("category", cat);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/businesses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBusinesses(data.data);
        if (data.pagination) setBizPagination(data.pagination);
        if (data.stats) setBizStats(data.stats);
      }
    } catch {
      showToast("Failed to load businesses", "error");
    } finally {
      setLoadingBiz(false);
    }
  };

  const loadEvents = async () => {
    if (!token) return;
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setEvents(data.data);
      }
    } catch {
      showToast("Failed to load events", "error");
    } finally {
      setLoadingEvents(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("kp_admin_token", data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setLoginPassword("");
        showToast("Signed in successfully!");
      } else {
        setLoginError(data.error || "Invalid username or password");
      }
    } catch {
      setLoginError("Could not connect to authentication server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("kp_admin_token");
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setLoginUsername("");
    setLoginPassword("");
    showToast("Signed out successfully");
  };

  // 1-Click Approve Toggle
  const toggleApproval = async (biz: PersonBusiness) => {
    const nextStatus = !biz.isApproved;
    try {
      const res = await fetch("/api/businesses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: biz.id, isApproved: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === biz.id ? { ...b, isApproved: nextStatus } : b))
        );
        showToast(nextStatus ? `Approved: ${biz.businessName}` : `Unapproved: ${biz.businessName}`);
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch {
      showToast("Network error updating status", "error");
    }
  };

  // 1-Click Active Toggle
  const toggleActive = async (biz: PersonBusiness) => {
    const nextStatus = biz.isActive === false ? true : false;
    try {
      const res = await fetch("/api/businesses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: biz.id, isActive: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === biz.id ? { ...b, isActive: nextStatus } : b))
        );
        showToast(nextStatus ? `Activated: ${biz.businessName}` : `Deactivated: ${biz.businessName}`);
      }
    } catch {
      showToast("Network error updating active status", "error");
    }
  };

  // Save Business (Add or Edit)
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz || !token) return;

    try {
      const isNew = !editingBiz.id;
      const res = await fetch("/api/businesses", {
        method: isNew ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingBiz),
      });
      const data = await res.json();

      if (data.success) {
        showToast(isNew ? "Business added successfully!" : "Business updated successfully!");
        setBizModalOpen(false);
        setEditingBiz(null);
        loadBusinesses();
      } else {
        showToast(data.error || "Failed to save business", "error");
      }
    } catch {
      showToast("Error communicating with server", "error");
    }
  };

  // Delete Business
  const handleDeleteBusiness = async () => {
    if (!deleteBizModal || !token) return;
    try {
      const res = await fetch(`/api/businesses?id=${deleteBizModal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast("Business deleted successfully");
        setBusinesses((prev) => prev.filter((b) => b.id !== deleteBizModal.id));
        setDeleteBizModal(null);
      } else {
        showToast(data.error || "Failed to delete", "error");
      }
    } catch {
      showToast("Network error deleting business", "error");
    }
  };

  // Save Event (Add or Edit)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !token) return;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingEvent),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Event saved successfully");
        setEventModalOpen(false);
        setEditingEvent(null);
        loadEvents();
      } else {
        showToast(data.error || "Failed to save event", "error");
      }
    } catch {
      showToast("Network error saving event", "error");
    }
  };

  // Delete Event
  const handleDeleteEvent = async () => {
    if (!deleteEventModal || !token) return;
    try {
      const res = await fetch(`/api/events?id=${deleteEventModal.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast("Event deleted successfully");
        setEvents((prev) => prev.filter((e) => e.id !== deleteEventModal.id));
        setDeleteEventModal(null);
      }
    } catch {
      showToast("Network error deleting event", "error");
    }
  };

  // Counts & Dynamic Pagination Numbers
  const pendingCount = bizStats.pending;
  const approvedCount = bizStats.approved;
  const totalCount = bizStats.total;

  const bizPageNumbers = useMemo(() => {
    const totalPages = bizPagination.totalPages;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (bizPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (bizPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", bizPage - 1, bizPage, bizPage + 1, "...", totalPages];
  }, [bizPage, bizPagination.totalPages]);

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff" }}>
        <p style={{ fontSize: "1.1rem" }}>Connecting to Kabariya Parivar Admin...</p>
      </div>
    );
  }

  // ============================================================
  // LOGIN SCREEN
  // ============================================================
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "#ffffff", borderRadius: "18px", width: "100%", maxWidth: "420px", padding: "36px 30px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ width: "54px", height: "54px", background: "linear-gradient(135deg, #9e1f26 0%, #d49320 100%)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: "26px", color: "#fff" }}>
              🏛️
            </div>
            <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>Kabariya Parivar</h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "4px" }}>Standalone Admin Control Panel</p>
          </div>

          {loginError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "0.86rem", marginBottom: "16px" }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label className="admin-form-label">Username</label>
              <input
                type="text"
                className="admin-form-control"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
              />
            </div>

            <div className="admin-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="admin-form-label">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", fontSize: "0.76rem", color: "#9e1f26", cursor: "pointer", fontWeight: 600 }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="admin-form-control"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="admin-btn admin-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: "8px", fontSize: "1rem" }}
            >
              {loginLoading ? "Verifying..." : "Sign In to Admin Panel"}
            </button>
          </form>

          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.78rem", color: "#94a3b8" }}>
            Secure 60-Day JWT Session · Connected to MongoDB Atlas
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // AUTHENTICATED DASHBOARD
  // ============================================================
  return (
    <div className="admin-wrapper">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type === "error" ? "admin-toast-error" : "admin-toast-success"}`}>
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <div className="admin-brand-icon">🏛️</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="admin-brand-title">Kabariya Parivar</span>
                <span className="admin-brand-badge">Admin Portal</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                MongoDB Live Database: <strong style={{ color: "#34d399" }}>Connected</strong>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="admin-tabs-nav">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === "businesses" ? "active" : ""}`}
              onClick={() => setActiveTab("businesses")}
            >
              <span>🏢 Businesses</span>
              {pendingCount > 0 && <span className="admin-tab-count pending-count">{pendingCount} pending</span>}
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
            >
              <span>📅 Events</span>
              <span className="admin-tab-count">{events.length}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <span>⚙️ Settings</span>
            </button>
          </nav>

          {/* User & Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
              Signed in as <strong>{currentUser?.name || "Admin"}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="admin-btn admin-btn-secondary admin-btn-sm"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-container">
        {/* Stat Cards */}
        <div className="admin-dashboard-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: "#e0f2fe", color: "#0369a1" }}>🏢</div>
            <div>
              <div className="admin-stat-label">Total Businesses</div>
              <div className="admin-stat-value">{totalCount}</div>
            </div>
          </div>

          <div className="admin-stat-card" style={{ borderColor: pendingCount > 0 ? "#f59e0b" : "#e2e8f0" }}>
            <div className="admin-stat-icon" style={{ background: "#fef3c7", color: "#b45309" }}>⏳</div>
            <div>
              <div className="admin-stat-label">Pending Approval</div>
              <div className="admin-stat-value" style={{ color: pendingCount > 0 ? "#b45309" : "#0f172a" }}>
                {pendingCount}
              </div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: "#ecfdf5", color: "#047857" }}>✓</div>
            <div>
              <div className="admin-stat-label">Approved &amp; Live</div>
              <div className="admin-stat-value" style={{ color: "#047857" }}>{approvedCount}</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: "#f3e8ff", color: "#7e22ce" }}>📅</div>
            <div>
              <div className="admin-stat-label">Upcoming Events</div>
              <div className="admin-stat-value">{events.length}</div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: BUSINESSES                                            */}
        {/* ============================================================ */}
        {activeTab === "businesses" && (
          <div>
            <div className="admin-action-bar">
              {/* Search */}
              <div className="admin-search-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search by name, business, city, phone..."
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                />
              </div>

              {/* Status Filter Pills */}
              <div className="admin-filter-pills">
                <button
                  type="button"
                  className={`admin-pill-btn ${statusFilter === "all" ? "active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  className={`admin-pill-btn pending-pill ${statusFilter === "pending" ? "active" : ""}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  Pending Review ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`admin-pill-btn ${statusFilter === "approved" ? "active" : ""}`}
                  onClick={() => setStatusFilter("approved")}
                >
                  Approved ({approvedCount})
                </button>
              </div>

              {/* Add Business Button */}
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setEditingBiz({
                    category: "textiles",
                    isApproved: true,
                    isActive: true,
                    state: "Gujarat",
                  });
                  setBizModalOpen(true);
                }}
              >
                + Add Business
              </button>
            </div>

            {/* Businesses Table */}
            <div className="admin-table-card">
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Business &amp; Category</th>
                      <th>Owner / Partner</th>
                      <th>Contact &amp; City</th>
                      <th>Status</th>
                      <th>Approve / Live</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBiz ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <span className="admin-spinner" />
                            <span style={{ fontSize: "0.88rem", color: "#64748b" }}>Loading businesses from MongoDB Atlas...</span>
                          </div>
                        </td>
                      </tr>
                    ) : businesses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                          No businesses matched your search/filter.
                        </td>
                      </tr>
                    ) : (
                      businesses.map((biz) => (
                        <tr key={biz.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{biz.businessName}</div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                              {biz.categoryLabelEn || biz.category}
                              {biz.establishedYear ? ` · Est. ${biz.establishedYear}` : ""}
                            </div>
                            {biz.comment && (
                              <div style={{ fontSize: "0.74rem", color: "#d97706", fontStyle: "italic", marginTop: "2px" }}>
                                Note: {biz.comment}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{biz.personName}</div>
                            {biz.personName2 && (
                              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>&amp; {biz.personName2}</div>
                            )}
                            {biz.village && (
                              <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>📍 {biz.village}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>📞 {biz.phone}</div>
                            {biz.phone2 && <div style={{ fontSize: "0.78rem", color: "#64748b" }}>📞 {biz.phone2}</div>}
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{biz.city}</div>
                          </td>
                          <td>
                            <span className={`admin-badge ${biz.isApproved ? "admin-badge-approved" : "admin-badge-pending"}`}>
                              {biz.isApproved ? "✓ Approved" : "⏳ Pending"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => toggleApproval(biz)}
                                className={`admin-btn admin-btn-sm ${biz.isApproved ? "admin-btn-secondary" : "admin-btn-success"}`}
                                title={biz.isApproved ? "Revoke approval" : "Approve this business"}
                              >
                                {biz.isApproved ? "Unapprove" : "✓ Approve"}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleActive(biz)}
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                title="Toggle active status"
                              >
                                {biz.isActive === false ? "Hidden" : "Active"}
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBiz(biz);
                                  setBizModalOpen(true);
                                }}
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteBizModal(biz)}
                                className="admin-btn admin-btn-danger admin-btn-sm"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Admin Pagination Bar */}
              <div className="admin-pagination-bar">
                <div className="admin-pagination-info">
                  {bizPagination.total > 0 ? (
                    <>
                      Showing <strong>{(bizPage - 1) * bizPagination.limit + 1}</strong> to{" "}
                      <strong>{Math.min(bizPage * bizPagination.limit, bizPagination.total)}</strong> of{" "}
                      <strong>{bizPagination.total}</strong> businesses
                    </>
                  ) : (
                    "No businesses found"
                  )}
                </div>

                {bizPagination.totalPages > 1 && (
                  <div className="admin-pagination-nav">
                    <button
                      type="button"
                      disabled={!bizPagination.hasPrevPage || loadingBiz}
                      onClick={() => setBizPage((p) => Math.max(1, p - 1))}
                      className="admin-page-btn"
                      title="Previous Page"
                    >
                      ← Prev
                    </button>

                    {bizPageNumbers.map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="admin-page-ellipsis">
                          …
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          className={`admin-page-btn ${bizPage === p ? "active" : ""}`}
                          onClick={() => setBizPage(Number(p))}
                          disabled={loadingBiz}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={!bizPagination.hasNextPage || loadingBiz}
                      onClick={() => setBizPage((p) => Math.min(bizPagination.totalPages, p + 1))}
                      className="admin-page-btn"
                      title="Next Page"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: EVENTS                                                */}
        {/* ============================================================ */}
        {activeTab === "events" && (
          <div>
            <div className="admin-action-bar">
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Parivar Events &amp; Utsavs</h3>
                <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                  Manage Navratri, Sneh Milan, and Annual Yagna events displayed on the website.
                </p>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setEditingEvent({
                    isActive: true,
                    order: events.length + 1,
                    locationGu: "સાવરકુંડલા માતાજીના મઢે",
                    locationEn: "Kabariya Parivar Madh, Savarkundla",
                    badgeGu: "કાર્યક્રમ",
                    badgeEn: "Event",
                  });
                  setEventModalOpen(true);
                }}
              >
                + Add New Event
              </button>
            </div>

            <div className="admin-table-card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Title &amp; Badge</th>
                    <th>Date &amp; Time</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEvents ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "30px" }}>
                        Loading events from MongoDB...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No events found in database.
                      </td>
                    </tr>
                  ) : (
                    events.map((evt) => (
                      <tr key={evt.id}>
                        <td style={{ fontWeight: 700 }}>#{evt.order ?? 99}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{evt.titleGu || evt.titleEn}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{evt.titleEn}</div>
                          <span className="admin-badge admin-badge-approved" style={{ marginTop: "4px" }}>
                            {evt.badgeGu || evt.badgeEn}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{evt.dateGu || evt.dateEn}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{evt.timeGu || evt.timeEn}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: "0.85rem" }}>{evt.locationGu}</div>
                        </td>
                        <td>
                          <span className={`admin-badge ${evt.isActive !== false ? "admin-badge-approved" : "admin-badge-inactive"}`}>
                            {evt.isActive !== false ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEvent(evt);
                                setEventModalOpen(true);
                              }}
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteEventModal(evt)}
                              className="admin-btn admin-btn-danger admin-btn-sm"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* ============================================================ */}
        {/* TAB 4: SETTINGS                                              */}
        {/* ============================================================ */}
        {activeTab === "settings" && (
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <div className="admin-table-card" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>⚙️ Admin Portal Settings</h3>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Database Cluster</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
                  MongoDB Atlas Replica Set (Database: kabariyaparivar)
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Admin Session</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
                  60-Day JWT Token Authorization
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Hosting &amp; Domain</div>
                <div style={{ fontSize: "0.92rem", color: "#334155", marginTop: "4px", lineHeight: 1.6 }}>
                  This app is completely standalone and can be deployed to Vercel, Netlify, or your own server on a custom subdomain like <code>admin.kabariyaparivar.com</code>.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* BUSINESS EDIT / ADD MODAL                                    */}
      {/* ============================================================ */}
      {bizModalOpen && editingBiz && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setBizModalOpen(false)}>
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editingBiz.id ? "Edit Business Entry" : "Add New Business Entry"}</h3>
              <button
                type="button"
                onClick={() => setBizModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBusiness}>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Business / Firm Name *</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.businessName || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, businessName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Category *</label>
                    <select
                      className="admin-form-control"
                      value={editingBiz.category || "other"}
                      onChange={(e) => {
                        const cat = BUSINESS_CATEGORIES.find((c) => c.id === e.target.value);
                        setEditingBiz({
                          ...editingBiz,
                          category: e.target.value,
                          categoryLabelEn: cat?.nameEn || e.target.value,
                          categoryLabelGu: cat?.nameGu || e.target.value,
                        });
                      }}
                    >
                      {BUSINESS_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.nameEn} ({cat.nameGu})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Contact Person 1 (Owner) *</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.personName || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, personName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Partner / Co-Owner Name 2 (Optional)</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.personName2 || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, personName2: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Mobile Number 1 (WhatsApp) *</label>
                    <input
                      type="tel"
                      className="admin-form-control"
                      value={editingBiz.phone || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, phone: e.target.value, whatsapp: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Mobile Number 2 (Optional)</label>
                    <input
                      type="tel"
                      className="admin-form-control"
                      value={editingBiz.phone2 || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, phone2: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">City *</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.city || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, city: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Native Village (ગામ)</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.village || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, village: e.target.value })}
                      placeholder="Savarkundla"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Full Address *</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    value={editingBiz.address || ""}
                    onChange={(e) => setEditingBiz({ ...editingBiz, address: e.target.value })}
                    placeholder="Shop/Office No, Complex, Road"
                    required
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Google Map URL</label>
                    <input
                      type="url"
                      className="admin-form-control"
                      value={editingBiz.mapUrl || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, mapUrl: e.target.value })}
                      placeholder="https://maps.app.goo.gl/..."
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Visiting Card / Photo Link</label>
                    <input
                      type="url"
                      className="admin-form-control"
                      value={editingBiz.images || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, images: e.target.value })}
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Website URL</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.website || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, website: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Email</label>
                    <input
                      type="email"
                      className="admin-form-control"
                      value={editingBiz.email || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Description / Services</label>
                  <textarea
                    className="admin-form-control"
                    rows={3}
                    value={editingBiz.description || ""}
                    onChange={(e) => setEditingBiz({ ...editingBiz, description: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Special Note / Offer</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    value={editingBiz.comment || ""}
                    onChange={(e) => setEditingBiz({ ...editingBiz, comment: e.target.value })}
                    placeholder="Discount for parivar members..."
                  />
                </div>

                <div style={{ display: "flex", gap: "20px", marginTop: "12px", background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editingBiz.isApproved ?? true}
                      onChange={(e) => setEditingBiz({ ...editingBiz, isApproved: e.target.checked })}
                    />
                    Approved (Visible on Public Website)
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editingBiz.isActive ?? true}
                      onChange={(e) => setEditingBiz({ ...editingBiz, isActive: e.target.checked })}
                    />
                    Active Status
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setBizModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE BUSINESS CONFIRM MODAL                                */}
      {/* ============================================================ */}
      {deleteBizModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "440px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Delete Business Entry?</h3>
              <button
                type="button"
                onClick={() => setDeleteBizModal(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: "0.92rem", color: "#334155", lineHeight: 1.5 }}>
                Are you sure you want to permanently delete <strong>{deleteBizModal.businessName}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setDeleteBizModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteBusiness}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EVENT EDIT / ADD MODAL                                       */}
      {/* ============================================================ */}
      {eventModalOpen && editingEvent && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setEventModalOpen(false)}>
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editingEvent.id ? "Edit Event" : "Add New Event"}</h3>
              <button
                type="button"
                onClick={() => setEventModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Event Title (Gujarati) *</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingEvent.titleGu || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, titleGu: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Event Title (English)</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingEvent.titleEn || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, titleEn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Date (Gujarati) *</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingEvent.dateGu || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, dateGu: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Time</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingEvent.timeGu || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, timeGu: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Location</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    value={editingEvent.locationGu || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, locationGu: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Description</label>
                  <textarea
                    className="admin-form-control"
                    rows={3}
                    value={editingEvent.descriptionGu || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, descriptionGu: e.target.value })}
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Badge Label</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingEvent.badgeGu || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, badgeGu: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Display Order (1, 2, 3...)</label>
                    <input
                      type="number"
                      className="admin-form-control"
                      value={editingEvent.order ?? 1}
                      onChange={(e) => setEditingEvent({ ...editingEvent, order: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", marginTop: "10px" }}>
                  <input
                    type="checkbox"
                    checked={editingEvent.isActive ?? true}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isActive: e.target.checked })}
                  />
                  Active (Displayed on Website)
                </label>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setEventModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE EVENT CONFIRM MODAL                                   */}
      {/* ============================================================ */}
      {deleteEventModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "440px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Delete Event?</h3>
              <button
                type="button"
                onClick={() => setDeleteEventModal(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: "0.92rem", color: "#334155" }}>
                Are you sure you want to delete <strong>{deleteEventModal.titleGu || deleteEventModal.titleEn}</strong>?
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setDeleteEventModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteEvent}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
