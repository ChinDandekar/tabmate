#!/usr/bin/env node

/**
 * TabMate — Logic Layer Tests
 * 
 * Tests the non-UI "backend" of the app:
 *   1. Data Store (localStorage CRUD for settings, contacts, splits)
 *   2. Bill Splitting Math (proportional & even tip/tax distribution)
 *   3. SMS Message Generation (iMessage pre-fill with URL encoding)
 *   4. OCR Text Parsing (receipt line-item extraction)
 *   5. Utility Functions (UUID, formatting, validation)
 *
 * Run:  node tests/test-logic.mjs
 * Deps: None (uses built-in Node.js assert)
 */

import assert from 'node:assert/strict';

// ============================================================================
// Minimal test runner (no dependencies)
// ============================================================================

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function describe(suiteName, fn) {
  console.log(`\n\x1b[1m\x1b[36m▸ ${suiteName}\x1b[0m`);
  fn();
}

function it(testName, fn) {
  try {
    fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
  } catch (err) {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${testName}`);
    console.log(`    \x1b[31m${err.message}\x1b[0m`);
    failures.push({ suite: '', test: testName, error: err.message });
  }
}

function skip(testName) {
  skipped++;
  console.log(`  \x1b[33m○\x1b[0m ${testName} (skipped)`);
}

// ============================================================================
// 1. localStorage Mock
// ============================================================================

class MockLocalStorage {
  constructor() {
    this._data = {};
  }
  getItem(key) {
    return this._data[key] ?? null;
  }
  setItem(key, value) {
    this._data[key] = String(value);
  }
  removeItem(key) {
    delete this._data[key];
  }
  clear() {
    this._data = {};
  }
  get length() {
    return Object.keys(this._data).length;
  }
  key(index) {
    return Object.keys(this._data)[index] ?? null;
  }
}

// ============================================================================
// 2. Data Store (mirrors planned store.js API)
// ============================================================================

function createStore(storage) {
  const KEYS = {
    settings: 'tabmate_settings',
    contacts: 'tabmate_contacts',
    splits: 'tabmate_splits',
  };

  function _read(key) {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  function _write(key, data) {
    storage.setItem(key, JSON.stringify(data));
  }

  return {
    // -- Settings --
    getSettings() {
      return _read(KEYS.settings) || { venmo: '', zelle: '', name: '' };
    },
    saveSettings(obj) {
      _write(KEYS.settings, obj);
    },

    // -- Contacts --
    getContacts() {
      return _read(KEYS.contacts) || [];
    },
    saveContact(contact) {
      const contacts = this.getContacts();
      const idx = contacts.findIndex((c) => c.id === contact.id);
      if (idx >= 0) {
        contacts[idx] = { ...contacts[idx], ...contact };
      } else {
        contacts.push({
          id: contact.id || `c_${Date.now()}`,
          name: contact.name,
          phone: contact.phone,
          splitCount: contact.splitCount || 0,
          color: contact.color || generateColor(contact.name),
        });
      }
      _write(KEYS.contacts, contacts);
      return contacts;
    },
    deleteContact(id) {
      const contacts = this.getContacts().filter((c) => c.id !== id);
      _write(KEYS.contacts, contacts);
      return contacts;
    },
    bumpContactSplitCount(id) {
      const contacts = this.getContacts();
      const contact = contacts.find((c) => c.id === id);
      if (contact) {
        contact.splitCount = (contact.splitCount || 0) + 1;
        _write(KEYS.contacts, contacts);
      }
      return contact;
    },
    getContactsSortedByFrequency() {
      return this.getContacts().sort((a, b) => (b.splitCount || 0) - (a.splitCount || 0));
    },

    // -- Splits --
    getSplits() {
      return _read(KEYS.splits) || [];
    },
    saveSplit(split) {
      const splits = this.getSplits();
      split.id = split.id || `s_${Date.now()}`;
      splits.unshift(split); // newest first
      _write(KEYS.splits, splits);
      return split;
    },
    getSplitById(id) {
      return this.getSplits().find((s) => s.id === id) || null;
    },
    markPaid(splitId, contactId) {
      const splits = this.getSplits();
      const split = splits.find((s) => s.id === splitId);
      if (!split) return null;
      if (!split.paid) split.paid = [];
      const idx = split.paid.indexOf(contactId);
      if (idx >= 0) {
        split.paid.splice(idx, 1); // toggle off
      } else {
        split.paid.push(contactId); // toggle on
      }
      _write(KEYS.splits, splits);
      return split;
    },
    deleteSplit(id) {
      const splits = this.getSplits().filter((s) => s.id !== id);
      _write(KEYS.splits, splits);
      return splits;
    },
  };
}

// ============================================================================
// 3. Bill Splitting Math (mirrors planned calculation engine)
// ============================================================================

/**
 * Calculate each person's share of items, tax, and tip.
 *
 * @param {Object} params
 * @param {Array}  params.items       - [{ name, price, assignedTo: [contactId, ...] }]
 * @param {Array}  params.people      - [{ contactId, name, phone }]
 * @param {number} params.taxAmount   - Total tax in dollars
 * @param {number} params.tipAmount   - Total tip in dollars
 * @param {'proportional'|'even'} params.tipSplitMethod
 * @returns {Array} [{ contactId, name, phone, itemSubtotal, taxShare, tipShare, total, items }]
 */
function calculateSplit({ items, people, taxAmount, tipAmount, tipSplitMethod = 'proportional' }) {
  const personTotals = {};

  // Initialize
  for (const person of people) {
    personTotals[person.contactId] = {
      contactId: person.contactId,
      name: person.name,
      phone: person.phone,
      itemSubtotal: 0,
      items: [],
      taxShare: 0,
      tipShare: 0,
      total: 0,
    };
  }

  // Distribute item costs
  for (const item of items) {
    if (!item.assignedTo || item.assignedTo.length === 0) continue;
    const sharePerPerson = item.price / item.assignedTo.length;
    for (const cid of item.assignedTo) {
      if (!personTotals[cid]) continue;
      personTotals[cid].itemSubtotal += sharePerPerson;
      personTotals[cid].items.push({
        name: item.name,
        price: item.price,
        sharedWith: item.assignedTo.length,
        yourShare: sharePerPerson,
      });
    }
  }

  // Round item subtotals
  for (const cid of Object.keys(personTotals)) {
    personTotals[cid].itemSubtotal = round2(personTotals[cid].itemSubtotal);
  }

  // Fix rounding drift on item subtotals so they sum to the actual total of assigned items
  const expectedItemTotal = round2(
    items.reduce((sum, item) => {
      if (item.assignedTo && item.assignedTo.length > 0) return sum + item.price;
      return sum;
    }, 0)
  );
  fixRoundingDrift(Object.values(personTotals), 'itemSubtotal', expectedItemTotal);

  const grandItemSubtotal = Object.values(personTotals).reduce((s, p) => s + p.itemSubtotal, 0);

  // Distribute tax (always proportional to item subtotal)
  if (grandItemSubtotal > 0 && taxAmount > 0) {
    for (const cid of Object.keys(personTotals)) {
      const proportion = personTotals[cid].itemSubtotal / grandItemSubtotal;
      personTotals[cid].taxShare = round2(taxAmount * proportion);
    }
    // Fix rounding drift on tax
    fixRoundingDrift(Object.values(personTotals), 'taxShare', taxAmount);
  }

  // Distribute tip
  if (tipAmount > 0) {
    if (tipSplitMethod === 'even') {
      const evenTip = round2(tipAmount / people.length);
      for (const cid of Object.keys(personTotals)) {
        personTotals[cid].tipShare = evenTip;
      }
      fixRoundingDrift(Object.values(personTotals), 'tipShare', tipAmount);
    } else {
      // proportional
      if (grandItemSubtotal > 0) {
        for (const cid of Object.keys(personTotals)) {
          const proportion = personTotals[cid].itemSubtotal / grandItemSubtotal;
          personTotals[cid].tipShare = round2(tipAmount * proportion);
        }
        fixRoundingDrift(Object.values(personTotals), 'tipShare', tipAmount);
      }
    }
  }

  // Final totals
  for (const cid of Object.keys(personTotals)) {
    const p = personTotals[cid];
    p.total = round2(p.itemSubtotal + p.taxShare + p.tipShare);
  }

  return Object.values(personTotals);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Adjusts rounding drift so the sum of a field across all people equals the target exactly.
 * Adds/subtracts 1 cent from the person with the largest share.
 */
function fixRoundingDrift(people, field, target) {
  const sum = round2(people.reduce((s, p) => s + p[field], 0));
  const diff = round2(target - sum);
  if (diff !== 0) {
    // Adjust the person with the largest share
    const sorted = [...people].sort((a, b) => b[field] - a[field]);
    sorted[0][field] = round2(sorted[0][field] + diff);
  }
}

// ============================================================================
// 4. SMS Message Generation
// ============================================================================

/**
 * Generate the iMessage pre-fill URL for a single person.
 */
function generateSmsUrl(person, restaurant, settings) {
  const body = generateMessageBody(person, restaurant, settings);
  const encoded = encodeURIComponent(body);
  // iOS uses & between phone and body, not ?
  return `sms:${person.phone}&body=${encoded}`;
}

function generateMessageBody(person, restaurant, settings) {
  let msg = `Hey ${person.name}! From ${restaurant} 🍽️\n`;
  for (const item of person.items) {
    if (item.sharedWith > 1) {
      msg += `${item.name} (split ${item.sharedWith} ways) – $${item.yourShare.toFixed(2)}\n`;
    } else {
      msg += `${item.name} – $${item.yourShare.toFixed(2)}\n`;
    }
  }
  msg += `Your share: $${person.itemSubtotal.toFixed(2)}`;
  if (person.tipShare > 0) msg += ` + $${person.tipShare.toFixed(2)} tip`;
  if (person.taxShare > 0) msg += ` + $${person.taxShare.toFixed(2)} tax`;
  msg += ` = $${person.total.toFixed(2)}\n`;
  msg += '\n';
  if (settings.venmo) msg += `Venmo: ${settings.venmo}\n`;
  if (settings.zelle) msg += `Zelle: ${settings.zelle}\n`;
  msg += '\nThanks! 🙏';
  return msg;
}

// ============================================================================
// 5. OCR Text Parsing
// ============================================================================

/**
 * Parse raw OCR text into structured receipt data.
 * Handles common receipt formats with item name + price on same line.
 */
function parseReceiptText(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];
  let tax = null;
  let tip = null;
  let subtotal = null;
  let total = null;

  const priceRegex = /\$?\s*(\d+\.\d{2})\s*$/;
  const taxKeywords = /^(tax|sales\s*tax|hst|gst|vat)\b/i;
  const tipKeywords = /^(tip|gratuity|service\s*charge)\b/i;
  const subtotalKeywords = /^(subtotal|sub\s*total|sub-total)\b/i;
  const totalKeywords = /^(total|amount\s*due|balance\s*due|grand\s*total)\b/i;
  const skipKeywords = /^(thank|card|visa|master|amex|debit|credit|change|cash|date|time|order|table|server|guest|check|receipt)/i;

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    const name = line.replace(priceRegex, '').replace(/[.\-_]+$/, '').trim();

    if (!name || price === 0) continue;

    if (taxKeywords.test(name)) {
      tax = price;
    } else if (tipKeywords.test(name)) {
      tip = price;
    } else if (subtotalKeywords.test(name)) {
      subtotal = price;
    } else if (totalKeywords.test(name)) {
      total = price;
    } else if (!skipKeywords.test(name)) {
      items.push({ name, price });
    }
  }

  return { items, tax, tip, subtotal, total };
}

// ============================================================================
// 6. Utility Functions
// ============================================================================

function generateId(prefix = '') {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateColor(name) {
  // Deterministic color from name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function formatPhone(phone) {
  // Normalize to +1XXXXXXXXXX
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`;
  return phone; // return as-is if unrecognized
}

function isValidVenmo(handle) {
  return typeof handle === 'string' && handle.startsWith('@') && handle.length >= 3;
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
}


// ============================================================================
// ============================================================================
//                              TEST SUITES
// ============================================================================
// ============================================================================

console.log('\x1b[1m\x1b[35m');
console.log('╔══════════════════════════════════════════╗');
console.log('║       TabMate — Logic Layer Tests        ║');
console.log('╚══════════════════════════════════════════╝');
console.log('\x1b[0m');


// --------------------------------------------------------------------------
// Store Tests
// --------------------------------------------------------------------------

describe('Store — Settings', () => {
  const storage = new MockLocalStorage();
  const store = createStore(storage);

  it('returns defaults when no settings saved', () => {
    const s = store.getSettings();
    assert.deepEqual(s, { venmo: '', zelle: '', name: '' });
  });

  it('saves and retrieves settings', () => {
    store.saveSettings({ venmo: '@testuser', zelle: '415-555-0101', name: 'Test' });
    const s = store.getSettings();
    assert.equal(s.venmo, '@testuser');
    assert.equal(s.zelle, '415-555-0101');
    assert.equal(s.name, 'Test');
  });

  it('overwrites previous settings', () => {
    store.saveSettings({ venmo: '@newhandle', zelle: '555-000-1234', name: 'New Name' });
    const s = store.getSettings();
    assert.equal(s.venmo, '@newhandle');
  });
});

describe('Store — Contacts', () => {
  const storage = new MockLocalStorage();
  const store = createStore(storage);

  it('returns empty array when no contacts', () => {
    assert.deepEqual(store.getContacts(), []);
  });

  it('adds a new contact', () => {
    store.saveContact({ id: 'c_1', name: 'Sarah', phone: '+14155550101' });
    const contacts = store.getContacts();
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].name, 'Sarah');
    assert.equal(contacts[0].splitCount, 0);
    assert.ok(contacts[0].color); // should have auto-generated color
  });

  it('updates an existing contact by id', () => {
    store.saveContact({ id: 'c_1', name: 'Sarah K.', phone: '+14155550101' });
    const contacts = store.getContacts();
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].name, 'Sarah K.');
  });

  it('adds multiple contacts', () => {
    store.saveContact({ id: 'c_2', name: 'Mike', phone: '+14155550202' });
    store.saveContact({ id: 'c_3', name: 'Jess', phone: '+14155550303' });
    assert.equal(store.getContacts().length, 3);
  });

  it('deletes a contact', () => {
    store.deleteContact('c_2');
    const contacts = store.getContacts();
    assert.equal(contacts.length, 2);
    assert.ok(!contacts.find((c) => c.id === 'c_2'));
  });

  it('bumps split count', () => {
    store.bumpContactSplitCount('c_1');
    store.bumpContactSplitCount('c_1');
    store.bumpContactSplitCount('c_1');
    const contact = store.getContacts().find((c) => c.id === 'c_1');
    assert.equal(contact.splitCount, 3);
  });

  it('sorts contacts by frequency (frequent crew)', () => {
    store.bumpContactSplitCount('c_3'); // Jess: 1
    // Sarah: 3, Jess: 1
    const sorted = store.getContactsSortedByFrequency();
    assert.equal(sorted[0].name, 'Sarah K.');
    assert.equal(sorted[1].name, 'Jess');
  });

  it('handles bumping non-existent contact gracefully', () => {
    const result = store.bumpContactSplitCount('c_nonexistent');
    assert.equal(result, undefined);
  });
});

describe('Store — Splits', () => {
  const storage = new MockLocalStorage();
  const store = createStore(storage);

  it('returns empty array when no splits', () => {
    assert.deepEqual(store.getSplits(), []);
  });

  it('saves a split and retrieves it', () => {
    const split = store.saveSplit({
      id: 's_1',
      date: '2026-05-26',
      restaurant: 'Nobu',
      total: 187.5,
      people: [{ contactId: 'c_1', name: 'Sarah' }],
      paid: [],
    });
    assert.equal(split.id, 's_1');
    assert.equal(store.getSplits().length, 1);
  });

  it('retrieves split by id', () => {
    const split = store.getSplitById('s_1');
    assert.ok(split);
    assert.equal(split.restaurant, 'Nobu');
  });

  it('returns null for non-existent split id', () => {
    assert.equal(store.getSplitById('s_nonexistent'), null);
  });

  it('newest splits appear first', () => {
    store.saveSplit({ id: 's_2', date: '2026-05-27', restaurant: 'Sushi Gen', total: 95.0 });
    const splits = store.getSplits();
    assert.equal(splits[0].id, 's_2');
    assert.equal(splits[1].id, 's_1');
  });

  it('toggles paid status on', () => {
    const split = store.markPaid('s_1', 'c_1');
    assert.ok(split.paid.includes('c_1'));
  });

  it('toggles paid status off', () => {
    const split = store.markPaid('s_1', 'c_1');
    assert.ok(!split.paid.includes('c_1'));
  });

  it('deletes a split', () => {
    store.deleteSplit('s_2');
    assert.equal(store.getSplits().length, 1);
    assert.equal(store.getSplitById('s_2'), null);
  });
});


// --------------------------------------------------------------------------
// Bill Splitting Math Tests
// --------------------------------------------------------------------------

describe('Bill Splitting — Basic Scenarios', () => {
  it('splits a simple 2-person bill evenly', () => {
    const result = calculateSplit({
      items: [
        { name: 'Pizza', price: 20.0, assignedTo: ['c_1'] },
        { name: 'Pasta', price: 18.0, assignedTo: ['c_2'] },
      ],
      people: [
        { contactId: 'c_1', name: 'Sarah', phone: '+14155550101' },
        { contactId: 'c_2', name: 'Mike', phone: '+14155550202' },
      ],
      taxAmount: 3.80,
      tipAmount: 7.60,
      tipSplitMethod: 'proportional',
    });

    const sarah = result.find((p) => p.contactId === 'c_1');
    const mike = result.find((p) => p.contactId === 'c_2');

    assert.equal(sarah.itemSubtotal, 20.0);
    assert.equal(mike.itemSubtotal, 18.0);

    // Proportional tax: Sarah 20/38 * 3.80 = 2.00, Mike 18/38 * 3.80 = 1.80
    assert.equal(sarah.taxShare, 2.0);
    assert.equal(mike.taxShare, 1.8);

    // Proportional tip: Sarah 20/38 * 7.60 = 4.00, Mike 18/38 * 7.60 = 3.60
    assert.equal(sarah.tipShare, 4.0);
    assert.equal(mike.tipShare, 3.6);

    assert.equal(sarah.total, 26.0);
    assert.equal(mike.total, 23.4);
  });

  it('splits with even tip method', () => {
    const result = calculateSplit({
      items: [
        { name: 'Steak', price: 50.0, assignedTo: ['c_1'] },
        { name: 'Salad', price: 12.0, assignedTo: ['c_2'] },
      ],
      people: [
        { contactId: 'c_1', name: 'Sarah', phone: '+1' },
        { contactId: 'c_2', name: 'Mike', phone: '+1' },
      ],
      taxAmount: 5.0,
      tipAmount: 10.0,
      tipSplitMethod: 'even',
    });

    const sarah = result.find((p) => p.contactId === 'c_1');
    const mike = result.find((p) => p.contactId === 'c_2');

    // Even tip: 10 / 2 = 5 each
    assert.equal(sarah.tipShare, 5.0);
    assert.equal(mike.tipShare, 5.0);
  });
});

describe('Bill Splitting — Shared Items', () => {
  it('splits a shared item equally among assigned people', () => {
    const result = calculateSplit({
      items: [
        { name: 'Appetizer Platter', price: 30.0, assignedTo: ['c_1', 'c_2', 'c_3'] },
      ],
      people: [
        { contactId: 'c_1', name: 'A', phone: '+1' },
        { contactId: 'c_2', name: 'B', phone: '+1' },
        { contactId: 'c_3', name: 'C', phone: '+1' },
      ],
      taxAmount: 0,
      tipAmount: 0,
    });

    assert.equal(result[0].itemSubtotal, 10.0);
    assert.equal(result[1].itemSubtotal, 10.0);
    assert.equal(result[2].itemSubtotal, 10.0);
  });

  it('handles mix of shared and individual items', () => {
    const result = calculateSplit({
      items: [
        { name: 'Shared Nachos', price: 15.0, assignedTo: ['c_1', 'c_2'] },
        { name: 'Burger', price: 18.0, assignedTo: ['c_1'] },
        { name: 'Fish Tacos', price: 16.0, assignedTo: ['c_2'] },
      ],
      people: [
        { contactId: 'c_1', name: 'A', phone: '+1' },
        { contactId: 'c_2', name: 'B', phone: '+1' },
      ],
      taxAmount: 0,
      tipAmount: 0,
    });

    // A: 7.50 (nachos) + 18 (burger) = 25.50
    // B: 7.50 (nachos) + 16 (tacos) = 23.50
    assert.equal(result[0].itemSubtotal, 25.5);
    assert.equal(result[1].itemSubtotal, 23.5);
  });
});

describe('Bill Splitting — Edge Cases', () => {
  it('handles single person (full bill)', () => {
    const result = calculateSplit({
      items: [
        { name: 'Ramen', price: 15.0, assignedTo: ['c_1'] },
        { name: 'Gyoza', price: 8.0, assignedTo: ['c_1'] },
      ],
      people: [{ contactId: 'c_1', name: 'Solo', phone: '+1' }],
      taxAmount: 2.3,
      tipAmount: 4.6,
      tipSplitMethod: 'proportional',
    });

    assert.equal(result[0].itemSubtotal, 23.0);
    assert.equal(result[0].taxShare, 2.3);
    assert.equal(result[0].tipShare, 4.6);
    assert.equal(result[0].total, 29.9);
  });

  it('handles zero tip', () => {
    const result = calculateSplit({
      items: [{ name: 'Coffee', price: 5.0, assignedTo: ['c_1'] }],
      people: [{ contactId: 'c_1', name: 'X', phone: '+1' }],
      taxAmount: 0.5,
      tipAmount: 0,
    });

    assert.equal(result[0].tipShare, 0);
    assert.equal(result[0].total, 5.5);
  });

  it('handles zero tax', () => {
    const result = calculateSplit({
      items: [{ name: 'Coffee', price: 5.0, assignedTo: ['c_1'] }],
      people: [{ contactId: 'c_1', name: 'X', phone: '+1' }],
      taxAmount: 0,
      tipAmount: 1.0,
    });

    assert.equal(result[0].taxShare, 0);
    assert.equal(result[0].total, 6.0);
  });

  it('handles unassigned items (ignored in totals)', () => {
    const result = calculateSplit({
      items: [
        { name: 'Assigned', price: 20.0, assignedTo: ['c_1'] },
        { name: 'Not assigned', price: 10.0, assignedTo: [] },
      ],
      people: [{ contactId: 'c_1', name: 'X', phone: '+1' }],
      taxAmount: 0,
      tipAmount: 0,
    });

    assert.equal(result[0].itemSubtotal, 20.0);
  });

  it('sum of all shares equals total bill', () => {
    const result = calculateSplit({
      items: [
        { name: 'A', price: 33.33, assignedTo: ['c_1', 'c_2', 'c_3'] },
        { name: 'B', price: 17.50, assignedTo: ['c_1'] },
        { name: 'C', price: 22.99, assignedTo: ['c_2', 'c_3'] },
      ],
      people: [
        { contactId: 'c_1', name: 'X', phone: '+1' },
        { contactId: 'c_2', name: 'Y', phone: '+1' },
        { contactId: 'c_3', name: 'Z', phone: '+1' },
      ],
      taxAmount: 7.33,
      tipAmount: 14.77,
      tipSplitMethod: 'proportional',
    });

    const sumTotals = round2(result.reduce((s, p) => s + p.total, 0));
    const expectedTotal = round2(33.33 + 17.5 + 22.99 + 7.33 + 14.77);
    assert.equal(sumTotals, expectedTotal);
  });

  it('rounding is correct for 3-way split of indivisible amount', () => {
    const result = calculateSplit({
      items: [{ name: 'Item', price: 10.0, assignedTo: ['c_1', 'c_2', 'c_3'] }],
      people: [
        { contactId: 'c_1', name: 'A', phone: '+1' },
        { contactId: 'c_2', name: 'B', phone: '+1' },
        { contactId: 'c_3', name: 'C', phone: '+1' },
      ],
      taxAmount: 1.0,
      tipAmount: 1.0,
      tipSplitMethod: 'even',
    });

    // 10/3 = 3.33 each, but sum = 9.99, drift fix → one person gets 3.34
    const sumItems = round2(result.reduce((s, p) => s + p.itemSubtotal, 0));
    const sumTax = round2(result.reduce((s, p) => s + p.taxShare, 0));
    const sumTip = round2(result.reduce((s, p) => s + p.tipShare, 0));

    assert.equal(sumItems, 10.0);
    assert.equal(sumTax, 1.0);
    assert.equal(sumTip, 1.0);
  });
});


// --------------------------------------------------------------------------
// SMS Message Generation Tests
// --------------------------------------------------------------------------

describe('SMS Message Generation', () => {
  const settings = { venmo: '@myhandle', zelle: '415-555-9999', name: 'Me' };

  it('generates correct message body', () => {
    const person = {
      contactId: 'c_1',
      name: 'Sarah',
      phone: '+14155550101',
      itemSubtotal: 36.0,
      taxShare: 3.1,
      tipShare: 4.5,
      total: 43.6,
      items: [
        { name: 'Salmon Sashimi', price: 22.0, sharedWith: 1, yourShare: 22.0 },
        { name: 'House Sake', price: 14.0, sharedWith: 1, yourShare: 14.0 },
      ],
    };

    const body = generateMessageBody(person, 'Nobu', settings);
    assert.ok(body.includes('Hey Sarah!'));
    assert.ok(body.includes('Nobu'));
    assert.ok(body.includes('Salmon Sashimi'));
    assert.ok(body.includes('$22.00'));
    assert.ok(body.includes('House Sake'));
    assert.ok(body.includes('$14.00'));
    assert.ok(body.includes('$43.60'));
    assert.ok(body.includes('@myhandle'));
    assert.ok(body.includes('415-555-9999'));
    assert.ok(body.includes('🍽️'));
    assert.ok(body.includes('🙏'));
  });

  it('shows shared item annotation', () => {
    const person = {
      contactId: 'c_1',
      name: 'Mike',
      phone: '+1',
      itemSubtotal: 10.0,
      taxShare: 0,
      tipShare: 0,
      total: 10.0,
      items: [
        { name: 'Nachos', price: 30.0, sharedWith: 3, yourShare: 10.0 },
      ],
    };

    const body = generateMessageBody(person, 'Bar', settings);
    assert.ok(body.includes('split 3 ways'));
    assert.ok(body.includes('$10.00'));
  });

  it('generates valid sms: URL', () => {
    const person = {
      contactId: 'c_1',
      name: 'A',
      phone: '+14155550101',
      itemSubtotal: 10.0,
      taxShare: 0,
      tipShare: 0,
      total: 10.0,
      items: [{ name: 'X', price: 10.0, sharedWith: 1, yourShare: 10.0 }],
    };

    const url = generateSmsUrl(person, 'Place', settings);
    assert.ok(url.startsWith('sms:+14155550101&body='));
    assert.ok(url.includes(encodeURIComponent('Hey A!')));
  });

  it('omits venmo/zelle if not set', () => {
    const person = {
      contactId: 'c_1',
      name: 'A',
      phone: '+1',
      itemSubtotal: 5.0,
      taxShare: 0,
      tipShare: 0,
      total: 5.0,
      items: [{ name: 'X', price: 5.0, sharedWith: 1, yourShare: 5.0 }],
    };

    const body = generateMessageBody(person, 'Place', { venmo: '', zelle: '', name: '' });
    assert.ok(!body.includes('Venmo:'));
    assert.ok(!body.includes('Zelle:'));
  });

  it('omits tip/tax from message line if zero', () => {
    const person = {
      contactId: 'c_1',
      name: 'A',
      phone: '+1',
      itemSubtotal: 15.0,
      taxShare: 0,
      tipShare: 0,
      total: 15.0,
      items: [{ name: 'Salad', price: 15.0, sharedWith: 1, yourShare: 15.0 }],
    };

    const body = generateMessageBody(person, 'Café', settings);
    assert.ok(!body.includes('tip'));
    assert.ok(!body.includes('tax'));
    assert.ok(body.includes('$15.00'));
  });
});


// --------------------------------------------------------------------------
// OCR Parsing Tests
// --------------------------------------------------------------------------

describe('OCR Text Parsing — Standard Receipts', () => {
  it('parses basic receipt with items and prices', () => {
    const text = `
      Chicken Teriyaki    $14.50
      Miso Soup           $3.25
      Green Tea           $2.00
      Subtotal            $19.75
      Tax                 $1.73
      Total               $21.48
    `;
    const result = parseReceiptText(text);
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].name, 'Chicken Teriyaki');
    assert.equal(result.items[0].price, 14.5);
    assert.equal(result.items[1].name, 'Miso Soup');
    assert.equal(result.items[2].name, 'Green Tea');
    assert.equal(result.tax, 1.73);
    assert.equal(result.subtotal, 19.75);
    assert.equal(result.total, 21.48);
  });

  it('parses receipt without dollar signs', () => {
    const text = `
      Burger              12.99
      Fries                4.50
      Tax                  1.40
      Total               18.89
    `;
    const result = parseReceiptText(text);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].price, 12.99);
    assert.equal(result.tax, 1.4);
  });

  it('detects tip/gratuity', () => {
    const text = `
      Pasta               16.00
      Tip                  3.20
      Total               19.20
    `;
    const result = parseReceiptText(text);
    assert.equal(result.items.length, 1);
    assert.equal(result.tip, 3.2);
  });

  it('ignores non-item lines (thank you, card info, etc.)', () => {
    const text = `
      Thank you for dining with us!
      Visa ending 4242     $45.00
      Server: John
      Steak               $32.00
      Wine                $13.00
      Total               $45.00
    `;
    const result = parseReceiptText(text);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].name, 'Steak');
    assert.equal(result.items[1].name, 'Wine');
  });

  it('handles empty text', () => {
    const result = parseReceiptText('');
    assert.deepEqual(result.items, []);
    assert.equal(result.tax, null);
  });

  it('handles text with no prices', () => {
    const result = parseReceiptText('Hello world\nNo prices here\nJust text');
    assert.deepEqual(result.items, []);
  });
});

