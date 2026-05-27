import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSplit } from '../context/SplitContext';
import { store } from '../lib/store';
import { round2, fixRoundingDrift, formatCurrency, getInitials } from '../lib/utils';

export default function SummaryScreen() {
  const navigate = useNavigate();
  const { splitState } = useSplit();
  const [computedPeople, setComputedPeople] = useState([]);
  const [sentContacts, setSentContacts] = useState(new Set());

  useEffect(() => {
    calculatePortions();
  }, [splitState]);

  const calculatePortions = () => {
    const items = splitState.items;
    const people = splitState.people;
    const taxAmount = splitState.taxAmount || 0;
    const tipAmount = splitState.tipAmount || 0;

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
    const personList = Object.values(personTotals);
    fixRoundingDrift(personList, 'itemSubtotal', expectedSubtotal);

    const grandItemSubtotal = personList.reduce((sum, p) => sum + p.itemSubtotal, 0);

    // 5. Distribute tax proportionally
    if (grandItemSubtotal > 0 && taxAmount > 0) {
      people.forEach(p => {
        const pt = personTotals[p.contactId];
        const proportion = pt.itemSubtotal / grandItemSubtotal;
        pt.taxShare = round2(taxAmount * proportion);
      });
      fixRoundingDrift(personList, 'taxShare', taxAmount);
    }

    // 6. Distribute tip proportionally
    if (grandItemSubtotal > 0 && tipAmount > 0) {
      people.forEach(p => {
        const pt = personTotals[p.contactId];
        const proportion = pt.itemSubtotal / grandItemSubtotal;
        pt.tipShare = round2(tipAmount * proportion);
      });
      fixRoundingDrift(personList, 'tipShare', tipAmount);
    }

    // 7. Compute final personal totals
    people.forEach(p => {
      const pt = personTotals[p.contactId];
      pt.total = round2(pt.itemSubtotal + pt.taxShare + pt.tipShare);
    });

    setComputedPeople(personList);
  };

  const handleSendImsMessage = (person) => {
    const settings = store.getSettings();
    const rest = splitState.restaurant || 'dinner';

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

    setSentContacts(prev => {
      const updated = new Set(prev);
      updated.add(person.contactId);
      return updated;
    });

    const encoded = encodeURIComponent(body);
    window.location.href = `sms:${person.phone}&body=${encoded}`;
  };

  const handleCompleteSplit = () => {
    // Save to store
    store.saveSplit({
      restaurant: splitState.restaurant || 'Dinner Split',
      total: splitState.total,
      people: computedPeople.map(p => ({
        contactId: p.contactId,
        name: p.name,
        phone: p.phone,
        color: p.color,
        total: p.total
      })),
      paid: [],
      items: splitState.items,
      taxPercent: splitState.taxPercent,
      tipPercent: splitState.tipPercent
    });

    // Bump frequent counts
    computedPeople.forEach(p => {
      const match = store.getContacts().find(c => c.name.toLowerCase() === p.name.toLowerCase());
      if (match) {
        store.bumpContactSplitCount(match.id);
      }
    });

    navigate('/home');
  };

  const unassignedItems = splitState.items.filter(item => !item.assignedTo || item.assignedTo.length === 0);

  return (
    <div id="screen-summary" className="screen-container active">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-normal mb-1 tracking-tight font-serif">Split summary</h2>
        <span className="text-xl font-bold font-mono" id="summary-total-amount">{formatCurrency(splitState.total)}</span>
      </div>

      {unassignedItems.length > 0 && (
        <div id="summary-unassigned-card" className="border border-dashed border-destructive/30 rounded-xl p-4 bg-destructive/5 mb-6">
          <h3 className="text-xs font-mono uppercase tracking-widest text-destructive mb-2 font-bold flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Unassigned items warning
          </h3>
          <div id="summary-unassigned-items-list" className="space-y-1">
            {unassignedItems.map(item => (
              <div key={item.id} className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground font-mono">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="summary-people-breakdowns" className="flex flex-col gap-4 mb-6">
        {computedPeople.map(pt => {
          const isOwner = pt.contactId === 'me_owner';
          const isSent = sentContacts.has(pt.contactId);

          return (
            <div
              key={pt.contactId}
              className="border border-border rounded-xl overflow-hidden bg-card transition-all"
              style={{ borderLeft: `3.5px solid ${pt.color || '#4A6741'}` }}
            >
              <div className="flex items-center justify-between px-4 py-35 border-b border-border-60">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: pt.color || '#4A6741' }}
                  >
                    {getInitials(pt.name)}
                  </div>
                  <span className="font-semibold text-sm">
                    {pt.name}
                    {isOwner && (
                      <span className="text-[10px] text-accent font-semibold ml-1">(Me)</span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-medium leading-none font-mono">{formatCurrency(pt.total)}</div>
                  {pt.items.length > 0 && (splitState.taxAmount + splitState.tipAmount) > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-05 font-mono">
                      {formatCurrency(pt.itemSubtotal)} + fees
                    </div>
                  )}
                </div>
              </div>

              <div className="px-4 py-25 space-y-15">
                {pt.items.length > 0 ? (
                  pt.items.map((item, i) => {
                    const itemSubtotalSum = computedPeople.reduce((sum, p) => sum + p.itemSubtotal, 0);
                    const mult = itemSubtotalSum > 0 ? splitState.total / itemSubtotalSum : 1;
                    return (
                      <div key={i} className="flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground">
                          {item.name}
                          {item.sharedWith > 1 && (
                            <span className="ml-1 opacity-50 font-mono text-[10px]">÷{item.sharedWith}</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground ml-3 shrink-0 font-mono">
                          {formatCurrency(item.yourShare * mult)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground italic">No items assigned</div>
                )}
              </div>

              <div className="px-4 pb-35 pt-2 border-t border-border-60">
                {isOwner ? (
                  <div className="text-center">
                    <span className="text-xs text-accent font-semibold">Your share</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSendImsMessage(pt)}
                    className={`w-full py-25 rounded-lg text-xs font-semibold flex items-center justify-center gap-15 transition-colors ${
                      isSent
                        ? 'bg-accent-10 text-accent border border-accent-25'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    {isSent ? (
                      <>
                        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                        Sent to {pt.name}!
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
                        </svg>
                        Send to {pt.name}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/assign')}
          className="w-full border border-border py-35 rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
          id="summary-back-btn"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          Assign
        </button>

        <button
          onClick={handleCompleteSplit}
          className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          id="summary-done-btn"
        >
          Done & Save
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
