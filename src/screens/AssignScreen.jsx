import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSplit } from '../context/SplitContext';
import { getInitials } from '../lib/utils';

export default function AssignScreen() {
  const navigate = useNavigate();
  const { splitState, setSplitState } = useSplit();

  const handleToggleAssignee = (itemId, contactId) => {
    setSplitState(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        const currentAssigned = item.assignedTo || [];
        const isAssigned = currentAssigned.includes(contactId);
        return {
          ...item,
          assignedTo: isAssigned
            ? currentAssigned.filter(id => id !== contactId)
            : [...currentAssigned, contactId]
        };
      })
    }));
  };

  const handleAssignAll = (itemId) => {
    setSplitState(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          assignedTo: prev.people.map(p => p.contactId)
        };
      })
    }));
  };

  const unassignedCount = splitState.items.filter(item => !item.assignedTo || item.assignedTo.length === 0).length;

  return (
    <div id="screen-assign" className="screen-container active">
      <h2 className="text-2xl font-normal mb-1 tracking-tight font-serif">Assign items</h2>
      <p className="text-sm text-muted-foreground mb-6">Tap participants to allocate line item splits accordingly.</p>

      {/* Alert Banner for unassigned items */}
      {unassignedCount > 0 && (
        <div id="unassigned-items-alert" className="mb-4 flex items-center gap-2 px-4 py-3 border border-dashed border-accent-25 bg-accent-10 rounded-xl text-xs font-medium text-accent">
          <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span id="unassigned-items-text">{unassignedCount} item{unassignedCount !== 1 ? 's' : ''} unassigned</span>
        </div>
      )}

      <div id="assign-items-list" className="flex flex-col gap-4 mb-6">
        {splitState.items.map(item => {
          const assigneesCount = item.assignedTo ? item.assignedTo.length : 0;
          return (
            <div key={item.id} className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-60 bg-muted-30">
                <span className="text-sm font-semibold">{item.name}</span>
                <div className="flex items-center gap-3">
                  {assigneesCount < splitState.people.length && splitState.people.length > 1 && (
                    <button
                      onClick={() => handleAssignAll(item.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-widest"
                    >
                      all
                    </button>
                  )}
                  <span className="text-sm font-semibold font-mono">${item.price.toFixed(2)}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex flex-wrap gap-2">
                {splitState.people.map(person => {
                  const isAssigned = item.assignedTo && item.assignedTo.includes(person.contactId);
                  const splitCount = item.assignedTo ? item.assignedTo.length : 0;
                  const perPersonShare = isAssigned && splitCount > 0 ? (item.price / splitCount).toFixed(2) : null;

                  return (
                    <button
                      key={person.contactId}
                      onClick={() => handleToggleAssignee(item.id, person.contactId)}
                      className={`flex items-center gap-1.5 pl-2 pr-25 py-15 rounded-full text-xs font-medium border transition-colors select-none ${
                        isAssigned
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-transparent border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                      }`}
                      style={{
                        backgroundColor: isAssigned ? (person.color || '#4A6741') : 'transparent'
                      }}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isAssigned ? 'bg-white/20 text-white' : 'bg-muted'
                        }`}
                        style={{ color: isAssigned ? 'white' : (person.color || '#4A6741') }}
                      >
                        {isAssigned ? (
                          <svg className="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                        ) : (
                          getInitials(person.name)[0]
                        )}
                      </div>
                      <span>{person.name}</span>
                      {perPersonShare && splitCount > 1 && (
                        <span className="opacity-65 ml-05 font-mono">${perPersonShare}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/people')}
          className="w-full border border-border py-35 rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
          id="assign-back-btn"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          People
        </button>

        <button
          onClick={() => navigate('/summary')}
          className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          id="assign-next-btn"
        >
          View Summary
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
