import { generateId, generateColor } from './utils.js';
import { db } from './db.js';

const KEYS = {
  settings: 'tabmate_settings',
  contacts: 'tabmate_contacts',
  splits: 'tabmate_splits',
};

const DEFAULT_SETTINGS = {
  name: '',
  venmo: '',
  zelle: '',
  geminiApiKey: '',
};

export const store = {
  // Settings
  async getSettings() {
    const data = await db.get(KEYS.settings);
    return { ...DEFAULT_SETTINGS, ...(data || {}) };
  },
  async saveSettings(obj) {
    await db.set(KEYS.settings, obj);
  },

  // Contacts
  async getContacts() {
    const data = await db.get(KEYS.contacts);
    return data || [];
  },
  async saveContact(contact) {
    const contacts = await this.getContacts();
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx >= 0) {
      contacts[idx] = { ...contacts[idx], ...contact };
    } else {
      contacts.push({
        id: contact.id || generateId('c_'),
        name: contact.name.trim(),
        phone: (contact.phone || '').trim(),
        splitCount: contact.splitCount || 0,
        color: contact.color || generateColor(contact.name, contacts.length),
      });
    }
    await db.set(KEYS.contacts, contacts);
    return contacts;
  },
  async deleteContact(id) {
    const contacts = await this.getContacts();
    const filtered = contacts.filter((c) => c.id !== id);
    await db.set(KEYS.contacts, filtered);
    return filtered;
  },
  async bumpContactSplitCount(id) {
    const contacts = await this.getContacts();
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      contact.splitCount = (contact.splitCount || 0) + 1;
      await db.set(KEYS.contacts, contacts);
    }
    return contact;
  },
  async getContactsSortedByFrequency() {
    const contacts = await this.getContacts();
    return contacts.sort((a, b) => (b.splitCount || 0) - (a.splitCount || 0));
  },

  // Splits
  async getSplits() {
    const data = await db.get(KEYS.splits);
    return data || [];
  },
  async saveSplit(split) {
    const splits = await this.getSplits();
    split.id = split.id || generateId('s_');
    split.date = split.date || new Date().toISOString().split('T')[0];
    const idx = splits.findIndex((s) => s.id === split.id);
    if (idx >= 0) {
      splits[idx] = split;
    } else {
      splits.unshift(split);
    }
    await db.set(KEYS.splits, splits);
    return split;
  },
  async getSplitById(id) {
    const splits = await this.getSplits();
    return splits.find((s) => s.id === id) || null;
  },
  async markPaid(splitId, contactId) {
    const splits = await this.getSplits();
    const split = splits.find((s) => s.id === splitId);
    if (!split) return null;
    if (!split.paid) split.paid = [];
    const idx = split.paid.indexOf(contactId);
    if (idx >= 0) {
      split.paid.splice(idx, 1);
    } else {
      split.paid.push(contactId);
    }
    await db.set(KEYS.splits, splits);
    return split;
  },
  async deleteSplit(id) {
    const splits = await this.getSplits();
    const filtered = splits.filter((s) => s.id !== id);
    await db.set(KEYS.splits, filtered);
    return filtered;
  },
};
