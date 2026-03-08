/**
 * OpenStreetMap Nominatim autocomplete provider.
 *
 * Free to use, no API key required.
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */

const BASE_URL = 'https://nominatim.openstreetmap.org/search';

/**
 * Fetch autocomplete suggestions from Nominatim.
 *
 * @param {string} input - The search string typed by the user.
 * @param {object} [options]
 * @param {string} [options.language] - Accept-Language header value.
 * @param {number} [options.limit=5] - Maximum number of results to return.
 * @returns {Promise<Array<{id, label, description, raw}>>}
 */
export async function getSuggestions(input, { language, limit = 5 } = {}) {
  if (!input || input.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: input,
    format: 'json',
    addressdetails: '1',
    limit: String(limit),
  });

  const headers = { 'Accept-Language': language ?? navigator.language ?? 'en' };

  const response = await fetch(`${BASE_URL}?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`);
  }

  const data = await response.json();

  return data.map((item) => {
    const city =
      item.address?.city ??
      item.address?.town ??
      item.address?.village ??
      item.address?.county ??
      '';
    const country = item.address?.country ?? '';
    const state = item.address?.state ?? '';

    const parts = [item.display_name.split(',')[0].trim(), city, state, country]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    return {
      id: item.place_id,
      label: parts[0] ?? item.display_name,
      description: item.display_name,
      raw: item,
    };
  });
}

/**
 * Return place details for a Nominatim suggestion.
 * Since the full data is already included in the search response, this just
 * wraps the raw object to a consistent shape.
 *
 * @param {object} suggestion - A suggestion object returned by getSuggestions.
 * @returns {Promise<object>}
 */
export async function getPlaceDetails(suggestion) {
  const raw = suggestion.raw;
  return {
    id: suggestion.id,
    label: suggestion.label,
    description: suggestion.description,
    lat: parseFloat(raw.lat),
    lng: parseFloat(raw.lon),
    address: raw.address,
    raw,
  };
}
