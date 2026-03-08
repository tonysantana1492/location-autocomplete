import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LocationAutocomplete from '../LocationAutocomplete.jsx';

// ---------------------------------------------------------------------------
// Mock providers so we don't hit real network
// ---------------------------------------------------------------------------
vi.mock('../providers/google.js', () => ({
  getSuggestions: vi.fn(),
  getPlaceDetails: vi.fn(),
}));

vi.mock('../providers/nominatim.js', () => ({
  getSuggestions: vi.fn(),
  getPlaceDetails: vi.fn(),
}));

import * as googleProvider from '../providers/google.js';
import * as nominatimProvider from '../providers/nominatim.js';

const MOCK_SUGGESTIONS = [
  { id: 'place-1', label: 'New York', description: 'New York, NY, USA' },
  { id: 'place-2', label: 'New Orleans', description: 'New Orleans, LA, USA' },
];

const MOCK_DETAILS = {
  id: 'place-1',
  label: 'New York',
  description: 'New York, NY, USA',
  lat: 40.7128,
  lng: -74.006,
};

beforeEach(() => {
  googleProvider.getSuggestions.mockResolvedValue(MOCK_SUGGESTIONS);
  googleProvider.getPlaceDetails.mockResolvedValue(MOCK_DETAILS);
  nominatimProvider.getSuggestions.mockResolvedValue(MOCK_SUGGESTIONS);
  nominatimProvider.getPlaceDetails.mockResolvedValue(MOCK_DETAILS);
});

afterEach(() => {
  vi.clearAllMocks();
});

// Helper: render with debounce=0 to skip waiting
function renderComponent(props = {}) {
  return render(<LocationAutocomplete debounce={0} {...props} />);
}

// Helper: type into the input (fires change event)
function typeInto(input, value) {
  fireEvent.change(input, { target: { value } });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – rendering', () => {
  it('renders the input with the default placeholder', () => {
    renderComponent();
    expect(screen.getByRole('combobox')).toBeDefined();
    expect(screen.getByPlaceholderText('Search location…')).toBeDefined();
  });

  it('accepts a custom placeholder', () => {
    renderComponent({ placeholder: 'Type a place…' });
    expect(screen.getByPlaceholderText('Type a place…')).toBeDefined();
  });

  it('renders as disabled when disabled prop is true', () => {
    renderComponent({ disabled: true });
    expect(screen.getByRole('combobox').disabled).toBe(true);
  });

  it('does not show the dropdown initially', () => {
    renderComponent();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suggestion fetching
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – suggestion fetching', () => {
  it('fetches Google suggestions after typing', async () => {
    renderComponent({ provider: 'google', apiKey: 'test-key' });

    typeInto(screen.getByRole('combobox'), 'New');

    await waitFor(() => {
      expect(googleProvider.getSuggestions).toHaveBeenCalledWith('New', {
        apiKey: 'test-key',
        language: undefined,
      });
    });
  });

  it('uses the nominatim provider when specified', async () => {
    renderComponent({ provider: 'nominatim' });

    typeInto(screen.getByRole('combobox'), 'Par');

    await waitFor(() => {
      expect(nominatimProvider.getSuggestions).toHaveBeenCalledWith('Par', {
        apiKey: undefined,
        language: undefined,
      });
    });
  });

  it('shows suggestions in a listbox after fetching', async () => {
    renderComponent();

    typeInto(screen.getByRole('combobox'), 'New');
    await waitFor(() => screen.getByRole('listbox'));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(MOCK_SUGGESTIONS.length);
    expect(options[0].textContent).toContain('New York');
  });

  it('does not fetch when input is shorter than 2 characters', async () => {
    renderComponent();

    typeInto(screen.getByRole('combobox'), 'N');
    await Promise.resolve();

    expect(googleProvider.getSuggestions).not.toHaveBeenCalled();
  });

  it('clears suggestions and hides dropdown when input is cleared', async () => {
    renderComponent();

    const input = screen.getByRole('combobox');
    typeInto(input, 'New');
    await waitFor(() => screen.getByRole('listbox'));

    typeInto(input, '');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – selection', () => {
  it('calls onSelect with place details when an option is chosen', async () => {
    const onSelect = vi.fn();
    renderComponent({ onSelect });

    typeInto(screen.getByRole('combobox'), 'New');
    await waitFor(() => screen.getByRole('listbox'));

    const [firstOption] = screen.getAllByRole('option');
    fireEvent.pointerDown(firstOption);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(MOCK_DETAILS);
    });
  });

  it('sets the input value to the selected suggestion label', async () => {
    renderComponent();

    const input = screen.getByRole('combobox');
    typeInto(input, 'New');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.pointerDown(screen.getAllByRole('option')[0]);

    await waitFor(() => {
      expect(input.value).toBe('New York');
    });
  });

  it('hides the dropdown after a selection', async () => {
    renderComponent();

    typeInto(screen.getByRole('combobox'), 'New');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.pointerDown(screen.getAllByRole('option')[0]);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – keyboard navigation', () => {
  it('navigates options with ArrowDown / ArrowUp', async () => {
    renderComponent();

    const input = screen.getByRole('combobox');
    typeInto(input, 'New');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0].className).toContain('--active');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1].className).toContain('--active');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0].className).toContain('--active');
  });

  it('selects the active option on Enter', async () => {
    const onSelect = vi.fn();
    renderComponent({ onSelect });

    const input = screen.getByRole('combobox');
    typeInto(input, 'New');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(MOCK_DETAILS);
    });
  });

  it('closes the dropdown on Escape', async () => {
    renderComponent();

    const input = screen.getByRole('combobox');
    typeInto(input, 'New');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Clear button
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – clear button', () => {
  it('shows a clear button when the input has a value', () => {
    renderComponent();
    typeInto(screen.getByRole('combobox'), 'New');
    expect(screen.getByRole('button', { name: /clear/i })).toBeDefined();
  });

  it('clears the input and closes the dropdown when the clear button is clicked', async () => {
    renderComponent();

    const input = screen.getByRole('combobox');
    typeInto(input, 'New');
    await waitFor(() => screen.getByRole('listbox'));

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(input.value).toBe('');
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Controlled mode
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – controlled mode', () => {
  it('reflects the controlled value in the input', () => {
    render(<LocationAutocomplete value="London" onChange={() => {}} />);
    expect(screen.getByRole('combobox').value).toBe('London');
  });

  it('calls onChange when the user types', () => {
    const onChange = vi.fn();
    render(<LocationAutocomplete value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'P' } });
    expect(onChange).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe('LocationAutocomplete – error handling', () => {
  it('calls onError when a provider fetch fails', async () => {
    const error = new Error('Network error');
    googleProvider.getSuggestions.mockRejectedValueOnce(error);

    const onError = vi.fn();
    renderComponent({ onError });

    typeInto(screen.getByRole('combobox'), 'New');

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
