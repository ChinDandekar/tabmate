import { getInitials } from '../utils.js';

export const assignScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-assign');

    this.backBtn = document.getElementById('assign-back-btn');
    this.nextBtn = document.getElementById('assign-next-btn');

    this.backBtn.addEventListener('click', () => {
      this.app.navigate('people');
    });

    this.nextBtn.addEventListener('click', () => {
      this.app.navigate('summary');
    });
  },

  reset() {
    this.render();
  },

  toggleAssignee(itemId, contactId) {
    const item = this.app.splitState.items.find(i => i.id === itemId);
    if (!item) return;

    if (!item.assignedTo) item.assignedTo = [];

    const idx = item.assignedTo.indexOf(contactId);
    if (idx >= 0) {
      // Remove
      item.assignedTo.splice(idx, 1);
    } else {
      // Add
      item.assignedTo.push(contactId);
    }

    this.render();
  },

  assignAll(itemId) {
    const item = this.app.splitState.items.find(i => i.id === itemId);
    if (!item) return;

    // Assign all active participants
    item.assignedTo = this.app.splitState.people.map(p => p.contactId);
    this.render();
  },

  render() {
    const itemsList = document.getElementById('assign-items-list');
    itemsList.innerHTML = '';

    const items = this.app.splitState.items;
    const people = this.app.splitState.people;

    // Calculate unassigned items count
    const unassignedItems = items.filter(item => !item.assignedTo || item.assignedTo.length === 0);
    const alertBanner = document.getElementById('unassigned-items-alert');
    const alertText = document.getElementById('unassigned-items-text');

    if (unassignedItems.length > 0) {
      alertBanner.style.display = 'flex';
      alertText.textContent = `${unassignedItems.length} item${unassignedItems.length !== 1 ? 's' : ''} unassigned`;
    } else {
      alertBanner.style.display = 'none';
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'border border-border rounded-xl overflow-hidden bg-card';

      // Header row of item card
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between px-4 py-3 border-b border-border-60 bg-muted-30';

      const title = document.createElement('span');
      title.className = 'text-sm font-semibold';
      title.textContent = item.name;

      const rightHeader = document.createElement('div');
      rightHeader.className = 'flex items-center gap-3';

      const assigneesCount = item.assignedTo ? item.assignedTo.length : 0;

      // "All" quick action trigger (only show if not everyone is assigned)
      if (assigneesCount < people.length && people.length > 1) {
        const allBtn = document.createElement('button');
        allBtn.className = 'text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-widest';
        allBtn.textContent = 'all';
        allBtn.addEventListener('click', () => this.assignAll(item.id));
        rightHeader.appendChild(allBtn);
      }

      const price = document.createElement('span');
      price.className = 'text-sm font-semibold font-mono';
      price.textContent = `$${item.price.toFixed(2)}`;

      rightHeader.appendChild(price);
      header.appendChild(title);
      header.appendChild(rightHeader);

      // Person pill selection grid
      const pillsContainer = document.createElement('div');
      pillsContainer.className = 'px-4 py-3 flex flex-wrap gap-2';

      people.forEach(person => {
        const isAssigned = item.assignedTo && item.assignedTo.includes(person.contactId);
        const splitCount = item.assignedTo ? item.assignedTo.length : 0;
        const perPersonShare = isAssigned && splitCount > 0 ? (item.price / splitCount).toFixed(2) : null;

        const pill = document.createElement('button');
        pill.className = `flex items-center gap-1.5 pl-2 pr-25 py-15 rounded-full text-xs font-medium border transition-colors select-none ${
          isAssigned
            ? 'text-white border-transparent shadow-sm'
            : 'bg-transparent border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
        }`;

        if (isAssigned) {
          pill.style.backgroundColor = person.color || '#4A6741';
        }

        const dot = document.createElement('div');
        dot.className = 'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold';
        
        if (isAssigned) {
          dot.className += ' bg-white/20 text-white';
          dot.innerHTML = `
            <svg class="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          `;
        } else {
          dot.className += ' bg-muted';
          dot.style.color = person.color || '#4A6741';
          dot.textContent = getInitials(person.name)[0];
        }

        const nameLabel = document.createElement('span');
        nameLabel.textContent = person.name;

        pill.appendChild(dot);
        pill.appendChild(nameLabel);

        // If shared, show what their individual portion is
        if (perPersonShare && splitCount > 1) {
          const shareSpan = document.createElement('span');
          shareSpan.className = 'opacity-65 ml-05 font-mono';
          shareSpan.textContent = `$${perPersonShare}`;
          pill.appendChild(shareSpan);
        }

        pill.addEventListener('click', () => this.toggleAssignee(item.id, person.contactId));

        pillsContainer.appendChild(pill);
      });

      card.appendChild(header);
      card.appendChild(pillsContainer);
      itemsList.appendChild(card);
    });
  }
};
