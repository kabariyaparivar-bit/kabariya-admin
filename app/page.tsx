"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PersonBusiness, BUSINESS_CATEGORIES, EventItem, AdminUser, BusinessUpdateRequest, YagnaYearRecord, YajmanMember } from "@/lib/types";
import { SearchableSelect, SelectOption } from "@/components/SearchableSelect";

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

  // Navigation & Layout
  const [activeTab, setActiveTab] = useState<"businesses" | "events" | "updates" | "yajman" | "settings">("businesses");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Business Update Requests State
  const [updateRequests, setUpdateRequests] = useState<BusinessUpdateRequest[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [updateStatusFilter, setUpdateStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [updateStats, setUpdateStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [processingUpdateId, setProcessingUpdateId] = useState<string | null>(null);
  const [confirmUpdateModal, setConfirmUpdateModal] = useState<{ req: BusinessUpdateRequest; action: "approve" | "reject" } | null>(null);

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
    hidden: 0,
  });

  // Business Modal
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Partial<PersonBusiness> | null>(null);
  const [deleteBizModal, setDeleteBizModal] = useState<PersonBusiness | null>(null);
  const [uploadingBizCard, setUploadingBizCard] = useState(false);
  const [previewCard, setPreviewCard] = useState<{ url: string; title: string; person?: string } | null>(null);

  // Events State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<EventItem> | null>(null);
  const [deleteEventModal, setDeleteEventModal] = useState<EventItem | null>(null);

  // Yagna Yajmans State
  const [yajmanYears, setYajmanYears] = useState<YagnaYearRecord[]>([]);
  const [loadingYajmans, setLoadingYajmans] = useState(false);
  const [selectedYajmanYear, setSelectedYajmanYear] = useState<number | "all">("all");
  const [yajmanModalOpen, setYajmanModalOpen] = useState(false);
  const [editingYajman, setEditingYajman] = useState<{
    targetYear: number;
    targetType: "mukhya" | "sah";
    personId?: string;
    nameEn: string;
    nameGu: string;
    villageEn: string;
    villageGu: string;
    phone?: string;
  } | null>(null);
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState<string>(new Date().getFullYear().toString());
  const [newYearTitleGu, setNewYearTitleGu] = useState("શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ");
  const [newYearSamvatGu, setNewYearSamvatGu] = useState("");
  const [deleteYajmanConfirm, setDeleteYajmanConfirm] = useState<{
    year: number;
    personId: string;
    name: string;
    type: "mukhya" | "sah";
  } | null>(null);
  const [deleteYearConfirm, setDeleteYearConfirm] = useState<number | null>(null);
  const [isTranslatingName, setIsTranslatingName] = useState(false);
  const [isTranslatingVillage, setIsTranslatingVillage] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Locations Dynamic State for Admin Business Form
  const [locCountries, setLocCountries] = useState<Array<{ isoCode: string; name: string; nameGu?: string; flag?: string }>>([]);
  const [locStates, setLocStates] = useState<Array<{ isoCode: string; name: string; nameGu?: string }>>([]);
  const [locCities, setLocCities] = useState<Array<{ name: string; nameGu?: string }>>([]);
  const [locLoadingStates, setLocLoadingStates] = useState(false);
  const [locLoadingCities, setLocLoadingCities] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityInput, setCustomCityInput] = useState("");

  useEffect(() => {
    fetch("/api/locations?type=countries")
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.success && Array.isArray(resData.data)) {
          setLocCountries(resData.data);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!bizModalOpen || !editingBiz?.country) {
      setLocStates([]);
      setLocCities([]);
      return;
    }
    setLocLoadingStates(true);
    fetch(`/api/locations?country=${encodeURIComponent(editingBiz.country)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.success && Array.isArray(resData.data)) {
          setLocStates(resData.data);
          if ((editingBiz.country === "IN" || editingBiz.country === "India") && !editingBiz.state) {
            const gj = resData.data.find((s: any) => s.isoCode === "GJ" || s.name === "Gujarat");
            if (gj) {
              setEditingBiz((prev) => prev ? { ...prev, state: gj.name, stateGu: gj.nameGu || "ગુજરાત" } : prev);
            }
          }
        }
      })
      .catch(() => { })
      .finally(() => setLocLoadingStates(false));
  }, [bizModalOpen, editingBiz?.country]);

  useEffect(() => {
    if (!bizModalOpen || !editingBiz?.country || !editingBiz?.state) {
      setLocCities([]);
      return;
    }
    setLocLoadingCities(true);
    fetch(`/api/locations?country=${encodeURIComponent(editingBiz.country)}&state=${encodeURIComponent(editingBiz.state)}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData?.success && Array.isArray(resData.data)) {
          setLocCities(resData.data);
        }
      })
      .catch(() => { })
      .finally(() => setLocLoadingCities(false));
  }, [bizModalOpen, editingBiz?.country, editingBiz?.state]);

  const adminCategoryOptions: SelectOption[] = useMemo(() => {
    return BUSINESS_CATEGORIES.filter((c) => c.id !== "all").map((cat) => ({
      value: cat.id,
      label: cat.nameEn,
      labelGu: cat.nameGu,
      icon: cat.icon,
    }));
  }, []);

  const adminCountryOptions: SelectOption[] = useMemo(() => {
    return locCountries.map((c) => ({
      value: c.name,
      label: c.name,
      labelGu: c.nameGu || c.name,
      icon: c.isoCode === "IN" ? "🇮🇳" : (c.flag || "🌐"),
      badge: c.isoCode,
    }));
  }, [locCountries]);

  const adminStateOptions: SelectOption[] = useMemo(() => {
    return locStates.map((s) => ({
      value: s.name,
      label: s.name,
      labelGu: s.nameGu || s.name,
      badge: s.isoCode,
    }));
  }, [locStates]);

  const adminCityOptions: SelectOption[] = useMemo(() => {
    return locCities.map((ct) => ({
      value: ct.name,
      label: ct.name,
      labelGu: ct.nameGu || ct.name,
    }));
  }, [locCities]);

  const handleAdminCountryChange = (val: string, opt?: SelectOption) => {
    setEditingBiz((prev) => prev ? {
      ...prev,
      country: val,
      countryGu: opt?.labelGu || val,
      state: "",
      stateGu: "",
      city: "",
      cityGu: "",
    } : prev);
    setIsCustomCity(false);
    setCustomCityInput("");
  };

  const handleAdminStateChange = (val: string, opt?: SelectOption) => {
    setEditingBiz((prev) => prev ? {
      ...prev,
      state: val,
      stateGu: opt?.labelGu || val,
      city: "",
      cityGu: "",
    } : prev);
    setIsCustomCity(false);
    setCustomCityInput("");
  };

  const handleAdminCityChange = (val: string, opt?: SelectOption) => {
    if (val === "__custom__" || opt?.isCustom) {
      setIsCustomCity(true);
      const customVal = opt?.label && opt.label !== "Other / Custom" && !opt.label.startsWith("✦")
        ? opt.label
        : customCityInput;
      setCustomCityInput(customVal);
      setEditingBiz((prev) => prev ? {
        ...prev,
        city: customVal || "__custom__",
        cityGu: customVal || "__custom__",
      } : prev);
    } else {
      setIsCustomCity(false);
      setCustomCityInput("");
      setEditingBiz((prev) => prev ? {
        ...prev,
        city: val,
        cityGu: opt?.labelGu || val,
      } : prev);
    }
  };

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

  // Global Ctrl + K Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      } else if (e.key === "Escape" && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalSearchOpen]);

  // Toggle Sidebar for both Desktop and Mobile
  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setDesktopSidebarCollapsed((prev) => !prev);
    }
  };

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

  // Load update requests on authentication and filter change
  useEffect(() => {
    if (isAuthenticated && token) {
      loadUpdateRequests(updateStatusFilter);
    }
  }, [isAuthenticated, token, updateStatusFilter]);

  // Load yajmans on initial authentication
  useEffect(() => {
    if (isAuthenticated && token) {
      loadYajmans();
    }
  }, [isAuthenticated, token]);

  const loadYajmans = async () => {
    if (!token) return;
    setLoadingYajmans(true);
    try {
      const res = await fetch("/api/yajmans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setYajmanYears(data.data);
      }
    } catch {
      showToast("Failed to load yajmans", "error");
    } finally {
      setLoadingYajmans(false);
    }
  };

  // Global Spotlight Search Results (Ctrl + K)
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();

    const navItems = [
      { id: "nav-biz", label: "🏢 Businesses Directory", action: () => { setActiveTab("businesses"); setGlobalSearchOpen(false); } },
      { id: "nav-yaj", label: "🔥 Yagna Yajmans Management", action: () => { setActiveTab("yajman"); setGlobalSearchOpen(false); } },
      { id: "nav-ev", label: "📅 Events Management", action: () => { setActiveTab("events"); setGlobalSearchOpen(false); } },
      { id: "nav-upd", label: "✏️ Change Requests & Updates", action: () => { setActiveTab("updates"); setGlobalSearchOpen(false); } },
      { id: "nav-set", label: "⚙️ Admin Settings", action: () => { setActiveTab("settings"); setGlobalSearchOpen(false); } },
      { id: "nav-web", label: "🌐 View Live Website (New Tab)", action: () => { window.open("http://localhost:3000", "_blank"); setGlobalSearchOpen(false); } },
    ].filter((item) => !q || item.label.toLowerCase().includes(q));

    if (!q) {
      return {
        nav: navItems,
        businesses: [],
        yajmans: [],
        events: [],
      };
    }

    const matchedBiz = businesses.filter(
      (b) =>
        b.businessName?.toLowerCase().includes(q) ||
        b.personName?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.village?.toLowerCase().includes(q) ||
        b.phone?.includes(q) ||
        b.categoryLabelEn?.toLowerCase().includes(q) ||
        b.categoryLabelGu?.toLowerCase().includes(q)
    ).slice(0, 6);

    const matchedYajmans: Array<{ year: number; type: "mukhya" | "sah"; name: string; village: string; id: string }> = [];
    yajmanYears.forEach((yr) => {
      (yr.mukhyaYajman || []).forEach((m) => {
        if (
          m.nameGu?.toLowerCase().includes(q) ||
          m.nameEn?.toLowerCase().includes(q) ||
          m.villageGu?.toLowerCase().includes(q) ||
          m.villageEn?.toLowerCase().includes(q) ||
          String(yr.year).includes(q)
        ) {
          matchedYajmans.push({
            year: yr.year,
            type: "mukhya",
            name: m.nameGu || m.nameEn,
            village: m.villageGu || m.villageEn,
            id: m.id,
          });
        }
      });
      (yr.sahYajman || []).forEach((s) => {
        if (
          s.nameGu?.toLowerCase().includes(q) ||
          s.nameEn?.toLowerCase().includes(q) ||
          s.villageGu?.toLowerCase().includes(q) ||
          s.villageEn?.toLowerCase().includes(q) ||
          String(yr.year).includes(q)
        ) {
          matchedYajmans.push({
            year: yr.year,
            type: "sah",
            name: s.nameGu || s.nameEn,
            village: s.villageGu || s.villageEn,
            id: s.id,
          });
        }
      });
    });

    const matchedEvents = events.filter(
      (ev) =>
        ev.title?.toLowerCase().includes(q) ||
        ev.titleGu?.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q)
    ).slice(0, 5);

    return {
      nav: navItems,
      businesses: matchedBiz,
      yajmans: matchedYajmans.slice(0, 6),
      events: matchedEvents,
    };
  }, [globalSearchQuery, businesses, yajmanYears, events]);

  // Auto-translate Gujarati name from English
  const handleAutoTranslateName = async (textEn: string) => {
    if (!textEn.trim()) return;
    setIsTranslatingName(true);
    try {
      const res = await fetch(`/api/translate?text=${encodeURIComponent(textEn)}&target=gu`);
      const data = await res.json();
      if (data.translated) {
        setEditingYajman((prev) => prev ? { ...prev, nameGu: data.translated } : prev);
      }
    } catch (err) {
      console.error("Auto-translation error:", err);
    } finally {
      setIsTranslatingName(false);
    }
  };

  // Auto-translate Gujarati village from English
  const handleAutoTranslateVillage = async (textEn: string) => {
    if (!textEn.trim()) return;
    setIsTranslatingVillage(true);
    try {
      const res = await fetch(`/api/translate?text=${encodeURIComponent(textEn)}&target=gu`);
      const data = await res.json();
      if (data.translated) {
        setEditingYajman((prev) => prev ? { ...prev, villageGu: data.translated } : prev);
      }
    } catch (err) {
      console.error("Auto-translation error:", err);
    } finally {
      setIsTranslatingVillage(false);
    }
  };

  const handleSaveYajmanPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingYajman || !token) return;

    const targetYear = Number(editingYajman.targetYear);
    if (!targetYear || isNaN(targetYear)) {
      showToast("Please select a valid year", "error");
      return;
    }

    if (!editingYajman.nameEn.trim() && !editingYajman.nameGu.trim()) {
      showToast("Please enter Yajman full name", "error");
      return;
    }

    if (!editingYajman.villageEn.trim() && !editingYajman.villageGu.trim()) {
      showToast("Please enter village name", "error");
      return;
    }

    // Find existing year record or prepare new one
    const existingYear = yajmanYears.find((y) => Number(y.year) === targetYear);
    const mukhyaList = existingYear?.mukhyaYajman ? [...existingYear.mukhyaYajman] : [];
    const sahList = existingYear?.sahYajman ? [...existingYear.sahYajman] : [];

    const personObj: YajmanMember = {
      id: editingYajman.personId || `${editingYajman.targetType === "mukhya" ? "my" : "sy"}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      nameEn: editingYajman.nameEn.trim(),
      nameGu: editingYajman.nameGu.trim() || editingYajman.nameEn.trim(),
      villageEn: editingYajman.villageEn.trim(),
      villageGu: editingYajman.villageGu.trim() || editingYajman.villageEn.trim(),
      phone: editingYajman.phone?.trim() || "",
    };

    if (editingYajman.personId) {
      // Updating existing
      if (editingYajman.targetType === "mukhya") {
        const idx = mukhyaList.findIndex((p) => p.id === editingYajman.personId);
        if (idx >= 0) mukhyaList[idx] = personObj;
        else mukhyaList.push(personObj);
        const sIdx = sahList.findIndex((p) => p.id === editingYajman.personId);
        if (sIdx >= 0) sahList.splice(sIdx, 1);
      } else {
        const idx = sahList.findIndex((p) => p.id === editingYajman.personId);
        if (idx >= 0) sahList[idx] = personObj;
        else sahList.push(personObj);
        const mIdx = mukhyaList.findIndex((p) => p.id === editingYajman.personId);
        if (mIdx >= 0) mukhyaList.splice(mIdx, 1);
      }
    } else {
      // Adding new
      if (editingYajman.targetType === "mukhya") {
        mukhyaList.push(personObj);
      } else {
        sahList.push(personObj);
      }
    }

    const payload = {
      id: existingYear?.id || `yagna-${targetYear}`,
      year: targetYear,
      titleGu: existingYear?.titleGu || "શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ",
      titleEn: existingYear?.titleEn || `Annual Mahayagna Mahotsav ${targetYear}`,
      samvatGu: existingYear?.samvatGu || "",
      mukhyaYajman: mukhyaList,
      sahYajman: sahList,
      isActive: existingYear?.isActive ?? true,
    };

    try {
      const res = await fetch("/api/yajmans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Yajman saved successfully!");
        setYajmanModalOpen(false);
        setEditingYajman(null);
        await loadYajmans();
      } else {
        showToast(data.error || "Failed to save yajman", "error");
      }
    } catch {
      showToast("Network error saving yajman", "error");
    }
  };

  const handleDeleteYajmanPerson = async () => {
    if (!deleteYajmanConfirm || !token) return;
    const { year, personId, type } = deleteYajmanConfirm;
    try {
      const res = await fetch(`/api/yajmans?year=${year}&personId=${personId}&personType=${type}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast("Yajman deleted successfully!");
        setDeleteYajmanConfirm(null);
        await loadYajmans();
      } else {
        showToast(data.error || "Failed to delete yajman", "error");
      }
    } catch {
      showToast("Error deleting yajman", "error");
    }
  };

  const handleSaveNewYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const yr = Number(newYearInput);
    if (!yr || isNaN(yr) || yr < 1900 || yr > 2100) {
      showToast("Please enter a valid 4-digit year (e.g. 2026)", "error");
      return;
    }

    const payload = {
      id: `yagna-${yr}`,
      year: yr,
      titleGu: newYearTitleGu.trim() || "શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ",
      titleEn: `Annual Mahayagna Mahotsav ${yr}`,
      samvatGu: newYearSamvatGu.trim(),
      mukhyaYajman: [],
      sahYajman: [],
      isActive: true,
    };

    try {
      const res = await fetch("/api/yajmans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Year ${yr} added successfully!`);
        setYearModalOpen(false);
        setSelectedYajmanYear(yr);
        await loadYajmans();
      } else {
        showToast(data.error || "Failed to add year", "error");
      }
    } catch {
      showToast("Network error creating year", "error");
    }
  };

  const handleDeleteYear = async () => {
    if (!deleteYearConfirm || !token) return;
    try {
      const res = await fetch(`/api/yajmans?year=${deleteYearConfirm}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Year ${deleteYearConfirm} deleted successfully!`);
        setDeleteYearConfirm(null);
        if (selectedYajmanYear === deleteYearConfirm) {
          setSelectedYajmanYear("all");
        }
        await loadYajmans();
      } else {
        showToast(data.error || "Failed to delete year", "error");
      }
    } catch {
      showToast("Error deleting year", "error");
    }
  };

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

  const loadUpdateRequests = async (status = updateStatusFilter) => {
    if (!token) return;
    setLoadingUpdates(true);
    try {
      const res = await fetch(`/api/business-updates?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUpdateRequests(data.data);
        if (data.stats) setUpdateStats(data.stats);
      }
    } catch {
      showToast("Failed to load update requests", "error");
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleReviewUpdate = async (requestId: string, action: "approve" | "reject") => {
    if (!token) return;
    setProcessingUpdateId(requestId);
    try {
      const res = await fetch("/api/business-updates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          action,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          action === "approve"
            ? "Business listing updated live and request cleared!"
            : "Update request rejected and deleted."
        );
        // Optimistically remove from state immediately
        setUpdateRequests((prev) => prev.filter((r) => r.id !== requestId));
        setUpdateStats((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pending: Math.max(0, prev.pending - 1),
        }));
        setConfirmUpdateModal(null);
        await loadUpdateRequests();
        if (action === "approve") {
          loadBusinesses();
        }
      } else {
        showToast(data.error || "Failed to process request", "error");
      }
    } catch {
      showToast("Network error while reviewing request", "error");
    } finally {
      setProcessingUpdateId(null);
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
        showToast(nextStatus ? `Approved: ${biz.businessName}` : `Unapproved: ${biz.businessName}`);
        await loadBusinesses();
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
        showToast(nextStatus ? `Activated: ${biz.businessName}` : `Deactivated: ${biz.businessName}`);
        await loadBusinesses();
      }
    } catch {
      showToast("Network error updating active status", "error");
    }
  };

  // Upload Visiting Card / Photo via API
  const handleAdminCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (JPG, PNG, WebP).", "error");
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      showToast("Photo size must be less than 1 MB.", "error");
      return;
    }

    setUploadingBizCard(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setEditingBiz((prev) => (prev ? { ...prev, images: data.url } : { images: data.url }));
        showToast("Visiting card uploaded successfully!", "success");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload visiting card.", "error");
    } finally {
      setUploadingBizCard(false);
      e.target.value = "";
    }
  };

  // Save Business (Add or Edit)
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz || !token) return;

    try {
      const finalCity = isCustomCity ? customCityInput.trim() : (editingBiz.city || "").trim();
      if (!finalCity || finalCity === "__custom__") {
        showToast("Please enter or select City", "error");
        return;
      }

      const payload = {
        ...editingBiz,
        country: editingBiz.country || "India",
        countryGu: editingBiz.countryGu || "ભારત",
        state: editingBiz.state || "Gujarat",
        stateGu: editingBiz.stateGu || "ગુજરાત",
        city: finalCity,
        cityGu: isCustomCity ? finalCity : (editingBiz.cityGu || finalCity),
      };

      const isNew = !editingBiz.id;
      const res = await fetch("/api/businesses", {
        method: isNew ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
  const hiddenCount = bizStats.hidden || 0;

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
    <div className="admin-layout">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type === "error" ? "admin-toast-error" : "admin-toast-success"}`}>
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      <div
        className={`admin-mobile-backdrop ${mobileSidebarOpen ? "open" : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Global Search Spotlight Modal (Ctrl + K) */}
      {globalSearchOpen && (
        <div
          className="admin-spotlight-overlay"
          onClick={(e) => e.target === e.currentTarget && setGlobalSearchOpen(false)}
        >
          <div className="admin-spotlight-modal">
            {/* Input Header */}
            <div className="admin-spotlight-header">
              <span style={{ fontSize: "1.2rem", color: "#2563eb" }}>🔍</span>
              <input
                type="text"
                className="admin-spotlight-input"
                placeholder="Search businesses, yajmans, events, navigation..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                autoFocus
              />
              {globalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery("")}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem", padding: "2px" }}
                >
                  &times;
                </button>
              )}
              <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: "0.72rem", fontWeight: 700, padding: "3px 7px", borderRadius: "6px" }}>
                ESC
              </span>
            </div>

            {/* Results Body */}
            <div className="admin-spotlight-body">
              {/* Navigation Items */}
              {globalSearchResults.nav.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div className="admin-spotlight-group-title">Navigation Quick Jump</div>
                  {globalSearchResults.nav.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="admin-spotlight-item"
                      onClick={item.action}
                    >
                      <span style={{ fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>Jump to page ➔</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Businesses Results */}
              {globalSearchResults.businesses.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div className="admin-spotlight-group-title">
                    Businesses ({globalSearchResults.businesses.length})
                  </div>
                  {globalSearchResults.businesses.map((biz) => (
                    <button
                      key={biz.id}
                      type="button"
                      className="admin-spotlight-item"
                      onClick={() => {
                        setActiveTab("businesses");
                        setBizSearch(biz.businessName);
                        setGlobalSearchOpen(false);
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          🏢 {biz.businessName}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                          👤 {biz.personName} · 📍 {biz.city || biz.village || "Gujarat"} · 📞 {biz.phone}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: 600 }}>
                        {biz.categoryLabelEn || biz.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Yajmans Results */}
              {globalSearchResults.yajmans.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div className="admin-spotlight-group-title">
                    Yagna Yajmans ({globalSearchResults.yajmans.length})
                  </div>
                  {globalSearchResults.yajmans.map((yaj) => (
                    <button
                      key={`${yaj.year}-${yaj.id}`}
                      type="button"
                      className="admin-spotlight-item"
                      onClick={() => {
                        setActiveTab("yajman");
                        setSelectedYajmanYear(yaj.year);
                        setGlobalSearchOpen(false);
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {yaj.type === "mukhya" ? "👑" : "🤝"} {yaj.name}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                          📍 {yaj.village || "—"} · Year {yaj.year}
                        </div>
                      </div>
                      <span style={{
                        fontSize: "0.72rem",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        background: yaj.type === "mukhya" ? "#fef3c7" : "#f1f5f9",
                        color: yaj.type === "mukhya" ? "#92400e" : "#475569"
                      }}>
                        {yaj.type === "mukhya" ? "👑 Chief" : "🤝 Co"} (Year {yaj.year})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Events Results */}
              {globalSearchResults.events.length > 0 && (
                <div style={{ marginBottom: "14px" }}>
                  <div className="admin-spotlight-group-title">Events</div>
                  {globalSearchResults.events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className="admin-spotlight-item"
                      onClick={() => {
                        setActiveTab("events");
                        setGlobalSearchOpen(false);
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          📅 {ev.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
                          📍 {ev.location} · {ev.date}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.74rem", color: "#2563eb", fontWeight: 600 }}>
                        View Event ➔
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {globalSearchQuery.trim() &&
                globalSearchResults.nav.length === 0 &&
                globalSearchResults.businesses.length === 0 &&
                globalSearchResults.yajmans.length === 0 &&
                globalSearchResults.events.length === 0 && (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🔍</div>
                    <div style={{ fontWeight: 600, color: "#475569" }}>No results found for "{globalSearchQuery}"</div>
                    <div style={{ fontSize: "0.82rem", marginTop: "4px" }}>Try searching by name, village, business, or year</div>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="admin-spotlight-footer">
              <div style={{ display: "flex", gap: "12px" }}>
                <span>Jump: <strong>Click or Enter</strong></span>
                <span>Search all modules in real-time</span>
              </div>
              <div>Press <strong>ESC</strong> to exit</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABLE PRO LEFT SIDEBAR NAVIGATION                             */}
      {/* ============================================================ */}
      <aside className={`admin-sidebar ${desktopSidebarCollapsed ? "collapsed" : ""} ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        {/* <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <div className="admin-sidebar-logo-icon">KP</div>
            <div>
              <div className="admin-sidebar-brand-name">
                Kabariya <span className="admin-sidebar-brand-badge">v2.0</span>
              </div>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Parivar Portal</div>
            </div>
          </div>
        </div> */}

        {/* User Profile Card (Able Pro Style) */}
        <div className="admin-sidebar-user">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div className="admin-sidebar-user-avatar">
              👨‍💼
            </div>
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-name">
                {currentUser?.name || "Admin User"}
              </div>
              <div className="admin-sidebar-user-role">
                Administrator
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: "1.1rem",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
            }}
          >
            ⏻
          </button>
        </div>

        {/* Grouped Sidebar Navigation Links */}
        <nav className="admin-sidebar-nav">
          <div className="admin-nav-category">Navigation</div>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "businesses" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("businesses");
              setMobileSidebarOpen(false);
            }}
          >
            <span className="admin-nav-item-icon">🏢</span>
            <span className="admin-nav-item-label">Businesses</span>
            {pendingCount > 0 ? (
              <span className="admin-nav-item-badge badge-amber">{pendingCount}</span>
            ) : (
              <span className="admin-nav-item-badge">{totalCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "yajman" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("yajman");
              setMobileSidebarOpen(false);
            }}
          >
            <span className="admin-nav-item-icon">🔥</span>
            <span className="admin-nav-item-label">Yagna Yajmans</span>
            <span className="admin-nav-item-badge">{yajmanYears.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "events" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("events");
              setMobileSidebarOpen(false);
            }}
          >
            <span className="admin-nav-item-icon">📅</span>
            <span className="admin-nav-item-label">Events</span>
            <span className="admin-nav-item-badge">{events.length}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "updates" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("updates");
              setMobileSidebarOpen(false);
            }}
          >
            <span className="admin-nav-item-icon">✏️</span>
            <span className="admin-nav-item-label">Change Requests</span>
            {updateStats.pending > 0 && (
              <span className="admin-nav-item-badge badge-red">{updateStats.pending}</span>
            )}
          </button>

          <div className="admin-nav-category">Preferences &amp; System</div>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("settings");
              setMobileSidebarOpen(false);
            }}
          >
            <span className="admin-nav-item-icon">⚙️</span>
            <span className="admin-nav-item-label">Settings</span>
          </button>

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="admin-nav-item"
            style={{ textDecoration: "none" }}
          >
            <span className="admin-nav-item-icon">🌐</span>
            <span className="admin-nav-item-label">Live Website</span>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>↗</span>
          </a>
        </nav>
      </aside>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA WITH ABLE PRO TOPBAR                       */}
      {/* ============================================================ */}
      <div className="admin-main-wrapper">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-topbar-toggle"
              onClick={handleToggleSidebar}
              title="Toggle Menu (Collapse)"
            >
              ☰
            </button>
            <div
              className="admin-topbar-search"
              onClick={() => setGlobalSearchOpen(true)}
              style={{ cursor: "pointer" }}
              title="Click or press Ctrl + K to open Global Search"
            >
              <span className="admin-topbar-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search businesses, yajmans, events... (Ctrl + K)"
                readOnly
                style={{ cursor: "pointer" }}
              />
              <span className="admin-topbar-search-kbd">Ctrl+K</span>
            </div>
          </div>

          <div className="admin-topbar-right">
            <button
              type="button"
              className="admin-topbar-icon-btn"
              title="Live Website"
              onClick={() => window.open("http://localhost:3000", "_blank")}
            >
              🌐
            </button>
            <button
              type="button"
              className="admin-topbar-icon-btn"
              title="Change Requests &amp; Updates"
              onClick={() => setActiveTab("updates")}
            >
              🔔
              {updateStats.pending > 0 && (
                <span className="admin-topbar-badge">{updateStats.pending}</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="admin-btn admin-btn-secondary admin-btn-sm"
              style={{ borderRadius: "8px", fontWeight: 700, padding: "6px 14px", marginLeft: "6px" }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="admin-content-area">

          {/* ============================================================ */}
          {/* TAB 1: BUSINESSES                                            */}
          {/* ============================================================ */}
          {activeTab === "businesses" && (
            <div>
              {/* Stat Cards - Displayed ONLY on Business Page */}
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

                <div
                  className="admin-stat-card"
                  style={{
                    borderColor: updateStats.pending > 0 ? "#ef4444" : "#e2e8f0",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("updates")}
                >
                  <div className="admin-stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>✏️</div>
                  <div>
                    <div className="admin-stat-label">Correction Requests</div>
                    <div className="admin-stat-value" style={{ color: updateStats.pending > 0 ? "#dc2626" : "#0f172a" }}>
                      {updateStats.pending}
                      <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500, marginLeft: "6px" }}>
                        pending
                      </span>
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

                <div className="admin-stat-card" style={{ borderColor: hiddenCount > 0 ? "#cbd5e1" : "#e2e8f0" }}>
                  <div className="admin-stat-icon" style={{ background: "#f1f5f9", color: "#64748b" }}>👁️‍🗨️</div>
                  <div>
                    <div className="admin-stat-label">Hidden / Inactive</div>
                    <div className="admin-stat-value" style={{ color: hiddenCount > 0 ? "#64748b" : "#94a3b8" }}>
                      {hiddenCount}
                    </div>
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
                  <button
                    type="button"
                    className={`admin-pill-btn ${statusFilter === "hidden" ? "active" : ""}`}
                    onClick={() => setStatusFilter("hidden")}
                  >
                    Hidden ({hiddenCount})
                  </button>
                </div>

                {/* Add Business Button */}
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setEditingBiz({
                      category: "textiles",
                      categoryLabelEn: "Textiles & Garments",
                      categoryLabelGu: "કાપડ & ગારમેન્ટ્સ",
                      isApproved: true,
                      isActive: true,
                      country: "India",
                      countryGu: "ભારત",
                      state: "Gujarat",
                      stateGu: "ગુજરાત",
                      city: "",
                      cityGu: "",
                    });
                    setIsCustomCity(false);
                    setCustomCityInput("");
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
                        <th>Approval</th>
                        <th>Live Status</th>
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
                              {biz.images && (
                                <div style={{ marginTop: "4px" }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewCard({ url: biz.images!, title: biz.businessName, person: biz.personName })}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      fontSize: "0.72rem",
                                      color: "#0369a1",
                                      background: "#e0f2fe",
                                      border: "1px solid #bae6fd",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    🪪 Visiting Card
                                  </button>
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
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span className={`admin-badge ${biz.isApproved ? "admin-badge-approved" : "admin-badge-pending"}`}>
                                  {biz.isApproved ? (
                                    <>
                                      <span className="admin-badge-icon">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      </span>
                                      <span>Approved</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="admin-badge-icon">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <circle cx="12" cy="12" r="10" />
                                          <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                      </span>
                                      <span>Pending</span>
                                    </>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleApproval(biz)}
                                  className={`admin-btn admin-btn-sm ${biz.isApproved ? "admin-btn-secondary" : "admin-btn-success"}`}
                                  style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                                  title={biz.isApproved ? "Click to revoke approval" : "Click to approve this business"}
                                >
                                  {biz.isApproved ? "Unapprove" : "✓ Approve"}
                                </button>
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={biz.isActive !== false}
                                onClick={() => toggleActive(biz)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "4px 0",
                                }}
                                title={biz.isActive !== false ? "Click to set Inactive (Hidden)" : "Click to set Active (Visible)"}
                              >
                                <span
                                  style={{
                                    position: "relative",
                                    display: "inline-block",
                                    width: "36px",
                                    height: "20px",
                                    borderRadius: "9999px",
                                    backgroundColor: biz.isActive !== false ? "#10b981" : "#cbd5e1",
                                    transition: "background-color 0.2s ease",
                                    flexShrink: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      position: "absolute",
                                      top: "2px",
                                      left: biz.isActive !== false ? "18px" : "2px",
                                      width: "16px",
                                      height: "16px",
                                      borderRadius: "50%",
                                      backgroundColor: "#ffffff",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                                      transition: "left 0.2s ease",
                                    }}
                                  />
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    color: biz.isActive !== false ? "#059669" : "#64748b",
                                    minWidth: "52px",
                                    textAlign: "left",
                                  }}
                                >
                                  {biz.isActive !== false ? "Active" : "Inactive"}
                                </span>
                              </button>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const bizToEdit = {
                                      ...biz,
                                      country: biz.country || "India",
                                      countryGu: biz.countryGu || "ભારત",
                                      state: biz.state || "Gujarat",
                                      stateGu: biz.stateGu || "ગુજરાત",
                                    };
                                    setEditingBiz(bizToEdit);
                                    setIsCustomCity(false);
                                    setCustomCityInput(biz.city || "");
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
          {/* TAB 3: UPDATE REQUESTS                                       */}
          {/* ============================================================ */}
          {activeTab === "updates" && (
            <div>
              {/* Header Banner */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px 24px",
                  marginBottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      ✏️ Business Update Requests
                    </h3>
                    <span
                      style={{
                        background: updateRequests.length > 0 ? "#ef4444" : "#10b981",
                        color: "#ffffff",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        padding: "3px 12px",
                        borderRadius: "9999px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {updateRequests.length} {updateRequests.length === 1 ? "Pending" : "Pending"}
                    </span>
                  </div>
                  <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "6px 0 0 0", maxWidth: "680px", lineHeight: 1.5 }}>
                    Review and verify correction requests submitted by business owners. Approving applies changes to the live directory immediately and clears the request.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => loadUpdateRequests()}
                  disabled={loadingUpdates}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: "8px",
                  }}
                >
                  <span>🔄</span>
                  <span>Refresh</span>
                </button>
              </div>

              {loadingUpdates ? (
                <div className="admin-table-card" style={{ padding: "50px", textAlign: "center", color: "#64748b" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⏳</div>
                  <div style={{ fontWeight: 600 }}>Loading update requests from database...</div>
                </div>
              ) : updateRequests.length === 0 ? (
                <div
                  className="admin-table-card"
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: "3.5rem", marginBottom: "14px" }}>🎉</div>
                  <h4 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
                    All Update Requests Cleared!
                  </h4>
                  <p style={{ color: "#64748b", fontSize: "0.92rem", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
                    There are currently no pending update requests. When a business owner submits changes from the website directory, they will appear here for verification.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
                  {updateRequests.map((req) => {
                    const cleanPhone = (req.requesterPhone || "").replace(/\D/g, "");
                    const regPhone = ((req.oldData as any)?.phone || "").replace(/\D/g, "");
                    const waVerifyText = `Jai Randal Maa! We received an update request for your business "${req.businessName}" on the Kabariya Parivar Directory. Did you submit this update?`;
                    const waVerifyUrl = cleanPhone
                      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(waVerifyText)}`
                      : "";

                    // Identify ONLY fields that were actually modified
                    const changedFields: Array<{ key: string; label: string; oldVal: string; newVal: string }> = [];
                    const fieldsToCheck: Array<{ key: string; label: string }> = [
                      { key: "businessName", label: "Business Name (EN)" },
                      { key: "businessNameGu", label: "Business Name (GU)" },
                      { key: "category", label: "Category" },
                      { key: "personName", label: "Contact Person / Owner" },
                      { key: "personName2", label: "Partner / 2nd Person" },
                      { key: "phone", label: "Primary Phone" },
                      { key: "phone2", label: "Secondary Phone" },
                      { key: "whatsapp", label: "WhatsApp Number" },
                      { key: "city", label: "City" },
                      { key: "village", label: "Native Village" },
                      { key: "address", label: "Address" },
                      { key: "email", label: "Email" },
                      { key: "website", label: "Website" },
                      { key: "description", label: "Description / Services" },
                    ];

                    fieldsToCheck.forEach((f) => {
                      const oldV = String((req.oldData as any)?.[f.key] || "").trim();
                      const newV = String((req.updatedData as any)?.[f.key] || "").trim();
                      if (newV && oldV !== newV) {
                        changedFields.push({ key: f.key, label: f.label, oldVal: oldV || "—", newVal: newV });
                      }
                    });

                    return (
                      <div
                        key={req.id}
                        style={{
                          background: "#ffffff",
                          borderRadius: "14px",
                          border: "1.5px solid #e2e8f0",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                          overflow: "hidden",
                          borderLeft: `5px solid ${req.isOwnerPhoneMatch ? "#10b981" : "#f59e0b"}`,
                        }}
                      >
                        {/* Top Header */}
                        <div
                          style={{
                            padding: "18px 24px",
                            background: "#fafafa",
                            borderBottom: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#83181f", margin: 0 }}>
                              {req.businessName}
                            </h3>
                            <span
                              style={{
                                background: "#e2e8f0",
                                color: "#475569",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              ID: {req.businessId}
                            </span>
                            {(req.updatedData as any)?.category && (
                              <span
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                }}
                              >
                                {(req.updatedData as any)?.categoryLabelEn || (req.updatedData as any)?.category}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
                            🕒 {new Date(req.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                          </div>
                        </div>

                        {/* Card Content Body */}
                        <div style={{ padding: "20px 24px" }}>
                          {/* Requester Identity & Owner Verification Box */}
                          <div
                            style={{
                              background: req.isOwnerPhoneMatch ? "#f0fdf4" : "#fffbeb",
                              border: `1.5px solid ${req.isOwnerPhoneMatch ? "#bbf7d0" : "#fde68a"}`,
                              borderRadius: "10px",
                              padding: "16px 20px",
                              marginBottom: "20px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" }}>
                                    👤 Requester: {req.requesterName}
                                  </span>
                                  <span style={{ fontSize: "0.95rem", color: "#334155", fontWeight: 700 }}>
                                    📞 +91 {req.requesterPhone}
                                  </span>

                                  {req.isOwnerPhoneMatch ? (
                                    <span
                                      style={{
                                        background: "#15803d",
                                        color: "#ffffff",
                                        padding: "3px 12px",
                                        borderRadius: "9999px",
                                        fontSize: "0.78rem",
                                        fontWeight: 800,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <span>🛡️</span>
                                      <span>Verified Registered Owner (Phone Matched)</span>
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        background: "#b45309",
                                        color: "#ffffff",
                                        padding: "3px 12px",
                                        borderRadius: "9999px",
                                        fontSize: "0.78rem",
                                        fontWeight: 800,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <span>⚠️</span>
                                      <span>Different Phone Number</span>
                                    </span>
                                  )}
                                </div>

                                {(req.requestNote || req.changeNote) && (
                                  <div
                                    style={{
                                      marginTop: "10px",
                                      fontSize: "0.9rem",
                                      color: "#1e293b",
                                      background: "#ffffff",
                                      border: "1px solid #e2e8f0",
                                      padding: "8px 14px",
                                      borderRadius: "6px",
                                      display: "inline-block",
                                    }}
                                  >
                                    <strong>💬 Note / Reason:</strong> &ldquo;{req.requestNote || req.changeNote}&rdquo;
                                  </div>
                                )}

                                {!req.isOwnerPhoneMatch && regPhone && (
                                  <div style={{ marginTop: "8px", fontSize: "0.84rem", color: "#92400e", fontWeight: 600 }}>
                                    ℹ️ Registered phone on file: <strong>+91 {regPhone}</strong>
                                  </div>
                                )}
                              </div>

                              {/* 1-Click Verification CTA */}
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                {waVerifyUrl && (
                                  <a
                                    href={waVerifyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="admin-btn admin-btn-sm"
                                    style={{
                                      background: "#25d366",
                                      color: "#ffffff",
                                      borderColor: "#25d366",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      fontWeight: 700,
                                      borderRadius: "8px",
                                      padding: "7px 14px",
                                    }}
                                  >
                                    <span>💬 WhatsApp Verify</span>
                                  </a>
                                )}
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="admin-btn admin-btn-secondary admin-btn-sm"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontWeight: 600,
                                    borderRadius: "8px",
                                    padding: "7px 14px",
                                  }}
                                >
                                  <span>📞 Call Requester</span>
                                </a>
                                {!req.isOwnerPhoneMatch && regPhone && (
                                  <a
                                    href={`tel:${regPhone}`}
                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "6px",
                                      fontWeight: 600,
                                      borderColor: "#f59e0b",
                                      borderRadius: "8px",
                                      padding: "7px 14px",
                                    }}
                                  >
                                    <span>📞 Call Registered Owner</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ONLY Changed Fields Diff */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                                🔍 Changed Fields Only ({changedFields.length}):
                              </h4>
                              <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                                {changedFields.length} {changedFields.length === 1 ? "field modified" : "fields modified"}
                              </span>
                            </div>

                            {changedFields.length === 0 ? (
                              <div
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  padding: "14px 18px",
                                  color: "#64748b",
                                  fontSize: "0.88rem",
                                }}
                              >
                                ℹ️ No field changes detected (all values are identical).
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {changedFields.map((field) => (
                                  <div
                                    key={field.key}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "180px 1fr auto 1fr",
                                      alignItems: "center",
                                      gap: "12px",
                                      background: "#f8fafc",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "8px",
                                      padding: "10px 16px",
                                      fontSize: "0.88rem",
                                    }}
                                  >
                                    <div style={{ fontWeight: 700, color: "#334155" }}>
                                      {field.label}:
                                    </div>

                                    <div
                                      style={{
                                        color: "#64748b",
                                        background: "#f1f5f9",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        textDecoration: "line-through",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {field.oldVal}
                                    </div>

                                    <span style={{ color: "#10b981", fontWeight: 900, fontSize: "1.1rem" }}>
                                      ➔
                                    </span>

                                    <div
                                      style={{
                                        color: "#065f46",
                                        background: "#ecfdf5",
                                        border: "1px solid #a7f3d0",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontWeight: 700,
                                        wordBreak: "break-word",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "8px",
                                      }}
                                    >
                                      <span>{field.newVal}</span>
                                      <span
                                        style={{
                                          fontSize: "0.68rem",
                                          background: "#10b981",
                                          color: "#ffffff",
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          fontWeight: 800,
                                          flexShrink: 0,
                                        }}
                                      >
                                        NEW
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions Bar */}
                        <div
                          style={{
                            padding: "16px 24px",
                            background: "#fafafa",
                            borderTop: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                          }}
                        >
                          <div style={{ fontSize: "0.84rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>💡</span>
                            <span>Approving will update the live directory immediately and clear this request.</span>
                          </div>

                          <div style={{ display: "flex", gap: "10px" }}>
                            <button
                              type="button"
                              disabled={processingUpdateId === req.id}
                              onClick={() => setConfirmUpdateModal({ req, action: "reject" })}
                              className="admin-btn admin-btn-danger"
                              style={{
                                padding: "10px 18px",
                                borderRadius: "8px",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                              }}
                            >
                              ❌ Reject
                            </button>
                            <button
                              type="button"
                              disabled={processingUpdateId === req.id}
                              onClick={() => setConfirmUpdateModal({ req, action: "approve" })}
                              className="admin-btn"
                              style={{
                                background: "#10b981",
                                color: "#ffffff",
                                borderColor: "#10b981",
                                padding: "10px 24px",
                                borderRadius: "8px",
                                fontWeight: 800,
                                fontSize: "0.92rem",
                                boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
                              }}
                            >
                              ✅ Approve &amp; Apply Live
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB: YAJMANS                                                 */}
          {/* ============================================================ */}
          {activeTab === "yajman" && (
            <div>
              {/* Top Action Bar */}
              <div className="admin-action-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                      🔥 Yagna Yajmans Management
                    </h3>
                    <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "0.8rem", fontWeight: 800, padding: "3px 12px", borderRadius: "9999px" }}>
                      {yajmanYears.length} Years Available
                    </span>
                  </div>
                  <p style={{ color: "#64748b", fontSize: "0.86rem", margin: "6px 0 0 0" }}>
                    Manage Annual Mahayagna Chief Hosts (Mukhya Yajman) and Co-Hosts (Sah Yajman) by year.
                  </p>
                  <div style={{ fontSize: "0.8rem", color: "#b45309", background: "#fef3c7", padding: "4px 10px", borderRadius: "6px", display: "inline-block", marginTop: "6px", fontWeight: 600 }}>
                    💡 નોંધ: અંગ્રેજીમાં નામ અને ગામ દાખલ કરતાં આપમેળે ગુજરાતીમાં ટ્રાન્સલેટ થશે.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => loadYajmans()}
                    disabled={loadingYajmans}
                  >
                    <span>🔄 Refresh</span>
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => {
                      setNewYearInput(new Date().getFullYear().toString());
                      setNewYearTitleGu("શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ");
                      setNewYearSamvatGu("");
                      setYearModalOpen(true);
                    }}
                    style={{ borderColor: "#d97706", color: "#b45309", fontWeight: 700 }}
                  >
                    <span>📅 + Add Year</span>
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => {
                      const defaultYear = yajmanYears.length > 0 ? yajmanYears[0].year : new Date().getFullYear();
                      setEditingYajman({
                        targetYear: defaultYear,
                        targetType: "mukhya",
                        nameEn: "",
                        nameGu: "",
                        villageEn: "",
                        villageGu: "",
                        phone: "",
                      });
                      setYajmanModalOpen(true);
                    }}
                    style={{ background: "#9e1f26", fontWeight: 700 }}
                  >
                    <span>✨ + Add Yajman</span>
                  </button>
                </div>
              </div>

              {/* Year Filters Bar */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#64748b" }}>Filter by Year:</span>
                <button
                  type="button"
                  onClick={() => setSelectedYajmanYear("all")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: "1.5px solid",
                    borderColor: selectedYajmanYear === "all" ? "#9e1f26" : "#cbd5e1",
                    background: selectedYajmanYear === "all" ? "#9e1f26" : "#fff",
                    color: selectedYajmanYear === "all" ? "#fff" : "#334155",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  All Years
                </button>
                {yajmanYears.map((yr) => (
                  <button
                    key={yr.year}
                    type="button"
                    onClick={() => setSelectedYajmanYear(yr.year)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      border: "1.5px solid",
                      borderColor: selectedYajmanYear === yr.year ? "#d97706" : "#cbd5e1",
                      background: selectedYajmanYear === yr.year ? "#d97706" : "#fff",
                      color: selectedYajmanYear === yr.year ? "#fff" : "#334155",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    Year {yr.year}
                  </button>
                ))}
              </div>

              {/* Year List Content */}
              {loadingYajmans ? (
                <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
                  Loading Yajman records...
                </div>
              ) : yajmanYears.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🔥</div>
                  <h4 style={{ fontSize: "1.1rem", color: "#0f172a", fontWeight: 700 }}>No Yagna years added yet</h4>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "6px 0 8px 0" }}>Click the button below to add your first year or Yajman.</p>
                  <div style={{ fontSize: "0.82rem", color: "#92400e", background: "#fef3c7", padding: "4px 12px", borderRadius: "6px", display: "inline-block", marginBottom: "16px", fontWeight: 600 }}>
                    💡 નોંધ: નવું વર્ષ ઉમેર્યા પછી તમે તેમાં મુખ્ય અને સહ યજમાનો ઉમેરી શકશો.
                  </div>
                  <div>
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      onClick={() => {
                        setNewYearInput(new Date().getFullYear().toString());
                        setNewYearTitleGu("શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ");
                        setNewYearSamvatGu("");
                        setYearModalOpen(true);
                      }}
                    >
                      + Add New Year
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {yajmanYears
                    .filter((y) => selectedYajmanYear === "all" || y.year === selectedYajmanYear)
                    .map((yr) => (
                      <div
                        key={yr.year}
                        style={{
                          background: "#ffffff",
                          borderRadius: "14px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                          overflow: "hidden",
                        }}
                      >
                        {/* Year Header Banner */}
                        <div
                          style={{
                            padding: "16px 20px",
                            background: "linear-gradient(135deg, #fdf8f0 0%, #fff 100%)",
                            borderBottom: "1.5px solid #fde68a",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "12px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                background: "#d97706",
                                color: "#fff",
                                fontWeight: 900,
                                fontSize: "1.1rem",
                                padding: "4px 14px",
                                borderRadius: "8px",
                                letterSpacing: "0.5px",
                              }}
                            >
                              Year {yr.year}
                            </span>
                            <div>
                              <strong style={{ fontSize: "1.1rem", color: "#78350f" }}>
                                {yr.titleGu || "વાર્ષિક મહાયજ્ઞ મહોત્સવ"}
                              </strong>
                              {yr.samvatGu && (
                                <span style={{ fontSize: "0.85rem", color: "#92400e", marginLeft: "8px", fontWeight: 600 }}>
                                  ({yr.samvatGu})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Year CTA actions */}
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingYajman({
                                  targetYear: yr.year,
                                  targetType: "mukhya",
                                  nameEn: "",
                                  nameGu: "",
                                  villageEn: "",
                                  villageGu: "",
                                  phone: "",
                                });
                                setYajmanModalOpen(true);
                              }}
                              className="admin-btn admin-btn-sm"
                              style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d", fontWeight: 700 }}
                            >
                              👑 + Add Chief Yajman
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingYajman({
                                  targetYear: yr.year,
                                  targetType: "sah",
                                  nameEn: "",
                                  nameGu: "",
                                  villageEn: "",
                                  villageGu: "",
                                  phone: "",
                                });
                                setYajmanModalOpen(true);
                              }}
                              className="admin-btn admin-btn-sm"
                              style={{ background: "#f1f5f9", color: "#334155", borderColor: "#cbd5e1", fontWeight: 700 }}
                            >
                              🤝 + Add Co-Yajman
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteYearConfirm(yr.year)}
                              className="admin-btn admin-btn-sm"
                              style={{ background: "#fff", color: "#dc2626", borderColor: "#fecaca" }}
                              title="Delete Year"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Year Content: 2-Column Split for Mukhya & Sah */}
                        <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                          {/* 1. MUKHYA YAJMAN (HIGHLIGHTED) */}
                          <div
                            style={{
                              background: "#fffdf5",
                              borderRadius: "12px",
                              border: "2px solid #f59e0b",
                              padding: "16px",
                              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.08)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1.5px dashed #fcd34d", paddingBottom: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "1.2rem" }}>👑</span>
                                <h4 style={{ fontSize: "1.02rem", fontWeight: 800, color: "#92400e", margin: 0 }}>
                                  Chief Yajman (Mukhya)
                                </h4>
                              </div>
                              <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "0.75rem", fontWeight: 800, padding: "2px 8px", borderRadius: "12px" }}>
                                {yr.mukhyaYajman?.length || 0} Members
                              </span>
                            </div>

                            {(!yr.mukhyaYajman || yr.mukhyaYajman.length === 0) ? (
                              <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                                No Chief Yajman added for this year yet.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {yr.mukhyaYajman.map((m, idx) => (
                                  <div
                                    key={m.id || idx}
                                    style={{
                                      background: "#ffffff",
                                      border: "1px solid #fde68a",
                                      borderRadius: "8px",
                                      padding: "10px 14px",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: "10px",
                                      boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "#78350f" }}>
                                        {m.nameGu || m.nameEn}
                                      </div>
                                      {m.nameEn && m.nameGu && m.nameEn !== m.nameGu && (
                                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                          {m.nameEn}
                                        </div>
                                      )}
                                      <div style={{ fontSize: "0.82rem", color: "#b45309", marginTop: "3px", fontWeight: 600 }}>
                                        📍 Village: <strong>{m.villageGu || m.villageEn || "—"}</strong>
                                        {m.villageEn && m.villageGu && m.villageEn !== m.villageGu && (
                                          <span style={{ color: "#64748b", fontWeight: 400, marginLeft: "4px" }}>({m.villageEn})</span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingYajman({
                                            targetYear: yr.year,
                                            targetType: "mukhya",
                                            personId: m.id,
                                            nameEn: m.nameEn || "",
                                            nameGu: m.nameGu || "",
                                            villageEn: m.villageEn || "",
                                            villageGu: m.villageGu || "",
                                            phone: m.phone || "",
                                          });
                                          setYajmanModalOpen(true);
                                        }}
                                        className="admin-btn admin-btn-sm"
                                        style={{ padding: "4px 8px", background: "#fff", borderColor: "#fcd34d", color: "#92400e" }}
                                        title="Edit"
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteYajmanConfirm({
                                          year: yr.year,
                                          personId: m.id,
                                          name: m.nameGu || m.nameEn,
                                          type: "mukhya",
                                        })}
                                        className="admin-btn admin-btn-sm"
                                        style={{ padding: "4px 8px", background: "#fff", borderColor: "#fecaca", color: "#dc2626" }}
                                        title="Delete"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 2. SAH YAJMAN */}
                          <div
                            style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              border: "1.5px solid #e2e8f0",
                              padding: "16px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1.5px dashed #cbd5e1", paddingBottom: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "1.2rem" }}>🤝</span>
                                <h4 style={{ fontSize: "1.02rem", fontWeight: 800, color: "#334155", margin: 0 }}>
                                  Co-Yajman (Sah)
                                </h4>
                              </div>
                              <span style={{ background: "#f1f5f9", color: "#475569", fontSize: "0.75rem", fontWeight: 800, padding: "2px 8px", borderRadius: "12px" }}>
                                {yr.sahYajman?.length || 0} Members
                              </span>
                            </div>

                            {(!yr.sahYajman || yr.sahYajman.length === 0) ? (
                              <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                                No Co-Yajman added for this year yet.
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {yr.sahYajman.map((s, idx) => (
                                  <div
                                    key={s.id || idx}
                                    style={{
                                      background: "#fafafa",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: "8px",
                                      padding: "10px 14px",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: "10px",
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: "0.98rem", fontWeight: 800, color: "#1e293b" }}>
                                        {s.nameGu || s.nameEn}
                                      </div>
                                      {s.nameEn && s.nameGu && s.nameEn !== s.nameGu && (
                                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                          {s.nameEn}
                                        </div>
                                      )}
                                      <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "3px", fontWeight: 600 }}>
                                        📍 Village: <strong>{s.villageGu || s.villageEn || "—"}</strong>
                                        {s.villageEn && s.villageGu && s.villageEn !== s.villageGu && (
                                          <span style={{ color: "#64748b", fontWeight: 400, marginLeft: "4px" }}>({s.villageEn})</span>
                                        )}
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingYajman({
                                            targetYear: yr.year,
                                            targetType: "sah",
                                            personId: s.id,
                                            nameEn: s.nameEn || "",
                                            nameGu: s.nameGu || "",
                                            villageEn: s.villageEn || "",
                                            villageGu: s.villageGu || "",
                                            phone: s.phone || "",
                                          });
                                          setYajmanModalOpen(true);
                                        }}
                                        className="admin-btn admin-btn-sm"
                                        style={{ padding: "4px 8px", background: "#fff", borderColor: "#cbd5e1", color: "#334155" }}
                                        title="Edit"
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteYajmanConfirm({
                                          year: yr.year,
                                          personId: s.id,
                                          name: s.nameGu || s.nameEn,
                                          type: "sah",
                                        })}
                                        className="admin-btn admin-btn-sm"
                                        style={{ padding: "4px 8px", background: "#fff", borderColor: "#fecaca", color: "#dc2626" }}
                                        title="Delete"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
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
      </div>

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
                    <SearchableSelect
                      options={adminCategoryOptions}
                      value={editingBiz.category || "textiles"}
                      onChange={(val, opt) => {
                        setEditingBiz({
                          ...editingBiz,
                          category: val,
                          categoryLabelEn: opt?.label || val,
                          categoryLabelGu: opt?.labelGu || val,
                        });
                      }}
                      placeholder="Select Category"
                      searchPlaceholder="Search category..."
                      required
                    />
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

                {/* Location Row: Country & State */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Country *</label>
                    <SearchableSelect
                      options={adminCountryOptions}
                      value={editingBiz.country || "India"}
                      onChange={handleAdminCountryChange}
                      placeholder="Select Country"
                      searchPlaceholder="Search country (e.g. India, USA)..."
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">State *</label>
                    <SearchableSelect
                      options={adminStateOptions}
                      value={editingBiz.state || "Gujarat"}
                      onChange={handleAdminStateChange}
                      placeholder="Select State"
                      searchPlaceholder="Search state (e.g. Gujarat, Maharashtra)..."
                      disabled={locLoadingStates || adminStateOptions.length === 0}
                      loading={locLoadingStates}
                      loadingText="Loading states..."
                      required
                    />
                  </div>
                </div>

                {/* Location Row: City & Village */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">City *</label>
                    <SearchableSelect
                      options={adminCityOptions}
                      value={isCustomCity ? "__custom__" : (editingBiz.city || "")}
                      onChange={handleAdminCityChange}
                      placeholder="Select City"
                      searchPlaceholder="Search city (e.g. Surat, Savarkundla)..."
                      disabled={locLoadingCities || !editingBiz.state}
                      loading={locLoadingCities}
                      loadingText="Loading cities..."
                      allowCustomOption={true}
                      customOptionLabel="✦ Other City / Village (Type custom)..."
                      onCustomOptionSelect={() => setIsCustomCity(true)}
                      onCustomTextSubmit={(txt) => {
                        setIsCustomCity(true);
                        setCustomCityInput(txt);
                        setEditingBiz((prev) => prev ? { ...prev, city: txt, cityGu: txt } : prev);
                      }}
                      required
                    />

                    {isCustomCity && (
                      <div style={{ marginTop: "8px" }}>
                        <input
                          type="text"
                          className="admin-form-control"
                          value={customCityInput}
                          onChange={(e) => {
                            setCustomCityInput(e.target.value);
                            setEditingBiz({ ...editingBiz, city: e.target.value, cityGu: e.target.value });
                          }}
                          placeholder="Enter custom city or village name..."
                          autoFocus
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Native Village (Optional)</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      value={editingBiz.village || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, village: e.target.value })}
                      placeholder="e.g. Savarkundla"
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className="admin-form-label" style={{ margin: 0 }}>Visiting Card / Photo</label>
                      <label style={{ fontSize: "0.78rem", color: "#3b82f6", cursor: "pointer", fontWeight: 600 }}>
                        {uploadingBizCard ? "Uploading..." : "📷 Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          disabled={uploadingBizCard}
                          onChange={handleAdminCardUpload}
                        />
                      </label>
                    </div>
                    <input
                      type="url"
                      className="admin-form-control"
                      value={editingBiz.images || ""}
                      onChange={(e) => setEditingBiz({ ...editingBiz, images: e.target.value })}
                      placeholder="https://res.cloudinary.com/... or paste link"
                    />
                    {editingBiz.images && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                        <img
                          src={editingBiz.images}
                          alt="Card Preview"
                          style={{ width: "48px", height: "32px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewCard({ url: editingBiz.images!, title: editingBiz.businessName || "Visiting Card", person: editingBiz.personName })}
                          style={{ background: "none", border: "none", fontSize: "0.78rem", color: "#3b82f6", textDecoration: "underline", cursor: "pointer", padding: 0 }}
                        >
                          View Full Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBiz({ ...editingBiz, images: "" })}
                          style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.78rem", cursor: "pointer", padding: 0 }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
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
      {/* BUSINESS UPDATE REQUEST CONFIRMATION MODAL                   */}
      {/* ============================================================ */}
      {confirmUpdateModal && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !processingUpdateId) {
              setConfirmUpdateModal(null);
            }
          }}
          style={{ zIndex: 99999 }}
        >
          <div className="admin-modal-content" style={{ maxWidth: "490px" }}>
            <div className="admin-modal-header" style={{ borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>
                  {confirmUpdateModal.action === "approve" ? "✅" : "⚠️"}
                </span>
                <h3 className="admin-modal-title" style={{ fontSize: "1.15rem", fontWeight: 800 }}>
                  {confirmUpdateModal.action === "approve"
                    ? "Approve & Apply Live Update?"
                    : "Reject Update Request?"}
                </h3>
              </div>
              <button
                type="button"
                disabled={!!processingUpdateId}
                onClick={() => setConfirmUpdateModal(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#64748b" }}
              >
                &times;
              </button>
            </div>

            <div className="admin-modal-body" style={{ padding: "20px 24px" }}>
              {confirmUpdateModal.action === "approve" ? (
                <div>
                  <p style={{ fontSize: "0.96rem", color: "#1e293b", lineHeight: 1.55, margin: "0 0 14px 0" }}>
                    Are you sure you want to approve this update for{" "}
                    <strong style={{ color: "#0f172a" }}>{confirmUpdateModal.req.businessName}</strong>?
                  </p>
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1.5px solid #bbf7d0",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      fontSize: "0.88rem",
                      color: "#166534",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div>✓ All changed fields will be published immediately to the public directory.</div>
                    <div>✓ This request will be permanently cleared from the pending queue.</div>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "0.96rem", color: "#1e293b", lineHeight: 1.55, margin: "0 0 14px 0" }}>
                    Are you sure you want to reject the update request for{" "}
                    <strong style={{ color: "#0f172a" }}>{confirmUpdateModal.req.businessName}</strong>?
                  </p>
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1.5px solid #fecaca",
                      borderRadius: "10px",
                      padding: "14px 16px",
                      fontSize: "0.88rem",
                      color: "#991b1b",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div>⚠️ No changes will be applied to the live business directory.</div>
                    <div>⚠️ This request will be deleted permanently without leaving history.</div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="admin-modal-footer"
              style={{
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                padding: "14px 24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={!!processingUpdateId}
                onClick={() => setConfirmUpdateModal(null)}
                style={{ padding: "8px 18px", borderRadius: "8px", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmUpdateModal.action === "approve" ? "admin-btn" : "admin-btn admin-btn-danger"}
                style={
                  confirmUpdateModal.action === "approve"
                    ? {
                      background: "#10b981",
                      color: "#ffffff",
                      borderColor: "#10b981",
                      padding: "8px 22px",
                      borderRadius: "8px",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                      boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
                    }
                    : {
                      padding: "8px 20px",
                      borderRadius: "8px",
                      fontWeight: 800,
                      fontSize: "0.9rem",
                    }
                }
                disabled={!!processingUpdateId}
                onClick={() => handleReviewUpdate(confirmUpdateModal.req.id, confirmUpdateModal.action)}
              >
                {processingUpdateId === confirmUpdateModal.req.id ? (
                  "Processing..."
                ) : confirmUpdateModal.action === "approve" ? (
                  "✓ Approve & Apply Live"
                ) : (
                  "✕ Reject & Delete"
                )}
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
      {/* Visiting Card Lightbox Modal */}
      {previewCard && (
        <div
          className="admin-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setPreviewCard(null)}
          style={{ zIndex: 99999 }}
        >
          <div className="admin-modal-content" style={{ maxWidth: "700px" }}>
            <div className="admin-modal-header" style={{ background: "#f8fafc" }}>
              <div>
                <h3 className="admin-modal-title" style={{ fontSize: "1.1rem" }}>{previewCard.title}</h3>
                {previewCard.person && (
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Contact: {previewCard.person}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewCard(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: "16px", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewCard.url}
                alt={previewCard.title}
                style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "6px" }}
              />
            </div>
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
              <button
                type="button"
                onClick={() => setPreviewCard(null)}
                className="admin-btn admin-btn-secondary admin-btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* YAJMAN ADD / EDIT MODAL                                      */}
      {/* ============================================================ */}
      {yajmanModalOpen && editingYajman && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setYajmanModalOpen(false)}>
          <div className="admin-modal-content" style={{ maxWidth: "560px" }}>
            <div className="admin-modal-header" style={{ background: editingYajman.targetType === "mukhya" ? "#fffbeb" : "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>{editingYajman.targetType === "mukhya" ? "👑" : "🤝"}</span>
                <h3 className="admin-modal-title">
                  {editingYajman.personId ? "Edit Yajman Details" : "Add New Yajman"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setYajmanModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveYajmanPerson}>
              <div className="admin-modal-body">
                {/* Year and Role */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Year *</label>
                    <select
                      className="admin-form-control"
                      value={editingYajman.targetYear}
                      onChange={(e) => setEditingYajman({ ...editingYajman, targetYear: Number(e.target.value) })}
                      required
                    >
                      {yajmanYears.map((y) => (
                        <option key={y.year} value={y.year}>Year {y.year}</option>
                      ))}
                      {!yajmanYears.some((y) => y.year === editingYajman.targetYear) && (
                        <option value={editingYajman.targetYear}>Year {editingYajman.targetYear}</option>
                      )}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Yajman Role / Type *</label>
                    <select
                      className="admin-form-control"
                      value={editingYajman.targetType}
                      onChange={(e) => setEditingYajman({ ...editingYajman, targetType: e.target.value as "mukhya" | "sah" })}
                      style={{ fontWeight: 700, color: editingYajman.targetType === "mukhya" ? "#b45309" : "#334155" }}
                    >
                      <option value="mukhya">👑 Mukhya Yajman (Chief Host)</option>
                      <option value="sah">🤝 Sah Yajman (Co-Host)</option>
                    </select>
                  </div>
                </div>

                {/* Name English & Gujarati */}
                <div className="admin-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="admin-form-label">Full Name in English *</label>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Auto-translates on blur</span>
                  </div>
                  <input
                    type="text"
                    className="admin-form-control"
                    placeholder="e.g. Rameshbhai Mohanbhai Kabariya"
                    value={editingYajman.nameEn}
                    onChange={(e) => setEditingYajman({ ...editingYajman, nameEn: e.target.value })}
                    onBlur={(e) => {
                      if (!editingYajman.nameGu.trim()) {
                        handleAutoTranslateName(e.target.value);
                      }
                    }}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="admin-form-label">Full Name in Gujarati *</label>
                    <button
                      type="button"
                      onClick={() => handleAutoTranslateName(editingYajman.nameEn)}
                      disabled={isTranslatingName || !editingYajman.nameEn.trim()}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "0.78rem",
                        color: "#9e1f26",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {isTranslatingName ? "⏳ Translating..." : "🔄 Auto Translate"}
                    </button>
                  </div>
                  <input
                    type="text"
                    className="admin-form-control"
                    placeholder="દા.ત. રમેશભાઈ મોહનભાઈ કાબરીયા"
                    value={editingYajman.nameGu}
                    onChange={(e) => setEditingYajman({ ...editingYajman, nameGu: e.target.value })}
                    required
                  />
                  <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "4px" }}>
                    💡 નોંધ: અંગ્રેજી નામ લખીને બહાર ક્લિક કરશો એટલે અહીં ગુજરાતી નામ આપમેળે આવી જશે. તમે જરૂર મુજબ સુધારી પણ શકો છો.
                  </div>
                </div>

                {/* Village English & Gujarati */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Village / Gam in English *</label>
                    <input
                      type="text"
                      className="admin-form-control"
                      placeholder="e.g. Savarkundla"
                      value={editingYajman.villageEn}
                      onChange={(e) => setEditingYajman({ ...editingYajman, villageEn: e.target.value })}
                      onBlur={(e) => {
                        if (!editingYajman.villageGu.trim()) {
                          handleAutoTranslateVillage(e.target.value);
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="admin-form-label">Village / Gam in Gujarati *</label>
                      <button
                        type="button"
                        onClick={() => handleAutoTranslateVillage(editingYajman.villageEn)}
                        disabled={isTranslatingVillage || !editingYajman.villageEn.trim()}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "0.75rem",
                          color: "#9e1f26",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {isTranslatingVillage ? "⏳ Translating..." : "🔄 Auto"}
                      </button>
                    </div>
                    <input
                      type="text"
                      className="admin-form-control"
                      placeholder="દા.ત. સાવરકુંડલા"
                      value={editingYajman.villageGu}
                      onChange={(e) => setEditingYajman({ ...editingYajman, villageGu: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "-8px", marginBottom: "12px" }}>
                  💡 નોંધ: ગામનું નામ અંગ્રેજીમાં લખતા જ ગુજરાતી નામ આપમેળે ભરાઈ જશે.
                </div>

                {/* Optional Phone */}
                <div className="admin-form-group">
                  <label className="admin-form-label">Contact Phone (Optional)</label>
                  <input
                    type="tel"
                    className="admin-form-control"
                    placeholder="e.g. 9876543210"
                    value={editingYajman.phone || ""}
                    onChange={(e) => setEditingYajman({ ...editingYajman, phone: e.target.value })}
                  />
                </div>

                {/* Live Card Preview */}
                {(editingYajman.nameGu || editingYajman.nameEn) && (
                  <div style={{ marginTop: "10px", padding: "12px", background: editingYajman.targetType === "mukhya" ? "#fffdf5" : "#f8fafc", borderRadius: "8px", border: editingYajman.targetType === "mukhya" ? "1.5px solid #fcd34d" : "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>Preview on Website:</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: editingYajman.targetType === "mukhya" ? "#92400e" : "#0f172a" }}>
                          {editingYajman.nameGu || editingYajman.nameEn}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#b45309" }}>
                          📍 Village: {editingYajman.villageGu || editingYajman.villageEn || "—"}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "3px 8px", borderRadius: "4px", background: editingYajman.targetType === "mukhya" ? "#fef3c7" : "#e2e8f0", color: editingYajman.targetType === "mukhya" ? "#92400e" : "#334155" }}>
                        {editingYajman.targetType === "mukhya" ? "👑 Chief Yajman" : "🤝 Co-Yajman"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setYajmanModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  {editingYajman.personId ? "Update Yajman" : "Save Yajman"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD YEAR MODAL                                               */}
      {/* ============================================================ */}
      {yearModalOpen && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setYearModalOpen(false)}>
          <div className="admin-modal-content" style={{ maxWidth: "440px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">📅 Add New Yagna Year</h3>
              <button
                type="button"
                onClick={() => setYearModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveNewYear}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label">Year *</label>
                  <input
                    type="number"
                    className="admin-form-control"
                    placeholder="e.g. 2026"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    required
                    min={1990}
                    max={2099}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Yagna Celebration Title (Optional)</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    placeholder="દા.ત. શ્રી વાર્ષિક મહાયજ્ઞ મહોત્સવ"
                    value={newYearTitleGu}
                    onChange={(e) => setNewYearTitleGu(e.target.value)}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Vikram Samvat Year (Optional)</label>
                  <input
                    type="text"
                    className="admin-form-control"
                    placeholder="દા.ત. વિક્રમ સંવત ૨૦૮૨"
                    value={newYearSamvatGu}
                    onChange={(e) => setNewYearSamvatGu(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                  💡 નોંધ: વર્ષ ઉમેર્યા પછી તમે તેમાં એક કે વધુ મુખ્ય અને સહ યજમાનો સરળતાથી ઉમેરી શકશો.
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setYearModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Create Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE YAJMAN PERSON CONFIRM MODAL                          */}
      {/* ============================================================ */}
      {deleteYajmanConfirm && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "420px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Delete Yajman?</h3>
              <button
                type="button"
                onClick={() => setDeleteYajmanConfirm(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: "0.92rem", color: "#334155", margin: 0 }}>
                Are you sure you want to remove {deleteYajmanConfirm.type === "mukhya" ? "Chief Yajman" : "Co-Yajman"}{" "}
                <strong>"{deleteYajmanConfirm.name}"</strong> from Year <strong>{deleteYajmanConfirm.year}</strong>?
              </p>
              <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "10px" }}>
                ⚠️ નોંધ: આ યજમાનને ડિલીટ કરવાથી વેબસાઇટ પરથી પણ તેમનું નામ તાત્કાલિક દૂર થઈ જશે.
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setDeleteYajmanConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteYajmanPerson}
              >
                Delete Yajman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE YEAR CONFIRM MODAL                                    */}
      {/* ============================================================ */}
      {deleteYearConfirm && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: "420px" }}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Delete Entire Year Record?</h3>
              <button
                type="button"
                onClick={() => setDeleteYearConfirm(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: "0.92rem", color: "#334155", margin: 0 }}>
                Are you sure you want to delete the entire record for Year <strong>{deleteYearConfirm}</strong>? All Chief and Co-Yajmans for this year will be permanently removed.
              </p>
              <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "10px" }}>
                ⚠️ નોંધ: આ વર્ષનો સંપૂર્ણ ડેટા ડિલીટ થઈ જશે. આ ક્રિયા પૂર્વવત કરી શકાશે નહીં.
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setDeleteYearConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDeleteYear}
              >
                Delete Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
