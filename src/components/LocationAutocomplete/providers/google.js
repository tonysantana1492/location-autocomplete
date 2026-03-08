/**
 * Google Maps Places Autocomplete provider.
 *
 * Requires the Google Maps JavaScript API loaded with the `places` library.
 * Pass your API key when initialising the provider or load the script yourself
 * with the key baked in.
 */

const SCRIPT_ID = 'google-maps-script';

function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      // Script already appended – wait for it to finish loading
      const existing = document.getElementById(SCRIPT_ID);
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
}

let autocompleteService = null;
let placesService = null;

async function initServices(apiKey) {
  await loadGoogleMapsScript(apiKey);
  if (!autocompleteService) {
    autocompleteService = new window.google.maps.places.AutocompleteService();
  }
  if (!placesService) {
    // PlacesService needs a DOM element
    const el = document.createElement('div');
    placesService = new window.google.maps.places.PlacesService(el);
  }
}

/**
 * Fetch autocomplete predictions from Google Places.
 *
 * @param {string} input - The search string typed by the user.
 * @param {object} options
 * @param {string} options.apiKey - Google Maps API key.
 * @param {string} [options.language] - BCP-47 language code.
 * @returns {Promise<Array<{id, label, description, raw}>>}
 */
export async function getSuggestions(input, { apiKey, language } = {}) {
  if (!input || input.trim().length < 2) return [];

  await initServices(apiKey);

  return new Promise((resolve) => {
    autocompleteService.getPlacePredictions(
      {
        input,
        ...(language && { language }),
      },
      (predictions, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions
        ) {
          resolve([]);
          return;
        }

        resolve(
          predictions.map((p) => ({
            id: p.place_id,
            label: p.structured_formatting?.main_text ?? p.description,
            description: p.description,
            raw: p,
          })),
        );
      },
    );
  });
}

/**
 * Fetch full place details (coordinates, address components, etc.)
 *
 * @param {object} suggestion - A suggestion object returned by getSuggestions.
 * @param {object} options
 * @param {string} options.apiKey - Google Maps API key.
 * @returns {Promise<object>} - Raw Google PlaceResult.
 */
export async function getPlaceDetails(suggestion, { apiKey } = {}) {
  await initServices(apiKey);

  return new Promise((resolve, reject) => {
    placesService.getDetails(
      { placeId: suggestion.id, fields: ['geometry', 'address_components', 'formatted_address', 'name'] },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          reject(new Error(`Places getDetails failed: ${status}`));
          return;
        }
        resolve(place);
      },
    );
  });
}
