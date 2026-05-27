import { store } from '../store.js';
import { getInitials, formatCurrency } from '../utils.js';

export const homeScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-home');
    
    // Bind buttons
    document.getElementById('home-new-split-btn').addEventListener('click', () => {
      // Clear split state and go to Scan screen
      this.app.startNewSplit();
    });

    document.getElementById('home-settings-btn').addEventListener('click', () => {
      this.app.navigate('settings');
    });

    this.render();
  },

  render() {
    const splits = store.getSplits();
    const listContainer = document.getElementById('splits-history-list');
    listContainer.innerHTML = '';

    if (splits.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-12 text-muted-foreground border rounded-xl bg-card">
          <svg class="w-9 h-9 mx-auto mb-3 opacity-25" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <p class="text-sm font-medium mb-1 font-serif">No splits recorded yet</p>
          <p class="text-xs">Tap "Start New Split" to divide a dining check.</p>
        </div>
      `;
      return;
    }

    splits.forEach(split => {
      // Create card element
      const card = document.createElement('button');
      card.className = 'w-full text-left border rounded-xl p-4 bg-card hover:bg-muted transition-colors flex justify-between items-center';
      card.setAttribute('aria-label', `View details for split at ${split.restaurant} on ${split.date}`);
      
      // Left side info
      const left = document.createElement('div');
      
      const rest = document.createElement('h4');
      rest.className = 'text-sm font-semibold mb-05 font-serif';
      rest.textContent = split.restaurant || 'Unnamed Split';
      
      const dateMeta = document.createElement('div');
      dateMeta.className = 'text-xs text-muted-foreground flex items-center gap-2';
      
      const dateSpan = document.createElement('span');
      dateSpan.textContent = split.date;
      
      const dot = document.createElement('span');
      dot.className = 'w-1 h-1 rounded-full bg-muted-foreground opacity-40';
      
      const participantsCount = document.createElement('span');
      const count = split.people ? split.people.length : 0;
      participantsCount.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
      
      dateMeta.appendChild(dateSpan);
      dateMeta.appendChild(dot);
      dateMeta.appendChild(participantsCount);
      
      // Avatar initials container
      const avatars = document.createElement('div');
      avatars.className = 'flex gap-1 mt-3';
      
      if (split.people) {
        split.people.slice(0, 5).forEach(person => {
          const avatar = document.createElement('div');
          const isPaid = split.paid && split.paid.includes(person.contactId);
          
          avatar.className = 'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm';
          avatar.style.backgroundColor = person.color || '#4A6741';
          avatar.textContent = getInitials(person.name);
          
          if (isPaid) {
            avatar.style.opacity = '0.5';
            avatar.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.4)';
          }
          
          avatars.appendChild(avatar);
        });

        if (split.people.length > 5) {
          const excess = document.createElement('div');
          excess.className = 'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-secondary text-muted-foreground border';
          excess.textContent = `+${split.people.length - 5}`;
          avatars.appendChild(excess);
        }
      }

      left.appendChild(rest);
      left.appendChild(dateMeta);
      left.appendChild(avatars);

      // Right side total info
      const right = document.createElement('div');
      right.className = 'text-right flex flex-col items-end gap-1';
      
      const totalVal = document.createElement('span');
      totalVal.className = 'text-base font-semibold font-mono';
      totalVal.textContent = formatCurrency(split.total);
      
      const viewMeta = document.createElement('span');
      viewMeta.className = 'text-[10px] text-muted-foreground flex items-center gap-1 font-mono uppercase tracking-widest';
      viewMeta.innerHTML = `view <svg class="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
      
      right.appendChild(totalVal);
      right.appendChild(viewMeta);

      card.appendChild(left);
      card.appendChild(right);

      // Add view detailed historical trigger
      card.addEventListener('click', () => {
        this.app.viewHistoricalSplit(split.id);
      });

      listContainer.appendChild(card);
    });
  }
};
