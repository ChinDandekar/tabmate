import { store } from '../store.js';
import { formatCurrency, getInitials } from '../utils.js';

export const splitDetailScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-splitDetail');

    this.backBtn = document.getElementById('splitDetail-back-btn');
    this.deleteBtn = document.getElementById('splitDetail-delete-btn');
    
    this.restaurantHeader = document.getElementById('splitDetail-restaurant');
    this.dateHeader = document.getElementById('splitDetail-date');
    this.totalHeader = document.getElementById('splitDetail-total');
    
    this.peopleList = document.getElementById('splitDetail-people-list');

    this.backBtn.addEventListener('click', () => {
      this.app.navigate('home');
    });

    this.deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this historical split record permanently?')) {
        store.deleteSplit(this.activeSplitId);
        this.app.navigate('home');
      }
    });
  },

  reset(splitId) {
    this.activeSplitId = splitId;
    this.render();
  },

  togglePaid(personId) {
    store.markPaid(this.activeSplitId, personId);
    this.render();
  },

  render() {
    const split = store.getSplitById(this.activeSplitId);
    if (!split) {
      this.app.navigate('home');
      return;
    }

    this.restaurantHeader.textContent = split.restaurant || 'Dinner Split';
    this.dateHeader.textContent = split.date || 'Unknown Date';
    this.totalHeader.textContent = formatCurrency(split.total);

    this.peopleList.innerHTML = '';

    split.people.forEach(p => {
      const isPaid = split.paid && split.paid.includes(p.contactId);
      
      const row = document.createElement('div');
      row.className = 'px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-3';

      const avatar = document.createElement('div');
      avatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0';
      avatar.style.backgroundColor = p.color || '#4A6741';
      avatar.textContent = getInitials(p.name);
      
      if (isPaid) {
        avatar.style.opacity = '0.5';
      }

      const info = document.createElement('div');
      
      const name = document.createElement('span');
      name.className = `text-sm font-semibold block ${isPaid ? 'line-through text-muted-foreground' : ''}`;
      name.textContent = p.name;

      const owed = document.createElement('span');
      owed.className = 'text-xs text-muted-foreground font-mono block';
      owed.textContent = formatCurrency(p.total);

      info.appendChild(name);
      info.appendChild(owed);
      left.appendChild(avatar);
      left.appendChild(info);

      // Paid status toggle toggle
      const paidBtn = document.createElement('button');
      paidBtn.className = `px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
        isPaid
          ? 'bg-accent-10 text-accent border-accent-25'
          : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
      }`;
      paidBtn.textContent = isPaid ? 'Paid' : 'Mark Paid';
      paidBtn.addEventListener('click', () => this.togglePaid(p.contactId));

      row.appendChild(left);
      row.appendChild(paidBtn);

      this.peopleList.appendChild(row);
    });
  }
};
