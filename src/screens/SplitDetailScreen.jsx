import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store } from '../lib/store';
import { formatCurrency, getInitials } from '../lib/utils';

export default function SplitDetailScreen() {
  const navigate = useNavigate();
  const { id: splitId } = useParams();
  const [split, setSplit] = useState(null);

  useEffect(() => {
    loadSplit();
  }, [splitId]);

  const loadSplit = () => {
    const data = store.getSplitById(splitId);
    if (!data) {
      navigate('/home');
      return;
    }
    setSplit(data);
  };

  const handleTogglePaid = async (personId) => {
    const updated = await store.markPaid(splitId, personId);
    if (updated) {
      setSplit({ ...updated });
    }
  };

  const handleDeleteSplit = () => {
    if (confirm('Are you sure you want to delete this historical split record permanently?')) {
      store.deleteSplit(splitId);
      navigate('/home');
    }
  };

  if (!split) return null;

  return (
    <div id="screen-splitDetail" className="screen-container active">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-normal tracking-tight font-serif" id="splitDetail-restaurant">
          {split.restaurant || 'Dinner Split'}
        </h2>
        <button
          onClick={() => navigate('/home')}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          id="splitDetail-back-btn"
          aria-label="Go back to Home"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted-foreground font-mono uppercase tracking-wider">
            <span>Date</span>
            <span className="font-semibold text-foreground" id="splitDetail-date">{split.date || 'Unknown Date'}</span>
          </div>
          <div className="h-px bg-border my-1"></div>
          <div className="flex justify-between items-end">
            <span className="font-serif text-base">Total Check</span>
            <span className="text-xl font-bold font-mono" id="splitDetail-total">{formatCurrency(split.total)}</span>
          </div>
        </div>

        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 bg-secondary/50 border-b border-border">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Participants</h3>
          </div>

          <div id="splitDetail-people-list" className="divide-y divide-border/60">
            {split.people.map(p => {
              const isPaid = split.paid && split.paid.includes(p.contactId);
              return (
                <div key={p.contactId} className="px-4 py-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{
                        backgroundColor: p.color || '#4A6741',
                        opacity: isPaid ? '0.5' : '1'
                      }}
                    >
                      {getInitials(p.name)}
                    </div>
                    <div>
                      <span className={`text-sm font-semibold block ${isPaid ? 'line-through text-muted-foreground' : ''}`}>
                        {p.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono block">
                        {formatCurrency(p.total)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePaid(p.contactId)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      isPaid
                        ? 'bg-accent-10 text-accent border-accent-25'
                        : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {isPaid ? 'Paid' : 'Mark Paid'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleDeleteSplit}
          className="w-full border border-destructive/20 text-destructive hover:bg-destructive/5 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          id="splitDetail-delete-btn"
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Delete Record
        </button>
      </div>
    </div>
  );
}
