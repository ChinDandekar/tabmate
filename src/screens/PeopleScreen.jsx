import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSplit } from '../context/SplitContext';
import { store } from '../lib/store';
import { getInitials, generateColor } from '../lib/utils';

export default function PeopleScreen() {
  const navigate = useNavigate();
  const { splitState, setSplitState } = useSplit();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [frequentContacts, setFrequentContacts] = useState([]);

  useEffect(() => {
    async function init() {
      const contacts = await store.getContactsSortedByFrequency();
      setFrequentContacts(contacts);

      const settings = await store.getSettings();
      const ownerName = (settings.name || '').trim();
      if (ownerName) {
        const already = splitState.people.some(
          p => p.contactId === 'me_owner' || p.name.toLowerCase() === ownerName.toLowerCase()
        );
        if (!already) {
          setSplitState(prev => ({
            ...prev,
            people: [
              {
                contactId: 'me_owner',
                name: ownerName,
                phone: '',
                color: generateColor(ownerName, 0),
                isOwner: true
              },
              ...prev.people
            ]
          }));
        }
      }
    }
    init();
  }, []);

  const handleAddPerson = (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) return;

    if (splitState.people.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert(`${trimmedName} is already added to this split.`);
      return;
    }

    const newPerson = {
      contactId: `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: trimmedName,
      phone: trimmedPhone || '',
      color: generateColor(trimmedName, splitState.people.length)
    };

    setSplitState(prev => ({
      ...prev,
      people: [...prev.people, newPerson]
    }));

    setName('');
    setPhone('');
  };

  const handleRemovePerson = (contactId) => {
    setSplitState(prev => ({
      ...prev,
      people: prev.people.filter(p => p.contactId !== contactId),
      items: prev.items.map(item => ({
        ...item,
        assignedTo: item.assignedTo ? item.assignedTo.filter(id => id !== contactId) : []
      }))
    }));
  };

  const handleToggleFrequentPerson = (contact) => {
    const isSelected = splitState.people.some(p => p.name.toLowerCase() === contact.name.toLowerCase());
    if (isSelected) {
      const target = splitState.people.find(p => p.name.toLowerCase() === contact.name.toLowerCase());
      if (target) {
        handleRemovePerson(target.contactId);
      }
    } else {
      setSplitState(prev => ({
        ...prev,
        people: [
          ...prev.people,
          {
            contactId: contact.id,
            name: contact.name,
            phone: contact.phone || '',
            color: contact.color
          }
        ]
      }));
    }
  };

  const handleNext = async () => {
    // Save participants to database if they don't exist
    for (const p of splitState.people) {
      const contacts = await store.getContacts();
      const exists = contacts.some(c => c.name.toLowerCase() === p.name.toLowerCase());
      if (!exists) {
        await store.saveContact({
          name: p.name,
          phone: p.phone,
          color: p.color
        });
      }
    }
    navigate('/assign');
  };

  return (
    <div id="screen-people" className="screen-container active">
      <h2 className="text-2xl font-normal mb-1 tracking-tight font-serif">Add people</h2>
      <p className="text-sm text-muted-foreground mb-6">Choose who is sharing the dining check with you.</p>

      <div className="flex flex-col gap-6">
        <div className="border border-border rounded-xl p-4 bg-card flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 items-end">
            <div className="flex flex-col gap-15">
              <label htmlFor="inline-person-name" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Name</label>
              <input
                id="inline-person-name"
                type="text"
                placeholder="Name"
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md focus:ring-1 focus:ring-accent"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleAddPerson}
              />
            </div>
            <div className="flex flex-col gap-15">
              <label htmlFor="inline-person-phone" className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">Mobile Number</label>
              <input
                id="inline-person-phone"
                type="tel"
                placeholder="Mobile"
                className="w-full bg-secondary text-sm px-3 py-2 rounded-md focus:ring-1 focus:ring-accent"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={handleAddPerson}
              />
            </div>
          </div>
          <button
            onClick={() => handleAddPerson()}
            className="w-full mt-2 bg-primary text-primary-foreground py-25 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            id="inline-add-person-btn"
          >
            Add to Split
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Frequent crew</h3>
          <div id="frequent-contacts-picker" className="flex flex-wrap gap-2 py-1">
            {frequentContacts.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No saved contacts yet. They will save automatically.</span>
            ) : (
              frequentContacts.map(contact => {
                const isSelected = splitState.people.some(p => p.name.toLowerCase() === contact.name.toLowerCase());
                return (
                  <button
                    key={contact.id}
                    onClick={() => handleToggleFrequentPerson(contact)}
                    className={`flex items-center gap-1.5 pl-2 pr-25 py-15 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-transparent border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                    }`}
                    style={{
                      backgroundColor: isSelected ? (contact.color || '#4A6741') : 'transparent'
                    }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-muted'
                      }`}
                      style={{ color: isSelected ? 'white' : (contact.color || '#4A6741') }}
                    >
                      {isSelected ? (
                        <svg className="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      ) : (
                        getInitials(contact.name)[0]
                      )}
                    </div>
                    <span>{contact.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div id="contacts-empty-view" className="text-center py-10 text-muted-foreground border border-dashed rounded-xl" style={{ display: splitState.people.length === 0 ? 'block' : 'none' }}>
            <p className="text-xs font-medium">No one added to this split yet.</p>
          </div>

          <div id="split-people-list" className="flex flex-col gap-3">
            {splitState.people.map(p => (
              <div key={p.contactId} className="flex items-center justify-between border border-border rounded-xl px-4 py-3 bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: p.color || '#4A6741' }}
                  >
                    {getInitials(p.name)}
                  </div>
                  <div>
                    <span className="text-sm font-medium block">
                      {p.name}
                      {(p.isOwner || p.contactId === 'me_owner') && (
                        <span className="text-[10px] text-accent font-semibold ml-1">(Me)</span>
                      )}
                    </span>
                    {p.phone && (
                      <span className="text-[10px] text-muted-foreground font-mono block">{p.phone}</span>
                    )}
                  </div>
                </div>

                {p.isOwner || p.contactId === 'me_owner' ? (
                  <span className="text-muted-foreground text-xs select-none" title="You are always included in splits">
                    <svg className="w-35 h-35" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                ) : (
                  <button
                    onClick={() => handleRemovePerson(p.contactId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${p.name} from split`}
                  >
                    <svg className="w-35 h-35" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => navigate('/items')}
            className="w-full border border-border py-35 rounded-xl text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
            id="people-back-btn"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
            Receipt
          </button>

          <button
            onClick={handleNext}
            disabled={splitState.people.length === 0}
            className="w-full bg-primary text-primary-foreground py-35 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            id="people-next-btn"
          >
            Assign Items
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
