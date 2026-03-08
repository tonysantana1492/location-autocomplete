# location-autocomplete

A Google Maps–style location autocomplete component for React, built with a pluggable provider system. **Google Maps Places API is the default provider**, with [OpenStreetMap/Nominatim](https://nominatim.org/) included as a free, no-key-required alternative.

## Demo

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Features

- 🗺 **Google Maps Places API** provider (default)
- 🌍 **OpenStreetMap / Nominatim** provider – no API key required
- ⌨️ Full keyboard navigation (↑ ↓ Enter Escape)
- ♿ Accessible – ARIA combobox / listbox pattern
- 🎨 Google Maps–inspired design
- ⚡ Debounced input – no request spamming
- 🔧 Controlled & uncontrolled modes
- �� Easily extensible with custom providers

## Usage

```jsx
import LocationAutocomplete from './src/components/LocationAutocomplete';

// Google Maps (default) – requires an API key
<LocationAutocomplete
  provider="google"
  apiKey="YOUR_GOOGLE_MAPS_API_KEY"
  onSelect={(place) => console.log(place)}
/>

// OpenStreetMap – no API key needed
<LocationAutocomplete
  provider="nominatim"
  onSelect={(place) => console.log(place)}
/>
```

## Props

| Prop          | Type       | Default              | Description                                              |
|---------------|------------|----------------------|----------------------------------------------------------|
| `provider`    | `string`   | `'google'`           | `'google'` or `'nominatim'`                             |
| `apiKey`      | `string`   | –                    | Google Maps API key (required for `'google'` provider)   |
| `placeholder` | `string`   | `'Search location…'` | Input placeholder text                                   |
| `language`    | `string`   | browser default      | BCP-47 language tag for suggestions                      |
| `debounce`    | `number`   | `300`                | Debounce delay in milliseconds                           |
| `onSelect`    | `function` | –                    | Called with full place details when a suggestion is picked |
| `onError`     | `function` | –                    | Called with an `Error` when a provider fetch fails       |
| `value`       | `string`   | –                    | Controlled input value                                   |
| `onChange`    | `function` | –                    | Called when the input value changes (controlled mode)    |
| `id`          | `string`   | auto-generated       | `id` for the `<input>` element                          |
| `name`        | `string`   | –                    | `name` for the `<input>` element                        |
| `disabled`    | `boolean`  | `false`              | Disable the component                                    |
| `className`   | `string`   | –                    | Extra CSS class on the root element                      |

## Providers

### Google Maps Places API

Requires a Google Maps JavaScript API key with the **Places** library enabled.
[Get an API key →](https://developers.google.com/maps/documentation/javascript/get-api-key)

The script is loaded lazily the first time the component is mounted.

### OpenStreetMap / Nominatim

Uses the public [Nominatim](https://nominatim.openstreetmap.org/) endpoint.  
No API key required. Please respect the [usage policy](https://operations.osmfoundation.org/policies/nominatim/).

### Adding a Custom Provider

Create a module that exports two async functions:

```js
// src/components/LocationAutocomplete/providers/myProvider.js

export async function getSuggestions(input, options) {
  // Return an array of: { id, label, description, raw }
}

export async function getPlaceDetails(suggestion, options) {
  // Return whatever place details you need
}
```

Then register it in `LocationAutocomplete.jsx`:

```jsx
import * as myProvider from './providers/myProvider.js';

const PROVIDERS = {
  google: googleProvider,
  nominatim: nominatimProvider,
  myProvider,          // ← add here
};
```

## Scripts

| Command           | Description                       |
|-------------------|-----------------------------------|
| `npm run dev`     | Start development server          |
| `npm run build`   | Production build                  |
| `npm run preview` | Preview production build          |
| `npm run lint`    | Run ESLint                        |
| `npm test`        | Run Vitest test suite             |
| `npm run test:watch` | Watch mode for tests           |
