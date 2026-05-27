import { store } from '../store.js';
import { round2, fixRoundingDrift, formatCurrency, getInitials } from '../utils.js';

export const summaryScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-summary');

    this.backBtn = document.getElementById('summary-back-btn');
    this.doneBtn = document.getElementById('summary-done-btn');

    this.sentContacts = new Set(); // tracks who we already messaged in this session

    this.backBtn.addEventListener('click', () => {
      this.app.navigate('assign');
    });

    this.doneBtn.addEventListener('click', () => {
      this.completeSplit();
    });
  },

  reset() {
    this.sentContacts.clear();
    this.recalculateAndRender();
  },

  recalculateAndRender() {
    const state = this.app.splitState;
    const items = state.items;
    const people = state.people;
    const taxAmount = state.taxAmount || 0;
    const tipAmount = state.tipAmount || 0;

    // Run proportional bill-splitting math (penny-perfect rounding drift checked)
    const personTotals = {};

    // 1. Initialize
    people.forEach(p => {
      personTotals[p.contactId] = {
        contactId: p.contactId,
        name: p.name,
        phone: p.phone || '',
        color: p.color,
        itemSubtotal: 0,
        items: [],
        taxShare: 0,
        tipShare: 0,
        total: 0
      };
    });

    // 2. Distribute assigned item costs
    items.forEach(item => {
      if (!item.assignedTo || item.assignedTo.length === 0) return;
      const share = item.price / item.assignedTo.length;
      item.assignedTo.forEach(cid => {
        if (!personTotals[cid]) return;
        personTotals[cid].itemSubtotal += share;
        personTotals[cid].items.push({
          name: item.name,
          price: item.price,
          sharedWith: item.assignedTo.length,
          yourShare: share
        });
      });
    });

    // 3. Round item subtotals
    people.forEach(p => {
      if (personTotals[p.contactId]) {
        personTotals[p.contactId].itemSubtotal = round2(personTotals[p.contactId].itemSubtotal);
      }
    });

    // 4. Correct item subtotal drift
    const expectedSubtotal = round2(
      items.reduce((sum, item) => {
        if (item.assignedTo && item.assignedTo.length > 0) return sum + item.price;
        return sum;
      }, 0)
    );
    fixRoundingDrift(Object.values(personTotals), 'itemSubtotal', expectedSubtotal);

    const grandItemSubtotal = Object.values(personTotals).reduce((sum, p) => sum + p.itemSubtotal, 0);

    // 5. Distribute tax proportionally
    if (grandItemSubtotal > 0 && taxAmount > 0) {
      people.forEach(p => {
        const pt = personTotals[p.contactId];
        const proportion = pt.itemSubtotal / grandItemSubtotal;
        pt.taxShare = round2(taxAmount * proportion);
      });
      fixRoundingDrift(Object.values(personTotals), 'taxShare', taxAmount);
    }

    // 6. Distribute tip proportionally
    if (grandItemSubtotal > 0 && tipAmount > 0) {
      people.forEach(p => {
        const pt = personTotals[p.contactId];
        const proportion = pt.itemSubtotal / grandItemSubtotal;
        pt.tipShare = round2(tipAmount * proportion);
      });
      fixRoundingDrift(Object.values(personTotals), 'tipShare', tipAmount);
    }

    // 7. Compute final personal totals
    people.forEach(p => {
      const pt = personTotals[p.contactId];
      pt.total = round2(pt.itemSubtotal + pt.taxShare + pt.tipShare);
    });

    // Cache calculated people array into active split state
    this.computedPeople = Object.values(personTotals);

    // Render displays
    document.getElementById('summary-total-amount').textContent = formatCurrency(state.total);

    const container = document.getElementById('summary-people-breakdowns');
    container.innerHTML = '';

    // Render cards
    this.computedPeople.forEach(pt => {
      const card = document.createElement('div');
      card.className = 'border border-border rounded-xl overflow-hidden bg-card transition-all';
      card.style.borderLeft = `3.5px solid ${pt.color || '#4A6741'}`;

      // Card Header
      const cardHeader = document.createElement('div');
      cardHeader.className = 'flex items-center justify-between px-4 py-35 border-b border-border-60';

      const leftInfo = document.createElement('div');
      leftInfo.className = 'flex items-center gap-3';

      const avatar = document.createElement('div');
      avatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0';
      avatar.style.backgroundColor = pt.color || '#4A6741';
      avatar.textContent = getInitials(pt.name);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-semibold text-sm';
      nameSpan.textContent = pt.name;

      leftInfo.appendChild(avatar);
      leftInfo.appendChild(nameSpan);

      const rightInfo = document.createElement('div');
      rightInfo.className = 'text-right';

      const totalVal = document.createElement('div');
      totalVal.className = 'text-lg font-medium leading-none font-mono';
      totalVal.textContent = formatCurrency(pt.total);

      rightInfo.appendChild(totalVal);
      if (pt.items.length > 0 && (taxAmount + tipAmount) > 0) {
        const feesMeta = document.createElement('div');
        feesMeta.className = 'text-[10px] text-muted-foreground mt-05 font-mono';
        feesMeta.textContent = `${formatCurrency(pt.itemSubtotal)} + fees`;
        rightInfo.appendChild(feesMeta);
      }

      cardHeader.appendChild(leftInfo);
      cardHeader.appendChild(rightInfo);

      // Card Items List
      const itemsList = document.createElement('div');
      itemsList.className = 'px-4 py-25 space-y-15';

      if (pt.items.length > 0) {
        pt.items.forEach(item => {
          const itemRow = document.createElement('div');
          itemRow.className = 'flex justify-between items-baseline';

          const itemName = document.createElement('span');
          itemName.className = 'text-xs text-muted-foreground';
          itemName.textContent = item.name;

          if (item.sharedWith > 1) {
            const splitIndicator = document.createElement('span');
            splitIndicator.className = 'ml-1 opacity-50 font-mono text-[10px]';
            splitIndicator.textContent = `÷${item.sharedWith}`;
            itemName.appendChild(splitIndicator);
          }

          const itemShare = document.createElement('span');
          itemShare.className = 'text-xs text-muted-foreground ml-3 shrink-0 font-mono';

          // Display the final item share price factor including proportional tip + tax multiplier!
          const itemSubtotalSum = this.computedPeople.reduce((sum, p) => sum + p.itemSubtotal, 0);
          const mult = itemSubtotalSum > 0 ? state.total / itemSubtotalSum : 1;
          itemShare.textContent = formatCurrency(item.yourShare * mult);

          itemRow.appendChild(itemName);
          itemRow.appendChild(itemShare);
          itemsList.appendChild(itemRow);
        });
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'text-xs text-muted-foreground italic';
        emptyMsg.textContent = 'No items assigned';
        itemsList.appendChild(emptyMsg);
      }

      // Card iMessage Action Button
      const buttonWrapper = document.createElement('div');
      buttonWrapper.className = 'px-4 pb-35 pt-2 border-t border-border-60';

      const sendBtn = document.createElement('button');
      const isSent = this.sentContacts.has(pt.contactId);

      sendBtn.className = `w-full py-25 rounded-lg text-xs font-semibold flex items-center justify-center gap-15 transition-colors ${isSent
          ? 'bg-accent-10 text-accent border border-accent-25'
          : 'bg-primary text-primary-foreground hover:opacity-90'
        }`;

      if (isSent) {
        sendBtn.innerHTML = `
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          Sent to ${pt.name}!
        `;
      } else {
        sendBtn.innerHTML = `
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
          </svg>
          Send to ${pt.name}
        `;
      }

      sendBtn.addEventListener('click', () => {
        this.sendImsMessage(pt);
      });

      buttonWrapper.appendChild(sendBtn);
      card.appendChild(cardHeader);
      card.appendChild(itemsList);
      card.appendChild(buttonWrapper);

      container.appendChild(card);
    });

    // Unassigned block warnings
    const unassignedItems = items.filter(item => !item.assignedTo || item.assignedTo.length === 0);
    const unassignedCard = document.getElementById('summary-unassigned-card');
    const unassignedList = document.getElementById('summary-unassigned-items-list');

    if (unassignedItems.length > 0) {
      unassignedCard.style.display = 'block';
      unassignedList.innerHTML = '';

      unassignedItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-baseline';
        row.innerHTML = `
          <span class="text-xs text-muted-foreground">${item.name}</span>
          <span class="text-xs text-muted-foreground font-mono">$${item.price.toFixed(2)}</span>
        `;
        unassignedList.appendChild(row);
      });
    } else {
      unassignedCard.style.display = 'none';
    }
  },

  sendImsMessage(person) {
    const state = this.app.splitState;
    const settings = store.getSettings();
    const rest = state.restaurant || 'dinner';

    let body = `Hey ${person.name}! From ${rest} 🍽️\n`;

    person.items.forEach(item => {
      if (item.sharedWith > 1) {
        body += `${item.name} (split ${item.sharedWith} ways) – ${formatCurrency(item.yourShare)}\n`;
      } else {
        body += `${item.name} – ${formatCurrency(item.yourShare)}\n`;
      }
    });

    body += `Your share: ${formatCurrency(person.itemSubtotal)}`;
    if (person.tipShare > 0) body += ` + ${formatCurrency(person.tipShare)} tip`;
    if (person.taxShare > 0) body += ` + ${formatCurrency(person.taxShare)} tax`;
    body += ` = ${formatCurrency(person.total)}\n\n`;

    if (settings.venmo) body += `Venmo: ${settings.venmo}\n`;
    if (settings.zelle) body += `Zelle: ${settings.zelle}\n`;
    body += '\nThanks! 🙏';

    // Track as sent
    this.sentContacts.add(person.contactId);
    this.recalculateAndRender();

    // Trigger URL Scheme prefill
    const encoded = encodeURIComponent(body);
    window.location.href = `sms:${person.phone}&body=${encoded}`;
  },

  completeSplit() {
    const state = this.app.splitState;

    // Save to historical store
    store.saveSplit({
      restaurant: state.restaurant || 'Dinner Split',
      total: state.total,
      people: this.computedPeople.map(p => ({
        contactId: p.contactId,
        name: p.name,
        phone: p.phone,
        color: p.color,
        total: p.total
      })),
      paid: [],
      items: state.items,
      taxPercent: state.taxPercent,
      tipPercent: state.tipPercent
    });

    // Bump split usage frequency split counts
    this.computedPeople.forEach(p => {
      // Find them in store contacts and bump
      const match = store.getContacts().find(c => c.name.toLowerCase() === p.name.toLowerCase());
      if (match) {
        store.bumpContactSplitCount(match.id);
      }
    });

    this.app.navigate('home');
  }
};