describe('OCR Text Parsing — Edge Cases', () => {
  it('handles sales tax variant', () => {
    const text = `
      Item A        $10.00
      Sales Tax      $0.88
    `;
    const result = parseReceiptText(text);
    assert.equal(result.tax, 0.88);
  });

  it('handles "Gratuity" as tip keyword', () => {
    const text = `
      Entree        $25.00
      Gratuity       $5.00
    `;
    const result = parseReceiptText(text);
    assert.equal(result.tip, 5.0);
  });

  it('handles "Amount Due" as total keyword', () => {
    const text = `
      Latte          $5.50
      Amount Due     $5.50
    `;
    const result = parseReceiptText(text);
    assert.equal(result.total, 5.5);
  });
});


// --------------------------------------------------------------------------
// Utility Function Tests
// --------------------------------------------------------------------------

describe('Utilities — ID Generation', () => {
  it('generates unique IDs', () => {
    const id1 = generateId('c_');
    const id2 = generateId('c_');
    assert.notEqual(id1, id2);
    assert.ok(id1.startsWith('c_'));
  });
});

describe('Utilities — Color Generation', () => {
  it('generates deterministic color for same name', () => {
    const c1 = generateColor('Sarah');
    const c2 = generateColor('Sarah');
    assert.equal(c1, c2);
  });

  it('generates different colors for different names', () => {
    const c1 = generateColor('Sarah');
    const c2 = generateColor('Mike');
    assert.notEqual(c1, c2);
  });

  it('returns valid HSL string', () => {
    const c = generateColor('Test');
    assert.ok(c.startsWith('hsl('));
  });
});

