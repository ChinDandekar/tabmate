import { round2, formatCurrency } from '../utils.js';

export const editItemsScreen = {
  init(app) {
    this.app = app;
    this.container = document.getElementById('screen-editItems');

    // Inputs
    this.restaurantInput = document.getElementById('split-restaurant-name');
    this.taxInput = document.getElementById('tax-percent-input');
    this.tipInput = document.getElementById('tip-percent-input');
    
    this.newItemName = document.getElementById('new-item-name');
    this.newItemPrice = document.getElementById('new-item-price');
    this.addItemBtn = document.getElementById('add-item-row-btn');
    
    // Displays
    this.subtotalDisplay = document.getElementById('receipt-subtotal-display');
    this.taxLabel = document.getElementById('receipt-tax-label');
    this.taxDisplay = document.getElementById('receipt-tax-display');
    this.tipLabel = document.getElementById('receipt-tip-label');
    this.tipDisplay = document.getElementById('receipt-tip-display');
    this.totalDisplay = document.getElementById('receipt-total-display');
    
    // Next trigger
    this.nextBtn = document.getElementById('editItems-next-btn');

    // Event Bindings
    this.addItemBtn.addEventListener('click', () => this.addItem());
    
    // Pressing Enter on add item inputs triggers add item
    this.newItemName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addItem();
    });
    this.newItemPrice.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addItem();
    });

    this.restaurantInput.addEventListener('input', () => {
      this.app.splitState.restaurant = this.restaurantInput.value.trim();
    });

    this.taxInput.addEventListener('input', () => {
      this.app.splitState.taxPercent = parseFloat(this.taxInput.value) || 0;
      this.recalculate();
    });

    this.tipInput.addEventListener('input', () => {
      this.app.splitState.tipPercent = parseFloat(this.tipInput.value) || 0;
      this.recalculate();
    });

    this.nextBtn.addEventListener('click', () => {
      this.app.navigate('people');
    });
  },

  reset() {
    this.restaurantInput.value = this.app.splitState.restaurant || '';
    this.taxInput.value = (this.app.splitState.taxPercent || 8.875).toFixed(3);
    this.tipInput.value = (this.app.splitState.tipPercent || 20).toString();
    
    this.newItemName.value = '';
    this.newItemPrice.value = '';

    this.render();
    this.recalculate();
  },

  addItem() {
    const name = this.newItemName.value.trim();
    const priceRaw = parseFloat(this.newItemPrice.value);
    
    if (!name || isNaN(priceRaw) || priceRaw <= 0) return;

    const newItem = {
      id: `i_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      price: round2(priceRaw),
      assignedTo: [] // holds contact IDs who share this item
    };

    this.app.splitState.items.push(newItem);
    
    // Clear inputs
    this.newItemName.value = '';
    this.newItemPrice.value = '';
    
    this.render();
    this.recalculate();
    this.newItemName.focus();
  },

  removeItem(id) {
    this.app.splitState.items = this.app.splitState.items.filter(item => item.id !== id);
    this.render();
    this.recalculate();
  },

  updateItemName(id, name) {
    const item = this.app.splitState.items.find(i => i.id === id);
    if (item) {
      item.name = name.trim();
    }
  },

  updateItemPrice(id, priceStr) {
    const item = this.app.splitState.items.find(i => i.id === id);
    if (item) {
      item.price = round2(parseFloat(priceStr) || 0);
      this.recalculate();
    }
  },

  render() {
    const listContainer = document.getElementById('ocr-items-list');
    listContainer.innerHTML = '';

    const items = this.app.splitState.items;
    
    if (items.length === 0) {
      this.nextBtn.disabled = true;
    } else {
      this.nextBtn.disabled = false;
    }

    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `grid grid-cols-[1fr_7rem_2rem] items-center px-4 py-3 group ${idx < items.length - 1 ? 'border-b border-border-60' : ''}`;
      
      // Item name input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = item.name;
      nameInput.className = 'bg-transparent text-sm text-foreground focus:outline-none min-w-0 w-full font-medium';
      nameInput.addEventListener('change', () => this.updateItemName(item.id, nameInput.value));
      
      // Price container
      const priceContainer = document.createElement('div');
      priceContainer.className = 'flex items-center justify-end gap-05';
      
      const dollar = document.createElement('span');
      dollar.className = 'text-xs text-muted-foreground font-mono';
      dollar.textContent = '$';
      
      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.step = '0.01';
      priceInput.min = '0';
      priceInput.value = item.price.toFixed(2);
      priceInput.className = 'bg-transparent text-sm text-right focus:outline-none w-16 font-mono';
      priceInput.addEventListener('change', () => this.updateItemPrice(item.id, priceInput.value));
      
      priceContainer.appendChild(dollar);
      priceContainer.appendChild(priceInput);

      // Remove button (shows on hover)
      const removeBtn = document.createElement('button');
      removeBtn.className = 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex justify-end';
      removeBtn.setAttribute('aria-label', `Delete item ${item.name}`);
      removeBtn.innerHTML = `
        <svg class="w-35 h-35" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      `;
      removeBtn.addEventListener('click', () => this.removeItem(item.id));

      row.appendChild(nameInput);
      row.appendChild(priceContainer);
      row.appendChild(removeBtn);

      listContainer.appendChild(row);
    });
  },

  recalculate() {
    const items = this.app.splitState.items;
    
    // Subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    this.app.splitState.subtotal = round2(subtotal);
    this.subtotalDisplay.textContent = formatCurrency(this.app.splitState.subtotal);

    // Tax
    const taxPct = this.app.splitState.taxPercent || 0;
    this.taxLabel.textContent = `Tax (${taxPct.toFixed(3)}%)`;
    const taxAmount = round2(subtotal * (taxPct / 100));
    this.app.splitState.taxAmount = taxAmount;
    this.taxDisplay.textContent = formatCurrency(taxAmount);

    // Tip
    const tipPct = this.app.splitState.tipPercent || 0;
    this.tipLabel.textContent = `Tip (${tipPct.toString()}%)`;
    const tipAmount = round2(subtotal * (tipPct / 100));
    this.app.splitState.tipAmount = tipAmount;
    this.tipDisplay.textContent = formatCurrency(tipAmount);

    // Total
    const grandTotal = round2(subtotal + taxAmount + tipAmount);
    this.app.splitState.total = grandTotal;
    this.totalDisplay.textContent = formatCurrency(grandTotal);
  }
};
