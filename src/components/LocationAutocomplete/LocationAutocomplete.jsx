import { useState, useRef, useEffect, useCallback, useId } from 'react';
import './LocationAutocomplete.css';
import * as googleProvider from './providers/google.js';
import * as nominatimProvider from './providers/nominatim.js';

const PROVIDERS = {
  google: googleProvider,
  nominatim: nominatimProvider,
};

const ATTRIBUTION = {
  google: null,
  nominatim: (
    <span>
      © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors
    </span>
  ),
};

const DEBOUNCE_MS = 300;

/**
 * LocationAutocomplete
 *
 * @param {object}   props
 * @param {string}   [props.provider='google']        - 'google' | 'nominatim'
 * @param {string}   [props.apiKey]                   - Google Maps API key (required for 'google' provider)
 * @param {string}   [props.placeholder='Search location...']
 * @param {string}   [props.language]                 - BCP-47 language tag for suggestions
 * @param {number}   [props.debounce=300]             - Debounce delay in ms
 * @param {function} [props.onSelect]                 - Called with the selected place details
 * @param {function} [props.onError]                  - Called with an Error when a fetch fails
 * @param {string}   [props.className]                - Extra class on the root element
 * @param {string}   [props.value]                    - Controlled value for the input
 * @param {function} [props.onChange]                 - Called when input value changes
 * @param {string}   [props.id]                       - id for the input element
 * @param {string}   [props.name]                     - name for the input element
 * @param {boolean}  [props.disabled=false]
 */
export default function LocationAutocomplete({
  provider = 'google',
  apiKey,
  placeholder = 'Search location…',
  language,
  debounce: debounceMs = DEBOUNCE_MS,
  onSelect,
  onError,
  className = '',
  value: controlledValue,
  onChange,
  id,
  name,
  disabled = false,
}) {
  const isControlled = controlledValue !== undefined;

  const [inputValue, setInputValue] = useState(isControlled ? controlledValue : '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimer = useRef(null);
  const latestQuery = useRef('');

  const generatedId = useId();
  const inputId = id ?? `lca-input-${generatedId}`;
  const listId = `lca-list-${generatedId}`;

  // Keep uncontrolled value in sync when controlled value changes
  useEffect(() => {
    if (isControlled) setInputValue(controlledValue);
  }, [isControlled, controlledValue]);

  const currentProvider = PROVIDERS[provider] ?? PROVIDERS.google;

  const fetchSuggestions = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      latestQuery.current = query;

      try {
        const results = await currentProvider.getSuggestions(query, {
          apiKey,
          language,
        });

        // Discard stale results
        if (latestQuery.current !== query) return;

        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if (latestQuery.current !== query) return;
        setError(err);
        setSuggestions([]);
        setIsOpen(false);
        onError?.(err);
      } finally {
        if (latestQuery.current === query) setIsLoading(false);
      }
    },
    [currentProvider, apiKey, language, onError],
  );

  const handleInputChange = (e) => {
    const val = e.target.value;

    if (!isControlled) setInputValue(val);
    onChange?.(val);

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(val), debounceMs);
  };

  const handleSelect = async (suggestion) => {
    const label = suggestion.label;

    if (!isControlled) setInputValue(label);
    onChange?.(label);

    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);

    if (onSelect) {
      try {
        const details = await currentProvider.getPlaceDetails(suggestion, { apiKey });
        onSelect(details);
      } catch (err) {
        onError?.(err);
      }
    }
  };

  const handleClear = () => {
    if (!isControlled) setInputValue('');
    onChange?.('');
    setSuggestions([]);
    setIsOpen(false);
    setError(null);
    clearTimeout(debounceTimer.current);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (!inputRef.current?.closest('.location-autocomplete')?.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  const displayValue = isControlled ? controlledValue : inputValue;

  return (
    <div className={`location-autocomplete${className ? ` ${className}` : ''}`} aria-expanded={isOpen} aria-owns={listId}>
      <div className="location-autocomplete__input-wrapper">
        {/* Search pin icon */}
        <svg className="location-autocomplete__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          aria-expanded={isOpen}
          className="location-autocomplete__input"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />

        {isLoading && <span className="location-autocomplete__spinner" aria-label="Loading…" role="status" />}

        {!isLoading && displayValue && (
          <button
            type="button"
            className="location-autocomplete__clear-btn"
            onClick={handleClear}
            aria-label="Clear"
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Location suggestions"
          className="location-autocomplete__dropdown"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`location-autocomplete__option${index === activeIndex ? ' location-autocomplete__option--active' : ''}`}
              onPointerDown={(e) => {
                // Use pointerdown so the input doesn't lose focus before we process the click
                e.preventDefault();
                handleSelect(suggestion);
              }}
            >
              {/* Map pin icon for each result */}
              <svg className="location-autocomplete__option-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>

              <div className="location-autocomplete__option-text">
                <span className="location-autocomplete__option-label">{suggestion.label}</span>
                {suggestion.description !== suggestion.label && (
                  <span className="location-autocomplete__option-description">{suggestion.description}</span>
                )}
              </div>
            </li>
          ))}

          {ATTRIBUTION[provider] && (
            <li className="location-autocomplete__attribution" role="presentation">
              {ATTRIBUTION[provider]}
            </li>
          )}
        </ul>
      )}

      {error && !isOpen && (
        <p className="location-autocomplete__message" role="alert">
          Could not load suggestions. Please try again.
        </p>
      )}
    </div>
  );
}
