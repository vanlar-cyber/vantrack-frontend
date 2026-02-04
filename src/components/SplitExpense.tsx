import React, { useState } from 'react';
import { Contact } from '../types';

interface SplitExpenseProps {
  contacts: Contact[];
  currencySymbol: string;
  onCreateSplit: (data: {
    description: string;
    totalAmount: number;
    splits: { contactId: string; contactName: string; amount: number; paid: boolean }[];
    paidBy: 'me' | string;
  }) => void;
  onClose: () => void;
}

const SplitExpense: React.FC<SplitExpenseProps> = ({ contacts, currencySymbol, onCreateSplit, onClose }) => {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [paidBy, setPaidBy] = useState<'me' | string>('me');
  const [includeMe, setIncludeMe] = useState(true);

  const total = parseFloat(totalAmount) || 0;
  const participantCount = selectedContacts.length + (includeMe ? 1 : 0);
  const equalShare = participantCount > 0 ? total / participantCount : 0;

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!description || total <= 0 || selectedContacts.length === 0) return;

    const splits = selectedContacts.map(contactId => {
      const contact = contacts.find(c => c.id === contactId);
      const amount = splitType === 'equal' 
        ? equalShare 
        : parseFloat(customAmounts[contactId] || '0');
      
      return {
        contactId,
        contactName: contact?.name || 'Unknown',
        amount,
        paid: contactId === paidBy,
      };
    });

    onCreateSplit({
      description,
      totalAmount: total,
      splits,
      paidBy,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Split Expense</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <i className="fas fa-times text-slate-400 text-sm"></i>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Description */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">What's this for?</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at restaurant"
              className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 pl-8 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Who Paid */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Who paid?</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPaidBy('me')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${
                  paidBy === 'me' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                I paid
              </button>
              {selectedContacts.map(id => {
                const contact = contacts.find(c => c.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => setPaidBy(id)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${
                      paidBy === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {contact?.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split With */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Split with</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                    selectedContacts.includes(contact.id) 
                      ? 'bg-indigo-50 border-2 border-indigo-200' 
                      : 'bg-slate-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                      selectedContacts.includes(contact.id) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{contact.name}</span>
                  </div>
                  {selectedContacts.includes(contact.id) && (
                    <i className="fas fa-check text-indigo-600"></i>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Include Me Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-sm font-bold text-slate-700">Include myself in split</span>
            <button
              onClick={() => setIncludeMe(!includeMe)}
              className={`w-12 h-6 rounded-full transition-all ${includeMe ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${includeMe ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Split Type */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Split type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSplitType('equal')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                  splitType === 'equal' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Equal Split
              </button>
              <button
                onClick={() => setSplitType('custom')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                  splitType === 'custom' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Custom Amounts
              </button>
            </div>
          </div>

          {/* Split Preview */}
          {selectedContacts.length > 0 && total > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-3">Split Preview</label>
              <div className="space-y-2">
                {includeMe && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">You {paidBy === 'me' && '(paid)'}</span>
                    <span className="text-sm font-black text-indigo-600">
                      {currencySymbol}{splitType === 'equal' ? equalShare.toFixed(2) : (parseFloat(customAmounts['me'] || '0')).toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedContacts.map(id => {
                  const contact = contacts.find(c => c.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">
                        {contact?.name} {paidBy === id && '(paid)'}
                      </span>
                      {splitType === 'equal' ? (
                        <span className="text-sm font-black text-indigo-600">{currencySymbol}{equalShare.toFixed(2)}</span>
                      ) : (
                        <input
                          type="number"
                          value={customAmounts[id] || ''}
                          onChange={(e) => setCustomAmounts({ ...customAmounts, [id]: e.target.value })}
                          placeholder="0.00"
                          className="w-20 p-1 text-right text-sm font-black text-indigo-600 bg-white rounded-lg outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 bg-white p-4 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={!description || total <= 0 || selectedContacts.length === 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-2xl text-sm font-black transition-all"
          >
            Create Split & Track Debts
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitExpense;
