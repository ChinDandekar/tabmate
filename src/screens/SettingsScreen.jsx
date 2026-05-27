import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../lib/store';
import { getInitials } from '../lib/utils';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [ownerSettings, setOwnerSettings] = useState({ name: '', venmo: '', zelle: '' });
  const [contacts, setContacts] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  useEffect(() => {
    setOwnerSettings(store.getSettings());
    setContacts(store.getContactsSortedByFrequency());
  }, []);

  const handleOwnerChange = (key, value) => {
    let finalValue = value;
    if (key === 'venmo' && value && !value.startsWith('@')) {
      finalValue = `@${value}`;
    }
    const updated = { ...ownerSettings, [key]: finalValue };
    setOwnerSettings(updated);
    store.saveSettings(updated);
  };

  const handleAddContact = (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    const name = newContactName.trim();
    const phone = newContactPhone.trim();
    if (!name) return;

    if (contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert(`${name} is already saved in your contacts database.`);
      return;
    }

    store.saveContact({ name, phone });
    setNewContactName('');
    setNewContactPhone('');
    setContacts(store.getContactsSortedByFrequency());
  };

  const handleDeleteContact = (id, name) => {
    if (confirm(`Are you sure you want to delete ${name} from your saved library?`)) {
      store.deleteContact(id);
      setContacts(store.getContactsSortedByFrequency());
    }
  };

  return (
    <div id="screen-settings" className="screen-container active">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-normal tracking-tight font-serif">Setup settings</h2>
        <button
          onClick={() => navigate('/home')}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Save and return home"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-3">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Your payment info</h3>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-15">
              <label htmlFor="settings-owner-name" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Your Display Name</label>
              <input
                id="settings-owner-name"
                type="text"
                placeholder="e.g. Chinmay"
                className="w-full bg-secondary text-sm px-4 py-25 rounded-md focus:ring-1 focus:ring-accent"
                value={ownerSettings.name}
                onChange={(e) => setOwnerSettings({ ...ownerSettings, name: e.target.value })}
                onBlur={(e) => handleOwnerChange('name', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-15">
              <label htmlFor="settings-owner-venmo" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Venmo Handle</label>
              <input
                id="settings-owner-venmo"
                type="text"
                placeholder="@username"
                className="w-full bg-secondary text-sm px-4 py-25 rounded-md focus:ring-1 focus:ring-accent"
                value={ownerSettings.venmo}
                onChange={(e) => setOwnerSettings({ ...ownerSettings, venmo: e.target.value })}
                onBlur={(e) => handleOwnerChange('venmo', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-15">
              <label htmlFor="settings-owner-zelle" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Zelle Phone / Email</label>
              <input
                id="settings-owner-zelle"
                type="text"
                placeholder="email@example.com or 555-555-5555"
                className="w-full bg-secondary text-sm px-4 py-25 rounded-md focus:ring-1 focus:ring-accent"
                value={ownerSettings.zelle}
                onChange={(e) => setOwnerSettings({ ...ownerSettings, zelle: e.target.value })}
                onBlur={(e) => handleOwnerChange('zelle', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-3">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">Saved contacts</h3>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col gap-15">
              <label htmlFor="settings-add-contact-name" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Name</label>
              <input
                id="settings-add-contact-name"
                type="text"
                placeholder="Name"
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md focus:ring-1 focus:ring-accent"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                onKeyDown={handleAddContact}
              />
            </div>
            <div className="flex flex-col gap-15">
              <label htmlFor="settings-add-contact-phone" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Mobile Number</label>
              <input
                id="settings-add-contact-phone"
                type="tel"
                placeholder="Mobile"
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md focus:ring-1 focus:ring-accent"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                onKeyDown={handleAddContact}
              />
            </div>
          </div>
          <button
            onClick={() => handleAddContact()}
            className="w-full mt-2 bg-primary text-primary-foreground py-25 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Add Contact
          </button>

          <div className="border border-border rounded-lg bg-card overflow-hidden mt-3 divide-y" id="settings-contacts-list">
            {contacts.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">
                No saved contacts in library yet. Add one above!
              </div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: contact.color || '#4A6741' }}
                    >
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold block">{contact.name}</span>
                      {contact.phone && (
                        <span className="text-[9px] text-muted-foreground font-mono block">{contact.phone}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.splitCount > 0 && (
                      <span className="text-[9px] font-mono px-2 py-05 bg-secondary text-muted-foreground rounded-full">
                        {contact.splitCount} split{contact.splitCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteContact(contact.id, contact.name)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label={`Delete ${contact.name} from contact list`}
                    >
                      <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