describe('Utilities — Currency Formatting', () => {
  it('formats whole dollar', () => {
    assert.equal(formatCurrency(10), '$10.00');
  });

  it('formats cents', () => {
    assert.equal(formatCurrency(9.5), '$9.50');
  });

  it('formats zero', () => {
    assert.equal(formatCurrency(0), '$0.00');
  });
});

describe('Utilities — Phone Formatting', () => {
  it('formats 10-digit number', () => {
    assert.equal(formatPhone('4155550101'), '+14155550101');
  });

  it('formats number with dashes', () => {
    assert.equal(formatPhone('415-555-0101'), '+14155550101');
  });

  it('preserves already formatted number', () => {
    assert.equal(formatPhone('+14155550101'), '+14155550101');
  });

  it('handles 11-digit with leading 1', () => {
    assert.equal(formatPhone('14155550101'), '+14155550101');
  });

  it('returns as-is for unrecognized format', () => {
    assert.equal(formatPhone('+44 7911 123456'), '+44 7911 123456');
  });
});

describe('Utilities — Validation', () => {
  it('validates correct Venmo handle', () => {
    assert.ok(isValidVenmo('@myhandle'));
  });

  it('rejects Venmo without @', () => {
    assert.ok(!isValidVenmo('myhandle'));
  });

  it('rejects empty Venmo', () => {
    assert.ok(!isValidVenmo(''));
  });

  it('rejects just @', () => {
    assert.ok(!isValidVenmo('@'));
    assert.ok(!isValidVenmo('@a')); // too short? actually @a + char = length 2. Design says >= 3.
  });

  it('validates correct phone numbers', () => {
    assert.ok(isValidPhone('4155550101'));
    assert.ok(isValidPhone('415-555-0101'));
    assert.ok(isValidPhone('(415) 555-0101'));
    assert.ok(isValidPhone('+14155550101'));
  });

  it('rejects invalid phone numbers', () => {
    assert.ok(!isValidPhone('12345'));
    assert.ok(!isValidPhone(''));
    assert.ok(!isValidPhone('abc'));
  });
});


// ============================================================================
// Results Summary
// ============================================================================

console.log('\n' + '─'.repeat(46));
if (failed === 0) {
  console.log(`\x1b[1m\x1b[32m  ✓ All ${passed} tests passed!\x1b[0m`);
} else {
  console.log(`\x1b[1m\x1b[32m  ✓ ${passed} passed\x1b[0m`);
  console.log(`\x1b[1m\x1b[31m  ✗ ${failed} failed\x1b[0m`);
}
if (skipped > 0) {
  console.log(`\x1b[1m\x1b[33m  ○ ${skipped} skipped\x1b[0m`);
}
console.log('─'.repeat(46));

if (failed > 0) {
  console.log('\n\x1b[1m\x1b[31mFailures:\x1b[0m');
  for (const f of failures) {
    console.log(`  • ${f.test}: ${f.error}`);
  }
  process.exit(1);
}
