import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSplit } from '../context/SplitContext';
import { round2, formatCurrency } from '../lib/utils';

export default function EditItemsScreen() {
  const navigate = useNavigate();
  const { splitState, setSplitState } = useSplit();

  const [restaurant, setRestaurant] = useState(splitState.restaurant || '');
  const [taxPercent, setTaxPercent] = useState(splitState.taxPercent || 8.875);
  const [tipPercent, setTipPercent] = useState(splitState.tipPercent || 20);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Handle updates to splitState totals when items, tax or tip percentages change
  useEffect(() => {
    const subtotal = splitState.items.reduce((sum, item) => sum + item.price, 0);
    const taxAmount = round2(subtotal * (taxPercent / 100));
    const tipAmount = round2(subtotal * (tipPercent / 100));
    const total = round2(subtotal + taxAmount + tipAmount);

    setSplitState(prev => ({
      ...prev,
      restaurant,
      taxPercent,
      tipPercent,
      subtotal,
      taxAmount,
      tipAmount,
      total
    }));
  }, [splitState.items, restaurant, taxPercent, tipPercent, setSplitState]);

  const handleAddItem = (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    const name = newItemName.trim();
    const priceRaw = parseFloat(newItemPrice);

    if (!name || isNaN(priceRaw) || priceRaw <= 0) return;

    const newItem = {
      id: `i_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name,
      price: round2(priceRaw),
      assignedTo: []
    };

    setSplitState(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveItem = (id) => {
    setSplitState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleUpdateItemName = (id, newName) => {
    setSplitState(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, name: newName.trim() } : item)
    }));
  };

  const handleUpdateItemPrice = (id, newPrice) => {
    const parsed = parseFloat(newPrice) || 0;
    setSplitState(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, price: round2(parsed) } : item)
    }));
  };

  return (
    <div id="screen-editItems" className="screen-container active">
      <div className="flex flex-col gap-6">
        <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-4">
          <h2 className="text-xl font-normal tracking-tight font-serif mb-1">Receipt details</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-15">
              <label htmlFor="split-restaurant-name" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Restaurant / Spot Name</label>
              <input
                id="split-restaurant-name"
                type="text"
                placeholder="e.g. Olive Garden"
                className="w-full bg-secondary text-sm px-4 py-25 rounded-md focus:ring-1 focus:ring-accent"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-15">
                <label htmlFor="tax-percent-input" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Tax (%)</label>
                <input
                  id="tax-percent-input"
                  type="number"
                  step="0.001"
                  className="w-full bg-secondary text-sm px-4 py-25 rounded-md focus:ring-1 focus:ring-accent font-mono"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex flex-col gap-15">
                <label htmlFor="tip-percent-input" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Tip (%)</label>
                <input
                  id="tip-percent-input"
                  type="number"
                  step="1"
                  className="w-full bg-secondary text-sm px-4 py-25 rounded-md focus:ring-1 focus:ring-accent font-mono"
                  value={tipPercent}
                  onChange={(e) => setTipPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 bg-secondary/50 border-b border-border flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Line items</h3>
          </div>

          <div id="ocr-items-list" className="divide-y divide-border/60">
            {splitState.items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[1fr_7rem_2rem] items-center px-4 py-3 group">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdateItemName(item.id, e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none min-w-0 w-full font-medium"
                />
                <div className="flex items-center justify-end gap-05">
                  <span className="text-xs text-muted-foreground font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.price}
                    onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                    className="bg-transparent text-sm text-right focus:outline-none w-16 font-mono"
                  />
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex justify-end"
                  aria-label={`Delete item ${item.name}`}
                >
                  <svg className="w-35 h-35" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
            {splitState.items.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">
                No items added yet. Add one below.
              </div>
            )}
          </div>

          <div className="px-4 py-3 bg-secondary/20 border-t border-border grid grid-cols-[1fr_7rem_2rem] gap-2 items-center">
            <input
              id="new-item-name"
              type="text"
              placeholder="Add item name"
              className="bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/40 font-medium"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleAddItem}
            />
            <div className="flex items-center justify-end gap-05">
              <span className="text-xs text-muted-foreground font-mono">$</span>
              <input
                id="new-item-price"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="bg-transparent text-sm text-right focus:outline-none w-16 font-mono placeholder:text-muted-foreground/40"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                onKeyDown={handleAddItem}
              />
            </div>
            <button
              onClick={() => handleAddItem()}
              className="text-accent hover:text-accent/80 transition-colors flex justify-end"
              id="add-item-row-btn"
              aria-label="Add item"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-25 text-sm font-medium">
          <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider">
            <span>Subtotal</span>
            <span className="font-semibold text-foreground" id="receipt-subtotal-display">{formatCurrency(splitState.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider">
            <span id="receipt-tax-label">Tax ({taxPercent.toFixed(3)}%)</span>
            <span className="font-semibold text-foreground" id="receipt-tax-display">{formatCurrency(splitState.taxAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground text-xs font-mono uppercase tracking-wider">
            <span id="receipt-tip-label">Tip ({tipPercent}%)</span>
            <span className="font-semibold text-foreground" id="receipt-tip-display">{formatCurrency(splitState.tipAmount)}</span>
          </div>
          <div className="h-px bg-border my-1"></div>
          <div className="flex justify-between items-end">
            <span className="font-serif text-base">Total</span>
            <span className="text-xl font-bold font-mono" id="receipt-total-display">{formatCurrency(splitState.total)}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/people')}
          disabled={splitState.items.length === 0}
          className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          id="editItems-next-btn"
        >
          Next: Add People
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
