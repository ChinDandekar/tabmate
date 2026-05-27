import React from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../lib/store';
import { getInitials, formatCurrency } from '../lib/utils';

export default function HomeScreen() {
  const navigate = useNavigate();
  const splits = store.getSplits();

  const handleStartNewSplit = () => {
    navigate('/scan');
  };

  return (
    <div id="screen-home" className="screen-container active">
      <div className="mb-7 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-normal mb-1 tracking-tight font-serif">Welcome back</h2>
          <p className="text-sm text-muted-foreground">Select a split or start a new dining check.</p>
        </div>
      </div>

      <div className="border border-border rounded-xl p-4 bg-card mb-6 flex flex-col gap-3">
        <button
          onClick={handleStartNewSplit}
          className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="M12 5v14"/>
          </svg>
          Start New Split
        </button>
      </div>

      <div className="flex flex-col gap-3" id="splits-history-list">
        {splits.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
            <svg className="w-9 h-9 mx-auto mb-3 opacity-25" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <p className="text-sm font-medium mb-1 font-serif">No splits recorded yet</p>
            <p className="text-xs">Tap "Start New Split" to divide a dining check.</p>
          </div>
        ) : (
          splits.map((split) => {
            const count = split.people ? split.people.length : 0;
            return (
              <button
                key={split.id}
                onClick={() => navigate(`/split/${split.id}`)}
                className="w-full text-left border rounded-xl p-4 bg-card hover:bg-muted transition-colors flex justify-between items-center"
                aria-label={`View details for split at ${split.restaurant || 'Unnamed Split'} on ${split.date}`}
              >
                <div>
                  <h4 className="text-sm font-semibold mb-05 font-serif">{split.restaurant || 'Unnamed Split'}</h4>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{split.date}</span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground opacity-40"></span>
                    <span>{`${count} participant${count !== 1 ? 's' : ''}`}</span>
                  </div>
                  <div className="flex gap-1 mt-3">
                    {split.people && split.people.slice(0, 5).map((person) => {
                      const isPaid = split.paid && split.paid.includes(person.contactId);
                      return (
                        <div
                          key={person.contactId}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                          style={{
                            backgroundColor: person.color || '#4A6741',
                            opacity: isPaid ? '0.5' : '1',
                            boxShadow: isPaid ? 'inset 0 0 0 1px rgba(255,255,255,0.4)' : ''
                          }}
                        >
                          {getInitials(person.name)}
                        </div>
                      );
                    })}
                    {split.people && split.people.length > 5 && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold bg-secondary text-muted-foreground border">
                        +{split.people.length - 5}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-base font-semibold font-mono">{formatCurrency(split.total)}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono uppercase tracking-widest">
                    view <svg className="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
