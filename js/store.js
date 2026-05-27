import { generateId, generateColor } from './utils.js';

const KEYS = {
  settings: 'tabmate_settings',
  contacts: 'tabmate_contacts',
  splits: 'tabmate_splits',
};

function _read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return null;
  }
}

function _write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

export const store = {
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
        id: contact.id || generateId('c_'),
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        splitCount: contact.splitCount || 0,
        color: contact.color || generateColor(contact.name, contacts.length),
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
    split.id = split.id || generateId('s_');
    split.date = split.date || new Date().toISOString().split('T')[0];
    
    // Check if updating or adding new
    const idx = splits.findIndex(s => s.id === split.id);
    if (idx >= 0) {
      splits[idx] = split;
    } else {
      splits.unshift(split); // newest first
    }
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
