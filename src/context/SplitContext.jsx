import React, { createContext, useContext, useState } from 'react';

const SplitContext = createContext(null);

export function SplitProvider({ children }) {
  const [splitState, setSplitState] = useState({
    restaurant: '',
    items: [],
    people: [],
    taxPercent: 8.875,
    tipPercent: 20,
    subtotal: 0,
    taxAmount: 0,
    tipAmount: 0,
    total: 0
  });

  const resetSplit = () => {
    setSplitState({
      restaurant: '',
      items: [],
      people: [],
      taxPercent: 8.875,
      tipPercent: 20,
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      total: 0
    });
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
