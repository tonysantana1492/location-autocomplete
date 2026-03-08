import { useState } from 'react';
import './App.css';
import LocationAutocomplete from './components/LocationAutocomplete';

const PROVIDERS = [
  { id: 'google', label: '🗺 Google Maps' },
  { id: 'nominatim', label: '🌍 OpenStreetMap' },
];

export default function App() {
  const [provider, setProvider] = useState('google');
  const [apiKey, setApiKey] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);

  const handleSelect = (place) => {
    setSelectedPlace(place);
  };

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__logo" aria-hidden="true">📍</span>
        <h1 className="app__title">Location Autocomplete</h1>
        <p className="app__subtitle">Google Maps style, multiple providers</p>
      </header>

      <div className="app__card">
        {/* Provider selector */}
        <div className="app__provider-tabs" role="tablist" aria-label="Select provider">
          {PROVIDERS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={provider === id}
              className={`app__provider-tab${provider === id ? ' app__provider-tab--active' : ''}`}
              onClick={() => {
                setProvider(id);
                setSelectedPlace(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* API key input (only needed for Google) */}
        {provider === 'google' && (
          <div className="app__api-key-row">
            <label htmlFor="api-key-input">Google Maps API Key</label>
            <input
              id="api-key-input"
              type="password"
              className="app__api-key-input"
              placeholder="AIza…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}

        {/* Autocomplete input */}
        <label className="app__search-label" htmlFor="location-input">
          Search for a location
        </label>
        <LocationAutocomplete
          id="location-input"
          provider={provider}
          apiKey={apiKey}
          placeholder="Enter a city, address or place…"
          onSelect={handleSelect}
          onError={(err) => console.error('LocationAutocomplete error:', err)}
        />

        {/* Selected place result */}
        {selectedPlace && (
          <div className="app__result">
            <h3>Selected place</h3>
            <pre>{JSON.stringify(selectedPlace, null, 2)}</pre>
          </div>
        )}
      </div>

      <footer className="app__footer">
        <p>Switch between providers using the tabs above.</p>
        <p>OpenStreetMap provider requires no API key.</p>
      </footer>
    </div>
  );
}
