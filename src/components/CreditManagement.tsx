
import React, { useState, useEffect } from 'react';
import { Transaction, Contact } from '../types';

interface CreditManagementProps {
  transactions: Transaction[];
  contacts: Contact[];
  onAddContact: (name: string, phone?: string, email?: string, note?: string) => Contact;
  onUpdateContact: (id: string, updates: Partial<Contact>) => void;
  onDelete: (id: string) => void;
  currencySymbol?: string;
}

const CreditManagement: React.FC<CreditManagementProps> = ({ 
  transactions, 
  contacts, 
  onAddContact, 
  onUpdateContact,
  onDelete,
  currencySymbol = '$'
}) => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', note: '' });
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<Contact>>({});

  const debtRelatedTxs = transactions.filter(t => 
    ['credit_receivable', 'credit_payable', 'loan_receivable', 'loan_payable', 'payment_received', 'payment_made'].includes(t.type) || t.contact || t.contactId
  );

  const contactData = React.useMemo(() => {
    const map: Record<string, { 
      receivable: number; // They owe me
      payable: number;    // I owe them
      txs: Transaction[] 
    }> = {};
    
    contacts.forEach(c => {
      map[c.id] = { receivable: 0, payable: 0, txs: [] };
    });

    debtRelatedTxs.forEach(t => {
      const targetId = t.contactId || contacts.find(c => c.name.toLowerCase() === t.contact?.toLowerCase())?.id;
      
      if (!targetId) return;
      if (!map[targetId]) map[targetId] = { receivable: 0, payable: 0, txs: [] };
      
      const remaining = t.remainingAmount ?? t.amount;
      switch(t.type) {
        case 'credit_receivable': map[targetId].receivable += remaining; break;
        case 'loan_receivable': map[targetId].receivable += remaining; break;
        case 'credit_payable': map[targetId].payable += remaining; break;
        case 'loan_payable': map[targetId].payable += remaining; break;
      }
      map[targetId].txs.push(t);
    });
    return map;
  }, [debtRelatedTxs, contacts]);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContact.name.trim()) {
      onAddContact(newContact.name.trim(), newContact.phone.trim(), newContact.email.trim(), newContact.note.trim());
      setNewContact({ name: '', phone: '', email: '', note: '' });
      setShowAddContact(false);
    }
  };

  const startEditing = (contact: Contact) => {
    setEditValues({ ...contact });
    setIsEditing(true);
  };

  const saveContactChanges = () => {
    if (selectedContactId && editValues.name?.trim()) {
      onUpdateContact(selectedContactId, editValues);
      setIsEditing(false);
    }
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    const totalA = (contactData[a.id]?.receivable || 0) + (contactData[a.id]?.payable || 0);
    const totalB = (contactData[b.id]?.receivable || 0) + (contactData[b.id]?.payable || 0);
    return totalB - totalA;
  });

  if (selectedContactId) {
    const contact = contacts.find(c => c.id === selectedContactId);
    const data = contactData[selectedContactId] || { receivable: 0, payable: 0, txs: [] };
    const netPosition = data.receivable - data.payable;

    if (!contact) {
      setSelectedContactId(null);
      return null;
    }

    return (
      <div className="space-y-6 pb-24 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => { setSelectedContactId(null); setIsEditing(false); }}
            className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest"
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button 
            onClick={() => isEditing ? saveContactChanges() : startEditing(contact)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${isEditing ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xl uppercase shadow-inner shrink-0">
              {contact.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input 
                  className="w-full text-xl font-black text-slate-900 border-b-2 border-indigo-100 outline-none mb-1"
                  value={editValues.name || ''}
                  onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                />
              ) : (
                <h3 className="text-xl font-black text-slate-900 truncate">{contact.name}</h3>
              )}
              <div className="flex gap-4 mt-2">
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Phone</span>
                  {isEditing ? (
                    <input 
                      className="text-[10px] font-black text-slate-600 border-b border-indigo-50 outline-none"
                      value={editValues.phone || ''}
                      onChange={e => setEditValues({ ...editValues, phone: e.target.value })}
                    />
                  ) : (
                    <span className="text-[10px] font-black text-slate-600">{contact.phone || 'N/A'}</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Email</span>
                  {isEditing ? (
                    <input 
                      className="text-[10px] font-black text-slate-600 border-b border-indigo-50 outline-none"
                      value={editValues.email || ''}
                      onChange={e => setEditValues({ ...editValues, email: e.target.value })}
                    />
                  ) : (
                    <span className="text-[10px] font-black text-slate-600 truncate max-w-[120px]">{contact.email || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Notes</span>
            {isEditing ? (
              <textarea 
                className="w-full bg-transparent text-[10px] font-bold text-slate-600 outline-none min-h-[60px]"
                value={editValues.note || ''}
                onChange={e => setEditValues({ ...editValues, note: e.target.value })}
                placeholder="Write context about this contact..."
              />
            ) : (
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                {contact.note || 'No notes added.'}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 rounded-3xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-[7px] font-black uppercase text-emerald-600 block mb-1">They Owe Me</span>
                <span className="text-sm font-black text-emerald-700">{currencySymbol}{data.receivable.toLocaleString()}</span>
             </div>
             <div className="p-4 rounded-3xl bg-rose-50/50 border border-rose-100">
                <span className="text-[7px] font-black uppercase text-rose-600 block mb-1">I Owe Them</span>
                <span className="text-sm font-black text-rose-700">{currencySymbol}{data.payable.toLocaleString()}</span>
             </div>
          </div>

          <div className={`p-5 rounded-3xl transition-colors duration-500 ${netPosition >= 0 ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-70">Net Settlement Position</span>
                <div className="text-2xl font-black leading-tight">
                  {currencySymbol}{Math.abs(netPosition).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[7px] font-black uppercase block opacity-70">Result</span>
                <span className="text-[10px] font-black uppercase">{netPosition >= 0 ? 'Receivable' : 'Payable'}</span>
              </div>
            </div>
          </div>
        </div>

        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Statement History</h4>
          </div>
          <div className="space-y-3">
            {data.txs.length === 0 ? (
              <p className="text-center py-10 text-[10px] font-black text-slate-300 uppercase">No history found</p>
            ) : (
              data.txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                <div key={tx.id} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] ${['credit_receivable', 'loan_receivable'].includes(tx.type) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <i className={`fas ${['credit_receivable', 'loan_receivable'].includes(tx.type) ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">{tx.description}</div>
                      <div className="text-[8px] font-bold text-slate-300 uppercase mt-0.5 tracking-wider">
                        {tx.type.replace('_', ' ')} • {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{currencySymbol}{tx.amount.toLocaleString()}</div>
                    {tx.dueDate && <div className="text-[6px] font-black text-rose-400 uppercase">Due {new Date(tx.dueDate).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <section>
        <div className="flex justify-between items-center px-1 mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contacts</h3>
          <button 
            onClick={() => setShowAddContact(!showAddContact)}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100"
          >
            <i className={`fas ${showAddContact ? 'fa-times' : 'fa-plus'} text-[10px]`}></i>
          </button>
        </div>

        {showAddContact && (
          <form onSubmit={handleAddContact} className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm mb-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
            <h4 className="text-[10px] font-black uppercase text-indigo-600">New Profile</h4>
            <div className="space-y-3">
              <input 
                autoFocus
                type="text" 
                placeholder="Full Name / Entity Name" 
                className="w-full p-3 bg-slate-50 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-indigo-100"
                value={newContact.name}
                onChange={e => setNewContact({...newContact, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  className="w-full p-3 bg-slate-50 rounded-2xl text-[10px] font-bold outline-none"
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                />
                <input 
                  type="email" 
                  placeholder="Email" 
                  className="w-full p-3 bg-slate-50 rounded-2xl text-[10px] font-bold outline-none"
                  value={newContact.email}
                  onChange={e => setNewContact({...newContact, email: e.target.value})}
                />
              </div>
              <textarea 
                placeholder="Notes (optional)" 
                className="w-full p-3 bg-slate-50 rounded-2xl text-[10px] font-bold outline-none min-h-[60px]"
                value={newContact.note}
                onChange={e => setNewContact({...newContact, note: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-50">Create Record</button>
          </form>
        )}

        <div className="space-y-3">
          {sortedContacts.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Your directory is empty.</div>
            </div>
          ) : (
            sortedContacts.map((contact) => {
              const data = contactData[contact.id] || { receivable: 0, payable: 0, txs: [] };
              return (
                <div 
                  key={contact.id} 
                  onClick={() => setSelectedContactId(contact.id)}
                  className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-all cursor-pointer group hover:border-indigo-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs uppercase group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{contact.name}</div>
                        <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                          {data.txs.length} entries in history
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-[9px] font-black ${data.receivable > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>R: {currencySymbol}{data.receivable}</span>
                        <span className={`text-[9px] font-black ${data.payable > 0 ? 'text-rose-500' : 'text-slate-300'}`}>P: {currencySymbol}{data.payable}</span>
                      </div>
                      <div className="text-[7px] font-black text-slate-400 uppercase mt-1">Net: {currencySymbol}{data.receivable - data.payable}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default CreditManagement;
