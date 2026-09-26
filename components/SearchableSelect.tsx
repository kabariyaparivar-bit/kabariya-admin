"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

export interface SelectOption {
  value: string;
  label: string;
  labelGu?: string;
  subLabel?: string;
  icon?: string | React.ReactNode;
  badge?: string;
  isCustom?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  name?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string, selectedOption?: SelectOption) => void;
  placeholder?: string;
  placeholderGu?: string;
  searchPlaceholder?: string;
  searchPlaceholderGu?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  loadingTextGu?: string;
  required?: boolean;
  lang?: "en" | "gu";
  allowCustomOption?: boolean;
  customOptionLabel?: string;
  customOptionLabelGu?: string;
  onCustomOptionSelect?: () => void;
  onCustomTextSubmit?: (customText: string) => void;
  emptyText?: string;
  emptyTextGu?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SearchableSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = "-- Select --",
  placeholderGu = "-- પસંદ કરો --",
  searchPlaceholder = "Type to search...",
  searchPlaceholderGu = "શોધવા માટે લખો...",
  disabled = false,
  loading = false,
  loadingText = "Loading options...",
  loadingTextGu = "લોડ થઈ રહ્યું છે...",
  required = false,
  lang = "gu",
  allowCustomOption = false,
  customOptionLabel = "✦ Other / Type Custom Name...",
  customOptionLabelGu = "✦ અન્ય / અહીં જાતે લખો...",
  onCustomOptionSelect,
  onCustomTextSubmit,
  emptyText = "No matching options found",
  emptyTextGu = "કોઈ પરિણામ મળ્યું નથી",
  className = "",
  style,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;

    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchLabelGu = opt.labelGu ? opt.labelGu.toLowerCase().includes(q) : false;
      const matchValue = opt.value.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchLabel || matchLabelGu || matchValue || matchSub || matchBadge;
    });
  }, [options, searchQuery]);

  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return filteredOptions.some(
      (opt) =>
        opt.label.toLowerCase() === q ||
        (opt.labelGu && opt.labelGu.toLowerCase() === q) ||
        opt.value.toLowerCase() === q
    );
  }, [filteredOptions, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !optionsListRef.current) return;
    const items = optionsListRef.current.querySelectorAll<HTMLButtonElement>(".searchable-select-item");
    const activeItem = items[highlightedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || loading) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex]);
      } else if (allowCustomOption && searchQuery.trim()) {
        handleQuickAddCustom();
      }
    }
  };

  const selectOption = useCallback(
    (opt: SelectOption) => {
      if (opt.isCustom || opt.value === "__custom__") {
        if (onCustomOptionSelect) onCustomOptionSelect();
        onChange("__custom__", opt);
      } else {
        onChange(opt.value, opt);
      }
      setIsOpen(false);
      setSearchQuery("");
    },
    [onChange, onCustomOptionSelect]
  );

  const handleQuickAddCustom = () => {
    const customText = searchQuery.trim();
    if (!customText) return;

    if (onCustomTextSubmit) {
      onCustomTextSubmit(customText);
    } else if (onCustomOptionSelect) {
      onCustomOptionSelect();
    }
    onChange("__custom__", {
      value: "__custom__",
      label: customText,
      labelGu: customText,
      isCustom: true,
    });
    setIsOpen(false);
    setSearchQuery("");
  };

  const renderDisplayLabel = (opt: SelectOption) => {
    if (lang === "gu") {
      if (opt.labelGu && opt.labelGu !== opt.label) {
        return (
          <>
            <span className="searchable-label-primary">{opt.labelGu}</span>
            <span className="searchable-label-secondary">({opt.label})</span>
          </>
        );
      }
      return <span className="searchable-label-primary">{opt.labelGu || opt.label}</span>;
    } else {
      if (opt.labelGu && opt.labelGu !== opt.label) {
        return (
          <>
            <span className="searchable-label-primary">{opt.label}</span>
            <span className="searchable-label-secondary">({opt.labelGu})</span>
          </>
        );
      }
      return <span className="searchable-label-primary">{opt.label}</span>;
    }
  };

  const currentPlaceholder = lang === "gu" ? placeholderGu : placeholder;
  const currentSearchPlaceholder = lang === "gu" ? searchPlaceholderGu : searchPlaceholder;
  const currentLoadingText = lang === "gu" ? loadingTextGu : loadingText;
  const currentEmptyText = lang === "gu" ? emptyTextGu : emptyText;
  const currentCustomLabel = lang === "gu" ? customOptionLabelGu : customOptionLabel;

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`}
      style={style}
      onKeyDown={handleKeyDown}
    >
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{
            opacity: 0,
            width: 0,
            height: 0,
            position: "absolute",
            pointerEvents: "none",
          }}
          value={value}
          onChange={() => {}}
          required={required}
        />
      )}

      <button
        id={id}
        name={name}
        type="button"
        className="searchable-select-trigger"
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen((prev) => !prev);
          }
        }}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="searchable-select-trigger-content">
          {loading ? (
            <div className="searchable-select-loading-pill">
              <span className="searchable-select-spinner" />
              <span>{currentLoadingText}</span>
            </div>
          ) : selectedOption ? (
            <div className="searchable-select-selected-val">
              {selectedOption.icon && (
                <span className="searchable-select-icon">{selectedOption.icon}</span>
              )}
              <div className="searchable-select-text">
                {renderDisplayLabel(selectedOption)}
              </div>
              {selectedOption.badge && (
                <span className="searchable-select-badge">{selectedOption.badge}</span>
              )}
            </div>
          ) : (
            <span className="searchable-select-placeholder">{currentPlaceholder}</span>
          )}
        </div>

        <div className="searchable-select-arrows">
          {loading ? (
            <span className="searchable-select-spinner" />
          ) : (
            <svg
              className={`searchable-select-chevron ${isOpen ? "rotate" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="searchable-select-dropdown animate-fade-down" role="listbox">
          <div className="searchable-select-search-header">
            <div className="searchable-select-search-box">
              <svg
                className="searchable-select-search-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M13 13l4.5 4.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="searchable-select-search-input"
                placeholder={currentSearchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="searchable-select-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="searchable-select-meta-bar">
              <span>
                {filteredOptions.length} {lang === "gu" ? "વિકલ્પો ઉપલબ્ધ" : "options available"}
              </span>
              {searchQuery && (
                <span className="searchable-select-query-tag">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>
          </div>

          <div ref={optionsListRef} className="searchable-select-options-list">
            {allowCustomOption && searchQuery.trim() && !hasExactMatch && (
              <button
                type="button"
                className="searchable-select-custom-quick-add"
                onClick={handleQuickAddCustom}
              >
                <span className="searchable-select-custom-icon">✦</span>
                <div className="searchable-select-custom-info">
                  <strong>
                    {lang === "gu" ? `"${searchQuery.trim()}" ઉમેરો` : `Use "${searchQuery.trim()}"`}
                  </strong>
                  <small>
                    {lang === "gu"
                      ? "આ નામ કસ્ટમ શહેર / ગામ તરીકે વાપરો"
                      : "Use as custom city / village name"}
                  </small>
                </div>
                <span className="searchable-select-enter-badge">↵ Enter</span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.slice(0, 150).map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    className={`searchable-select-item ${isSelected ? "is-selected" : ""} ${
                      isHighlighted ? "is-highlighted" : ""
                    }`}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="searchable-select-item-main">
                      {opt.icon && (
                        <span className="searchable-select-item-icon">{opt.icon}</span>
                      )}
                      <div className="searchable-select-item-names">
                        {renderDisplayLabel(opt)}
                        {opt.subLabel && (
                          <span className="searchable-select-item-sub">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="searchable-select-item-right">
                      {opt.badge && (
                        <span className="searchable-select-item-badge">{opt.badge}</span>
                      )}
                      {isSelected && (
                        <svg
                          className="searchable-select-checkmark"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="searchable-select-empty">
                <span className="searchable-select-empty-icon">🔍</span>
                <p>{currentEmptyText}</p>
                {allowCustomOption && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    style={{
                      fontSize: "0.82rem",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      marginTop: "8px",
                    }}
                    onClick={() => {
                      if (onCustomOptionSelect) onCustomOptionSelect();
                      onChange("__custom__", {
                        value: "__custom__",
                        label: searchQuery || "Other",
                      });
                      setIsOpen(false);
                    }}
                  >
                    {currentCustomLabel}
                  </button>
                )}
              </div>
            )}

            {allowCustomOption && (
              <button
                type="button"
                className={`searchable-select-item searchable-select-custom-footer ${
                  value === "__custom__" ? "is-selected" : ""
                }`}
                onClick={() => {
                  if (onCustomOptionSelect) onCustomOptionSelect();
                  onChange("__custom__", {
                    value: "__custom__",
                    label: "Other / Custom",
                    isCustom: true,
                  });
                  setIsOpen(false);
                }}
              >
                <div className="searchable-select-item-main">
                  <span className="searchable-select-item-icon">✦</span>
                  <div className="searchable-select-item-names">
                    <span className="searchable-label-primary" style={{ color: "#7a2436" }}>
                      {currentCustomLabel}
                    </span>
                    <span className="searchable-label-secondary">
                      {lang === "gu"
                        ? "જો આપનું ગામ લિસ્ટમાં ન હોય તો અહીં જાતે લખો"
                        : "If your town isn't listed, type custom name"}
                    </span>
                  </div>
                </div>
                <span className="searchable-select-item-badge custom-badge">Custom</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
