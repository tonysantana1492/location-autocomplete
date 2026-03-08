import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSuggestions, getPlaceDetails } from '../providers/nominatim.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const NOMINATIM_RESPONSE = [
  {
    place_id: 123,
    display_name: 'New York City, New York, United States',
    lat: '40.7128',
    lon: '-74.0060',
    address: {
      city: 'New York City',
      state: 'New York',
      country: 'United States',
    },
  },
  {
    place_id: 456,
    display_name: 'New Orleans, Louisiana, United States',
    lat: '29.9511',
    lon: '-90.0715',
    address: {
      city: 'New Orleans',
      state: 'Louisiana',
      country: 'United States',
    },
  },
];

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => NOMINATIM_RESPONSE,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('nominatim provider – getSuggestions', () => {
  it('returns an empty array for short queries', async () => {
    const result = await getSuggestions('N');
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns an empty array for empty input', async () => {
    const result = await getSuggestions('');
    expect(result).toEqual([]);
  });

  it('calls the Nominatim API with the correct query string', async () => {
    await getSuggestions('New York');
    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('q=New+York');
    expect(url).toContain('format=json');
  });

  it('maps the response to the expected shape', async () => {
    const suggestions = await getSuggestions('New York');
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({
      id: 123,
      label: expect.any(String),
      description: 'New York City, New York, United States',
    });
  });

  it('throws when the HTTP response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(getSuggestions('Paris')).rejects.toThrow('429');
  });
});

describe('nominatim provider – getPlaceDetails', () => {
  it('returns parsed lat/lng from the raw suggestion', async () => {
    const suggestion = {
      id: 123,
      label: 'New York City',
      description: 'New York City, New York, United States',
      raw: NOMINATIM_RESPONSE[0],
    };

    const details = await getPlaceDetails(suggestion);
    expect(details.lat).toBeCloseTo(40.7128);
    expect(details.lng).toBeCloseTo(-74.006);
    expect(details.address).toEqual(NOMINATIM_RESPONSE[0].address);
  });
});
