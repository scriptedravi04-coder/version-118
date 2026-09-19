import React, { useState, useEffect, useRef } from "react";
import { safeLower } from "../../utils/safeFormat";
import { Search, Plus, X, Check, Loader2, AlertCircle, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VALID_NICHES, CATEGORIES_WITH_SUBS, INDIAN_CITIES } from "../../lib/constants";

/**
 * UniversalTagSearch Component
 * Fully connected to the backend tags & locations system with optimistic updates,
 * fallback instant offline search, AI validation feedback, and keyboard accessibility.
 * 
 * @param {Object} props
 * @param {string[]} props.selectedTags - Currently selected tag names
 * @param {function} props.onChange - Callback when selections change (receives string[])
 * @param {'niche' | 'skill' | 'industry' | 'category' | 'target_category' | 'location'} props.type - Type of tags to manage
 * @param {string} props.placeholder - Custom input placeholder
 * @param {string} props.label - Optional container label
 */
export default function UniversalTagSearch({
  selectedTags = [],
  onChange,
  type = "niche",
  placeholder = "Search or type to create...",
  label = "",
  context = ""
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState("");
  const [creationStatus, setCreationStatus] = useState(null); // { status, reason, name }
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const isLocation = ["location", "locations", "city", "state", "country"].includes(type);
  const safeSelectedTags = Array.isArray(selectedTags) ? selectedTags : [];
  
  // Default static list for instant recommendations
  const getStaticDefaults = () => {
    if (isLocation) {
      return (INDIAN_CITIES || []).slice(0, 15).map(c => ({ name: c, display: c, type: 'City' }));
    }
    return (VALID_NICHES || []).map(n => ({ name: n, display: n, type: 'Category', usage_count: 1 }));
  };

  const safePopularTags = Array.isArray(popularTags) && popularTags.length > 0 ? popularTags : getStaticDefaults();
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  // Load popular tags initially
  useEffect(() => {
    fetchPopularTags();
  }, [type, context]);

  // Search suggestions when query changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        fetchSearchSuggestions(query.trim());
      } else {
        setSuggestions([]);
        setActiveIndex(-1);
      }
    }, 80);

    return () => clearTimeout(delayDebounce);
  }, [query, type, context]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
        setError("");
        setCreationStatus(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPopularTags = async () => {
    try {
      const endpoint = isLocation
        ? `/api/locations/search?q=&limit=15`
        : `/api/tags/popular?type=${type}&context=${encodeURIComponent(context || "")}`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPopularTags(data);
          return;
        } else if (data && Array.isArray(data.tags) && data.tags.length > 0) {
          setPopularTags(data.tags);
          return;
        } else if (data && Array.isArray(data.data) && data.data.length > 0) {
          setPopularTags(data.data);
          return;
        }
      }
    } catch (err) {
      console.warn("Popular tags network fallback to static presets:", err);
    }
    setPopularTags(getStaticDefaults());
  };

  const fetchSearchSuggestions = async (searchQ) => {
    setIsLoading(true);
    setError("");
    const qLower = searchQ.toLowerCase().trim();

    try {
      const endpoint = isLocation
        ? `/api/locations/search?q=${encodeURIComponent(searchQ)}&limit=15`
        : `/api/tags/search?q=${encodeURIComponent(searchQ)}&type=${type}&context=${encodeURIComponent(context || "")}`;
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        let results = [];
        if (Array.isArray(data)) {
          results = data;
        } else if (data && Array.isArray(data.suggestions)) {
          results = data.suggestions;
        } else if (data && Array.isArray(data.data)) {
          results = data.data;
        }
        if (results.length > 0) {
          setSuggestions(results);
          setActiveIndex(-1);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      // Fall through to local search
    }

    // Local instant fuzzy fallback
    let localMatches = [];
    if (isLocation) {
      localMatches = (INDIAN_CITIES || [])
        .filter(c => c.toLowerCase().includes(qLower))
        .slice(0, 10)
        .map(c => ({ name: c, display: c, type: 'City' }));
    } else {
      // Search main categories and subcategories
      const qNorm = qLower.replace(/[-_\s]+/g, "");
      const mainMatches = (VALID_NICHES || [])
        .filter(n => {
          const nLower = n.toLowerCase();
          return nLower.includes(qLower) || nLower.replace(/[-_\s]+/g, "").includes(qNorm);
        })
        .map(n => ({ name: n, display: n, type: '' }));
      
      const subMatches = [];
      if (CATEGORIES_WITH_SUBS) {
        Object.entries(CATEGORIES_WITH_SUBS).forEach(([cat, subs]) => {
          (subs || []).forEach(sub => {
            const subLower = sub.toLowerCase();
            const subNorm = subLower.replace(/[-_\s]+/g, "");
            const matchesQuery = subLower.includes(qLower) || subNorm.includes(qNorm);
            if (matchesQuery && !mainMatches.some(m => safeLower(m.name) === subLower)) {
              subMatches.push({ name: sub, display: sub, type: '' });
            }
          });
        });
      }
      localMatches = [...mainMatches, ...subMatches].slice(0, 10);
    }

    setSuggestions(localMatches);
    setActiveIndex(-1);
    setIsLoading(false);
  };

  const handleSelectTag = (tag) => {
    if (!tag) return;
    const tagName = typeof tag === 'string' ? tag.trim() : (tag.name ? tag.name.trim() : '');
    if (!tagName) return;

    if (safeSelectedTags.some(t => typeof t === 'string' && t.toLowerCase() === tagName.toLowerCase())) {
      // Already selected
      setQuery("");
      setIsOpen(false);
      return;
    }
    const updated = [...safeSelectedTags, tagName];
    if (typeof onChange === 'function') {
      onChange(updated);
    }
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    setError("");
    setCreationStatus(null);

    // Save to Supabase in background to increment usage count
    try {
      const token = localStorage.getItem("token") || "";
      const saveEndpoint = isLocation ? "/api/locations/save" : "/api/tags/create";
      fetch(saveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ name: tagName, type: isLocation ? "location" : type, context })
      }).catch(() => {});
    } catch (e) {}
  };

  const handleRemoveTag = (tagName) => {
    const updated = safeSelectedTags.filter(t => t !== tagName);
    if (typeof onChange === 'function') {
      onChange(updated);
    }
  };

  const handleCreateTag = async () => {
    const nameToCreate = query.trim();
    if (!nameToCreate) return;

    setIsCreating(true);
    setError("");
    setCreationStatus(null);

    try {
      const token = localStorage.getItem("token") || "";
      const saveEndpoint = isLocation ? "/api/locations/save" : "/api/tags/create";
      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ name: nameToCreate, type: isLocation ? "location" : type, context })
      });

      const data = await res.json();

      if (res.ok && (data.success || data.location || data.tag)) {
        const tagStatus = data.status || (isLocation ? "approved" : "approved");
        
        if (tagStatus === "rejected") {
          setError(data.error || data.rejection_reason || `This ${type} is not allowed.`);
        } else {
          // Add optimistically
          handleSelectTag(nameToCreate);
          if (tagStatus === "pending_validation") {
            setCreationStatus({
              status: "pending",
              name: nameToCreate,
              reason: "Verification under process."
            });
          }
          // Refresh popular tags list
          fetchPopularTags();
        }
      } else {
        setError(data.error || data.rejection_reason || `This ${type} is not allowed.`);
      }
    } catch (err) {
      console.error("Failed to create tag:", err);
      setError("Network error creating tag.");
    } finally {
      setIsCreating(false);
    }
  };

  const showCreateOption = query.trim() && !isLoading && safeSuggestions.length === 0;

  // Keyboard navigation inside suggestions list
  const handleKeyDown = (e) => {
    const listLength = safeSuggestions.length + (showCreateOption ? 1 : 0);
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      if (listLength > 0) {
        setActiveIndex(prev => (prev + 1) % listLength);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      if (listLength > 0) {
        setActiveIndex(prev => (prev - 1 + listLength) % listLength);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (safeSuggestions.length > 0) {
        const idx = activeIndex >= 0 && activeIndex < safeSuggestions.length ? activeIndex : 0;
        const selectedObj = safeSuggestions[idx];
        const tagName = typeof selectedObj === 'string' ? selectedObj : selectedObj?.name;
        handleSelectTag(tagName);
      } else if (showCreateOption) {
        handleCreateTag();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Selected Tags Container */}
      {safeSelectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <AnimatePresence>
            {safeSelectedTags.map((tag, idx) => {
              const tagLabel = typeof tag === 'string' ? tag : (tag?.name || String(tag));
              const tagKey = typeof tag === 'object' && tag?.id ? tag.id : (tagLabel || idx);
              return (
                <motion.span
                  key={`selected-${tagKey}-${idx}`}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs ${
                    isLocation 
                      ? "bg-blue-50/80 text-blue-700 border-blue-200/80" 
                      : "bg-[var(--violet-soft)] text-[var(--violet)] border-[var(--violet-border)]"
                  }`}
                >
                  {isLocation ? (
                    <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                  ) : null}
                  <span>{tagLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tagLabel)}
                    className="p-0.5 rounded-full hover:bg-black/10 text-current transition-colors ml-0.5"
                    title={`Remove ${tagLabel}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Input Box Wrapper */}
      <div className="relative">
        <div className="relative flex items-center">
          {isLocation ? (
            <MapPin className="absolute left-3.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setError("");
              setCreationStatus(null);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded-xl text-sm font-medium transition-all focus:outline-none focus:border-[var(--violet)] focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--violet)]/15 placeholder:text-[var(--text-tertiary)] shadow-xs"
          />
          {isLoading && (
            <Loader2 className="absolute right-3.5 w-4 h-4 text-[var(--violet)] animate-spin" />
          )}
        </div>

        {/* Dropdown suggestions */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1.5 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden max-h-72 flex flex-col">
            {/* Scrollable area */}
            <div className="overflow-y-auto flex-1 py-1 text-sm custom-scrollbar">
              
              {/* Dynamic Search suggestions */}
              {query.trim() && (
                <>
                  {safeSuggestions.map((tag, idx) => {
                    const tagName = typeof tag === 'string' ? tag : (tag?.name || String(tag || ''));
                    const tagDisplay = typeof tag === 'object' && tag?.display ? tag.display : tagName;
                    const tagType = typeof tag === 'object' && tag?.type ? tag.type : '';
                    const tagKey = typeof tag === 'object' && tag?.id ? tag.id : (tagName || idx);
                    const usageCount = typeof tag === 'object' && tag?.usage_count !== undefined ? tag.usage_count : 1;
                    const isFocused = activeIndex === idx;

                    return (
                      <button
                        key={tagKey}
                        type="button"
                        onClick={() => handleSelectTag(tag)}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors border-b border-[var(--border-default)] last:border-0 ${
                          isFocused 
                            ? "bg-[var(--violet-soft)] text-[var(--violet)] font-semibold" 
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isLocation ? (
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 opacity-90" />
                          ) : null}
                          <span className="truncate">{tagDisplay}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {tagType && (
                            <span className="text-[10px] font-semibold text-[var(--violet)] bg-[var(--violet-soft)] border border-[var(--violet-border)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {tagType}
                            </span>
                          )}
                          {!isLocation && usageCount > 0 && (
                            <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full border border-[var(--border-default)]">
                              {usageCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Add New Custom Tag Button ONLY if no search matches found */}
                  {showCreateOption && (
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={isCreating}
                      className={`w-full text-left px-4 py-3 flex items-center gap-2.5 border-t border-[var(--border-default)] transition-colors ${
                        activeIndex === 0 
                          ? "bg-[var(--violet-soft)] text-[var(--violet)]" 
                          : "text-[var(--violet)] hover:bg-[var(--violet-soft)]/50"
                      }`}
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--violet)]" />
                      ) : (
                        <Plus className="w-4 h-4 text-[var(--violet)]" />
                      )}
                      <span className="font-medium text-sm">
                        Select {type}: <strong className="underline decoration-[var(--violet)]">"{query}"</strong>
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* Popular tags when query is empty */}
              {!query.trim() && (
                <div>
                  <div className="px-4 py-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                    {isLocation ? "Popular Locations (States, UTs, Metros)" : `Popular ${type === "niche" ? "Niches" : type === "skill" ? "Sub-Categories / Skills" : type === "industry" ? "Industries" : "Categories"}`}
                  </div>
                  {safePopularTags.length === 0 ? (
                    <div className="px-4 py-4 text-[var(--text-tertiary)] text-xs italic text-center">
                      {isLocation ? "Type to search any city, state or country..." : "No popular tags listed yet. Start typing to create one!"}
                    </div>
                  ) : (
                    safePopularTags
                      .filter(tag => {
                        const tagName = typeof tag === 'string' ? tag : (tag?.name || String(tag || ''));
                        return tagName && !safeSelectedTags.some(st => (typeof st === 'string' ? st : st?.name) === tagName);
                      })
                      .map((tag, idx) => {
                        const tagName = typeof tag === 'string' ? tag : (tag?.name || String(tag || ''));
                        const tagDisplay = typeof tag === 'object' && tag?.display ? tag.display : tagName;
                        const tagType = typeof tag === 'object' && tag?.type ? tag.type : '';
                        const tagKey = typeof tag === 'object' && tag?.id ? tag.id : (tagName || idx);
                        const usageCount = typeof tag === 'object' && tag?.usage_count !== undefined ? tag.usage_count : 1;
                        return (
                          <button
                            key={tagKey}
                            type="button"
                            onClick={() => handleSelectTag(tag)}
                            className="w-full text-left px-4 py-2.5 flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border-default)] last:border-0"
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isLocation ? (
                                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0 opacity-80" />
                              ) : null}
                              <span className="truncate text-sm font-medium">{tagDisplay}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {tagType && (
                                <span className="text-[10px] font-semibold text-[var(--violet)] bg-[var(--violet-soft)] border border-[var(--violet-border)] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  {tagType}
                                </span>
                              )}
                              {!isLocation && (
                                <span className="text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full border border-[var(--border-default)]">
                                  {usageCount}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Creation and Error Feedback */}
      {error && (
        <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5 bg-red-50 p-2 rounded border border-red-100">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {creationStatus && (
        <div className="mt-2 text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-100 animate-pulse">
          <span>Optimistically added <strong>"{creationStatus.name}"</strong>. {creationStatus.reason}</span>
        </div>
      )}
    </div>
  );
}
