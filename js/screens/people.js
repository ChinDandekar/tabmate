import { store } from '../store.js';
import { getInitials, generateColor } from '../utils.js';

export const peopleScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-people');

    this.nameInput = document.getElementById('inline-person-name');
    this.phoneInput = document.getElementById('inline-person-phone');
    this.addBtn = document.getElementById('inline-add-person-btn');
    
    this.backBtn = document.getElementById('people-back-btn');
    this.nextBtn = document.getElementById('people-next-btn');

    // Bind triggers
    this.addBtn.addEventListener('click', () => this.addPerson());
    
    // Pressing Enter on inputs triggers addition
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addPerson();
    });
    this.phoneInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addPerson();
    });

    this.backBtn.addEventListener('click', () => {
      this.app.navigate('editItems');
    });

    this.nextBtn.addEventListener('click', () => {
      // Ensure all participants are added/saved in store
      this.app.splitState.people.forEach(p => {
        // If not already in store contacts database, save them
        const contacts = store.getContacts();
        const exists = contacts.some(c => c.name.toLowerCase() === p.name.toLowerCase());
        if (!exists) {
          store.saveContact({
            name: p.name,
            phone: p.phone,
            color: p.color
          });
        }
      });
      this.app.navigate('assign');
    });
  },

  reset() {
    this.nameInput.value = '';
    this.phoneInput.value = '';
    
    this.render();
  },

  addPerson() {
    const name = this.nameInput.value.trim();
    const phone = this.phoneInput.value.trim();
    
    if (!name) return;

    // Check if name is already added to split
    if (this.app.splitState.people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      alert(`${name} is already added to this split.`);
      return;
    }

    const newPerson = {
      contactId: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      phone: phone || '',
      color: generateColor(name, this.app.splitState.people.length)
    };

    this.app.splitState.people.push(newPerson);
    
    // Clear inputs
    this.nameInput.value = '';
    this.phoneInput.value = '';
    
    this.render();
    this.nameInput.focus();
  },

  removePerson(contactId) {
    this.app.splitState.people = this.app.splitState.people.filter(p => p.contactId !== contactId);
    
    // Also remove from any item assignees
    this.app.splitState.items.forEach(item => {
      if (item.assignedTo) {
        item.assignedTo = item.assignedTo.filter(id => id !== contactId);
      }
    });

    this.render();
  },

  toggleFrequentPerson(contact) {
    const active = this.app.splitState.people;
    const idx = active.findIndex(p => p.name.toLowerCase() === contact.name.toLowerCase());

    if (idx >= 0) {
      // Remove
      this.removePerson(active[idx].contactId);
    } else {
      // Add
      active.push({
        contactId: contact.id,
        name: contact.name,
        phone: contact.phone || '',
        color: contact.color
      });
      this.render();
    }
  },

  render() {
    const activeList = document.getElementById('split-people-list');
    activeList.innerHTML = '';

    const emptyView = document.getElementById('contacts-empty-view');
    const people = this.app.splitState.people;

    // Enable next button only if at least 1 person is added
    if (people.length === 0) {
      emptyView.style.display = 'block';
      this.nextBtn.disabled = true;
    } else {
      emptyView.style.display = 'none';
      this.nextBtn.disabled = false;
    }

    // Render active split people
    people.forEach(p => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between border border-border rounded-xl px-4 py-3 bg-card';
      
      const left = document.createElement('div');
      left.className = 'flex items-center gap-3';
      
      const avatar = document.createElement('div');
      avatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0';
      avatar.style.backgroundColor = p.color || '#4A6741';
      avatar.textContent = getInitials(p.name);
      
      const info = document.createElement('div');
      
      const nameLabel = document.createElement('span');
      nameLabel.className = 'text-sm font-medium block';
      nameLabel.textContent = p.name;
      
      info.appendChild(nameLabel);
      if (p.phone) {
        const phoneLabel = document.createElement('span');
        phoneLabel.className = 'text-[10px] text-muted-foreground font-mono block';
        phoneLabel.textContent = p.phone;
        info.appendChild(phoneLabel);
      }

      left.appendChild(avatar);
      left.appendChild(info);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'text-muted-foreground hover:text-destructive transition-colors';
      deleteBtn.setAttribute('aria-label', `Remove ${p.name} from split`);
      deleteBtn.innerHTML = `
        <svg class="w-35 h-35" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => this.removePerson(p.contactId));

      row.appendChild(left);
      row.appendChild(deleteBtn);

      activeList.appendChild(row);
    });

    // Render frequent contacts picker
    const frequentPicker = document.getElementById('frequent-contacts-picker');
    frequentPicker.innerHTML = '';

    const frequentContacts = store.getContactsSortedByFrequency();
    
    if (frequentContacts.length === 0) {
      frequentPicker.innerHTML = '<span class="text-xs text-muted-foreground italic">No saved contacts yet. They will save automatically.</span>';
      return;
    }

    frequentContacts.forEach(contact => {
      const isSelected = people.some(p => p.name.toLowerCase() === contact.name.toLowerCase());
      
      const chip = document.createElement('button');
      chip.className = `flex items-center gap-1.5 pl-2 pr-25 py-15 rounded-full text-xs font-medium border transition-colors ${
        isSelected
          ? 'text-white border-transparent shadow-sm'
          : 'bg-transparent border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
      }`;
      
      if (isSelected) {
        chip.style.backgroundColor = contact.color || '#4A6741';
      }

      const dot = document.createElement('div');
      dot.className = 'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold';
      
      if (isSelected) {
        dot.className += ' bg-white/20 text-white';
        dot.innerHTML = `
          <svg class="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        `;
      } else {
        dot.className += ' bg-muted';
        dot.style.color = contact.color || '#4A6741';
        dot.textContent = getInitials(contact.name)[0];
      }

      const label = document.createElement('span');
      label.textContent = contact.name;

      chip.appendChild(dot);
      chip.appendChild(label);

      chip.addEventListener('click', () => this.toggleFrequentPerson(contact));

      frequentPicker.appendChild(chip);
    });
  }
};
