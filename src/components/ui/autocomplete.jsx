import React, { useState, useRef, useEffect } from 'react';
import { safeLower } from "../../utils/safeFormat";
import { cn } from '../../lib/utils';
import { INDIAN_CITIES, VALID_NICHES } from '../../lib/constants';
import { searchLocations } from '../../lib/locations';
import { MapPin, Check, Loader2, Plus } from 'lucide-react';

export function Autocomplete({ items = [], value, onChange, placeholder, className, onSelectItem, label }) {
  const [search, setSearch] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  // Update internal search if external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSearch(value);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = (items || [])
    .filter(n => typeof n === 'string' && n.toLowerCase().includes((search || "").toLowerCase()))
    .slice(0, 15);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">{label}</label>}
      <input
        className={cn("w-full px-4 py-3 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-elevated)] focus:border-[var(--violet)] text-[var(--text-primary)] outline-none font-mono", className)}
        placeholder={placeholder}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setShowDropdown(true);
          if (onChange) onChange(e.target.value);
        }}
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl max-h-60 overflow-y-auto z-50 shadow-2xl">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <button
                key={item}
                type="button"
                className="w-full text-left px-4 py-3 text-[var(--text-primary)] hover:bg-[var(--violet)]/20 transition-colors flex items-center justify-between"
                onClick={() => {
                  setSearch(item);
                  setShowDropdown(false);
                  if (onChange) onChange(item);
                  if (onSelectItem) onSelectItem(item);
                }}
              >
                <span>{item}</span>
                {search.toLowerCase() === item.toLowerCase() && <Check className="w-4 h-4 text-[var(--violet)]" />}
              </button>
            ))
          ) : null}
          {search.trim().length > 0 && !items.some(i => typeof i === 'string' && i.toLowerCase() === search.toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-indigo-500 font-medium hover:bg-[var(--violet)]/20 flex items-center gap-2"
              onClick={() => {
                setShowDropdown(false);
                if (onChange) onChange(search);
                if (onSelectItem) onSelectItem(search);
              }}
            >
              <Plus className="w-4 h-4" />
              Use "{search}"
            </button>
          )}
          {filteredItems.length === 0 && search.trim().length === 0 && (
            <div className="p-4 text-[var(--text-secondary)] text-sm">Type to search...</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Global & India Location Autocomplete
 * Connects to Supabase /api/locations/search & /api/locations/save with instant local fallback.
 */
export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search state, city or global location...", 
  className, 
  onSelectItem, 
  label 
}) {
  const [search, setSearch] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  // Sync external value
  useEffect(() => {
    if (value !== undefined) {
      setSearch(value);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch location suggestions with debounce
  useEffect(() => {
    // 1. Instant local results
    const local = searchLocations(search, 15);
    setResults(local);

    // 2. Query backend API to include Supabase persisted selections & real-time global geocoding
    const timer = setTimeout(async () => {
      if (!search.trim()) return;
      try {
        setIsLoading(true);
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(search.trim())}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setResults(data);
          }
        }
      } catch (err) {
        console.warn("Location search network error (using local fallback):", err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [search]);

  // Handle location selection + persist to Supabase
  const handleSelect = async (loc) => {
    const locName = typeof loc === 'string' ? loc : loc.name;
    const locDisplay = typeof loc === 'string' ? loc : (loc.display || loc.name);

    setSearch(locName);
    setShowDropdown(false);

    if (onChange) onChange(locName);
    if (onSelectItem) onSelectItem(loc);

    // Persist to Supabase backend in background so next time it appears instantly
    try {
      fetch('/api/locations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: locName, type: typeof loc === 'object' && loc.type ? safeLower(loc.type) : 'location' })
      }).catch(() => {});
    } catch (e) {}
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">{label}</label>}
      <div className="relative flex items-center">
        <MapPin className="absolute left-3.5 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
        <input
          className={cn("w-full pl-10 pr-10 py-3 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-elevated)] focus:border-[var(--violet)] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)]/60", className)}
          placeholder={placeholder}
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setShowDropdown(true);
            if (onChange) onChange(e.target.value);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3.5 w-4 h-4 text-[var(--violet)] animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl max-h-64 overflow-y-auto z-50 shadow-2xl backdrop-blur-md">
          {results.length > 0 ? (
            results.map((item, idx) => {
              const itemName = typeof item === 'string' ? item : item.name;
              const itemDisplay = typeof item === 'string' ? item : (item.display || item.name);
              const itemType = typeof item === 'object' ? item.type : '';
              const isSelected = search.toLowerCase() === itemName.toLowerCase();

              return (
                <button
                  key={idx}
                  type="button"
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--violet)]/15 transition-colors flex items-center justify-between border-b border-[var(--border-default)]/30 last:border-0",
                    isSelected ? "bg-[var(--violet)]/10 text-[var(--violet)] font-semibold" : "text-[var(--text-primary)]"
                  )}
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[var(--violet)] shrink-0 opacity-80" />
                    <span className="truncate">{itemDisplay}</span>
                  </div>
                  {itemType && (
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-[var(--violet)]/10 text-[var(--violet)] shrink-0 ml-2">
                      {itemType}
                    </span>
                  )}
                </button>
              );
            })
          ) : null}

          {search.trim().length > 0 && !results.some(i => (typeof i === 'string' ? i : i.name).toLowerCase() === search.toLowerCase()) && (
            <button
              type="button"
              className="w-full text-left px-4 py-3 text-indigo-400 font-medium hover:bg-[var(--violet)]/20 flex items-center gap-2 border-t border-[var(--border-default)]/50"
              onClick={() => handleSelect(search.trim())}
            >
              <Plus className="w-4 h-4" />
              <span>Select location: <strong>"{search.trim()}"</strong></span>
            </button>
          )}

          {results.length === 0 && search.trim().length === 0 && (
            <div className="p-4 text-[var(--text-secondary)] text-sm text-center">Type any state, city or country...</div>
          )}
        </div>
      )}
    </div>
  );
}

export function CategoryAutocomplete(props) {
  return <Autocomplete items={VALID_NICHES} {...props} />;
}
