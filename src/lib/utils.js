/**
 * TabMate — Common Utility Helpers
 */

/**
 * Round a number to exactly two decimal places.
 */
export function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Adjusts rounding drift so the sum of a field across all people equals the target exactly.
 * Adds/subtracts 1 cent from the person with the largest share.
 */
export function fixRoundingDrift(people, field, target) {
  const sum = round2(people.reduce((s, p) => s + (p[field] || 0), 0));
  const diff = round2(target - sum);
  if (diff !== 0 && people.length > 0) {
    // Sort to find the person with the highest value in this field
    const sorted = [...people].sort((a, b) => (b[field] || 0) - (a[field] || 0));
    sorted[0][field] = round2((sorted[0][field] || 0) + diff);
  }
}

/**
 * Generates unique standard IDs with designated prefixes (e.g. c_ for contacts, s_ for splits).
 */
export function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generates deterministic pastel/warm hsl colors based on a hash of a name.
 * Uses the designated SplitTab warm tones style.
 */
const PERSON_COLORS = [
  "#4A6741", "#7B5E3A", "#3A5C78", "#7A4040", "#5C4A78",
  "#3A6B6B", "#6B5A3A", "#4A5878", "#6B3A5A", "#3A6B4A"
];

export function generateColor(name, index = 0) {
  if (!name) return PERSON_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash + index) % PERSON_COLORS.length;
  return PERSON_COLORS[colorIndex];
}

/**
 * Format standard currency amounts.
 */
export function formatCurrency(amount) {
  return `$${(amount || 0).toFixed(2)}`;
}

/**
 * Normalize phone numbers to E.164 +1XXXXXXXXXX.
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return phone; // Return as-is if unrecognized foreign format
}

/**
 * Get initials (up to 2 letters) of a name.
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/**
 * Input validation helpers.
 */
export function isValidVenmo(handle) {
  return typeof handle === 'string' && handle.trim().startsWith('@') && handle.trim().length >= 3;
}

export function isValidPhone(phone) {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}

export function getShortcutPayloadFromLocation() {
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  const search = queryIndex >= 0 ? hash.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const name = (params.get('name') || '').trim();
  const phone = (params.get('phone') || '').trim();

  if (source !== 'shortcut' || !name) {
    return null;
  }

  return { source, name, phone };
}
