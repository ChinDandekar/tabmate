import { store } from '../store.js';
import { getInitials } from '../utils.js';

export const settingsScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-settings');

    // Owner Inputs
    this.ownerName = document.getElementById('settings-owner-name');
    this.ownerVenmo = document.getElementById('settings-owner-venmo');
    this.ownerZelle = document.getElementById('settings-owner-zelle');

    // Contact creation inputs inside settings
    this.addContactName = document.getElementById('settings-add-contact-name');
    this.addContactPhone = document.getElementById('settings-add-contact-phone');
    this.addContactBtn = document.getElementById('settings-add-contact-btn');

    // Close button
    this.closeBtn = document.getElementById('settings-close-btn');

    // Auto-save settings profile on input focus loses (blur)
    this.ownerName.addEventListener('blur', () => this.saveOwnerSettings());
    this.ownerVenmo.addEventListener('blur', () => this.saveOwnerSettings());
    this.ownerZelle.addEventListener('blur', () => this.saveOwnerSettings());

    // Bind settings buttons
    this.addContactBtn.addEventListener('click', () => this.addNewContact());
    
    // Pressing Enter in add contact triggers save
    this.addContactName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addNewContact();
    });
    this.addContactPhone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addNewContact();
    });

    this.closeBtn.addEventListener('click', () => {
      this.saveOwnerSettings();
      this.app.navigate('home');
    });
  },

  reset() {
    const settings = store.getSettings();
    this.ownerName.value = settings.name || '';
    this.ownerVenmo.value = settings.venmo || '';
    this.ownerZelle.value = settings.zelle || '';

    this.addContactName.value = '';
    this.addContactPhone.value = '';

    this.render();
  },

  saveOwnerSettings() {
    const name = this.ownerName.value.trim();
    let venmo = this.ownerVenmo.value.trim();
    const zelle = this.ownerZelle.value.trim();

    // Auto prepending Venmo handle @ if missing
    if (venmo && !venmo.startsWith('@')) {
      venmo = `@${venmo}`;
      this.ownerVenmo.value = venmo;
    }

    store.saveSettings({ name, venmo, zelle });
  },

  addNewContact() {
    const name = this.addContactName.value.trim();
    const phone = this.addContactPhone.value.trim();

    if (!name) return;

    // Check if duplicate name in contacts
    const contacts = store.getContacts();
    if (contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert(`${name} is already saved in your contacts database.`);
      return;
    }

    store.saveContact({ name, phone });

    // Clear inputs
    this.addContactName.value = '';
    this.addContactPhone.value = '';

    this.render();
    this.addContactName.focus();
  },

  deleteContact(id) {
    if (confirm('Are you sure you want to delete this contact from your saved library?')) {
      store.deleteContact(id);
      this.render();
    }
  },

  render() {
    const listContainer = document.getElementById('settings-contacts-list');
    listContainer.innerHTML = '';

    const contacts = store.getContactsSortedByFrequency();

    if (contacts.length === 0) {
      listContainer.innerHTML = `
        <div class="px-4 py-6 text-center text-xs text-muted-foreground italic">
          No saved contacts in library yet. Add one above!
        </div>
      `;
      return;
    }

    contacts.forEach(contact => {
      const row = document.createElement('div');
      row.className = 'px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-3';

      const avatar = document.createElement('div');
      avatar.className = 'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0';
      avatar.style.backgroundColor = contact.color || '#4A6741';
      avatar.textContent = getInitials(contact.name);

      const info = document.createElement('div');
      
      const name = document.createElement('span');
      name.className = 'text-xs font-semibold block';
      name.textContent = contact.name;

      info.appendChild(name);

      if (contact.phone) {
        const phone = document.createElement('span');
        phone.className = 'text-[9px] text-muted-foreground font-mono block';
        phone.textContent = contact.phone;
        info.appendChild(phone);
      }

      left.appendChild(avatar);
      left.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'flex items-center gap-2';

      // Usage badge count indicator
      if (contact.splitCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'text-[9px] font-mono px-2 py-05 bg-secondary text-muted-foreground rounded-full';
        badge.textContent = `${contact.splitCount} split${contact.splitCount !== 1 ? 's' : ''}`;
        actions.appendChild(badge);
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'text-muted-foreground hover:text-destructive transition-colors p-1';
      deleteBtn.setAttribute('aria-label', `Delete ${contact.name} from contact list`);
      deleteBtn.innerHTML = `
        <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => this.deleteContact(contact.id));
      actions.appendChild(deleteBtn);

      row.appendChild(left);
      row.appendChild(actions);

      listContainer.appendChild(row);
    });
  }
};
