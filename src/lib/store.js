import { generateId, generateColor, formatPhone } from './utils.js';
import { db } from './db.js';

const KEYS = {
  settings: 'tabmate_settings',
  contacts: 'tabmate_contacts',
  splits: 'tabmate_splits',
  activeSplit: 'tabmate_active_split',
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
    const normalizedName = (contact.name || '').trim();
    const normalizedPhone = formatPhone(contact.phone || '');
    if (!normalizedName) return await this.getContacts();

    const contacts = await this.getContacts();
    const idx = contacts.findIndex((c) => {
      if (contact.id && c.id === contact.id) return true;
      const cPhone = formatPhone(c.phone || '');
      if (normalizedPhone && cPhone) return cPhone === normalizedPhone;
      return c.name.toLowerCase() === normalizedName.toLowerCase();
    });

    if (idx >= 0) {
      contacts[idx] = {
        ...contacts[idx],
        ...contact,
        name: normalizedName,
        phone: normalizedPhone || contacts[idx].phone || '',
      };
    } else {
      contacts.push({
        id: contact.id || generateId('c_'),
        name: normalizedName,
        phone: normalizedPhone || '',
        splitCount: contact.splitCount || 0,
        color: contact.color || generateColor(normalizedName, contacts.length),
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
  async addOrIncrementContact(contact) {
    const name = (contact.name || '').trim();
    if (!name) return null;
    const phone = formatPhone(contact.phone || '');
    const contacts = await this.getContacts();
    const idx = contacts.findIndex((c) => {
      const cPhone = formatPhone(c.phone || '');
      if (phone && cPhone) return cPhone === phone;
      return c.name.toLowerCase() === name.toLowerCase();
    });

    if (idx >= 0) {
      contacts[idx] = {
        ...contacts[idx],
        phone: phone || contacts[idx].phone || '',
        splitCount: (contacts[idx].splitCount || 0) + 1,
      };
      await db.set(KEYS.contacts, contacts);
      return contacts[idx];
    }

    const newContact = {
      id: contact.id || generateId('c_'),
      name,
      phone,
      splitCount: 1,
      color: contact.color || generateColor(name, contacts.length),
    };
    contacts.push(newContact);
    await db.set(KEYS.contacts, contacts);
    return newContact;
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

  // Active split handoff state
  async saveSplitState(splitState) {
    await db.set(KEYS.activeSplit, {
      ...splitState,
      savedAt: Date.now(),
    });
  },
  async loadSplitState() {
    return (await db.get(KEYS.activeSplit)) || null;
  },
  async clearSplitState() {
    await db.del(KEYS.activeSplit);
  },
};
