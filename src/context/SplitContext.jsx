import React, { createContext, useContext, useState, useEffect } from 'react';
import { store } from '../lib/store';

const SplitContext = createContext(null);

const DEFAULT_SPLIT_STATE = {
  restaurant: '',
  items: [],
  people: [],
  taxPercent: 8.875,
  tipPercent: 20,
  subtotal: 0,
  taxAmount: 0,
  tipAmount: 0,
  total: 0
};

export function SplitProvider({ children }) {
  const [splitState, setSplitState] = useState(DEFAULT_SPLIT_STATE);

  useEffect(() => {
    const hasMeaningfulData = Boolean(
      splitState.restaurant ||
      splitState.items.length ||
      splitState.people.length ||
      splitState.subtotal ||
      splitState.total
    );

    if (!hasMeaningfulData) return;
    store.saveSplitState(splitState);
  }, [splitState]);

  const resetSplit = () => {
    setSplitState(DEFAULT_SPLIT_STATE);
  };

  return (
    <SplitContext.Provider value={{ splitState, setSplitState, resetSplit }}>
      {children}
    </SplitContext.Provider>
  );
}

export function useSplit() {
  const context = useContext(SplitContext);
  if (!context) {
    throw new Error('useSplit must be used within a SplitProvider');
  }
  return context;
}
