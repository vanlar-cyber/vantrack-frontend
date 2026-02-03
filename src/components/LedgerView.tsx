
import React, { useState } from 'react';
import { Transaction } from '../types';

interface LedgerViewProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  currencySymbol?: string;
}

const LedgerView: React.FC<LedgerViewProps> = ({ transactions, onDelete, currencySymbol = '$' }) => {
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable' | 'open' | 'settled'>('all');

  const debtTxs = transactions.filter(t => 
    ['credit_receivable', 'credit_payable', 'loan_receivable', 'loan_payable'].includes(t.type)
  );

  const paymentTxs = transactions.filter(t => 
    ['payment_received', 'payment_made'].includes(t.type)
  );

  const filteredTxs = debtTxs.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'receivable') return ['credit_receivable', 'loan_receivable'].includes(tx.type);
    if (filter === 'payable') return ['credit_payable', 'loan_payable'].includes(tx.type);
    if (filter === 'open') return tx.status !== 'settled';
    if (filter === 'settled') return tx.status === 'settled';
    return true;
  });

  // Calculate totals based on remaining amounts (not original amounts)
  const totals = debtTxs.reduce((acc, tx) => {
    const remaining = tx.remainingAmount ?? tx.amount;
    switch (tx.type) {
      case 'credit_receivable': acc.receivable += remaining; break;
      case 'loan_receivable': acc.receivable += remaining; break;
      case 'credit_payable': acc.payable += remaining; break;
      case 'loan_payable': acc.payable += remaining; break;
    }
    return acc;
  }, { receivable: 0, payable: 0 });

  // Get payments linked to a specific transaction
  const getLinkedPayments = (txId: string) => {
    return paymentTxs.filter(p => p.linkedTransactionId === txId);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_receivable': return 'Credit Sale';
      case 'credit_payable': return 'Credit Purchase';
      case 'loan_receivable': return 'Lent';
      case 'loan_payable': return 'Borrowed';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit_receivable': return 'bg-emerald-50 text-emerald-600';
      case 'loan_receivable': return 'bg-emerald-100 text-emerald-700';
      case 'credit_payable': return 'bg-rose-50 text-rose-600';
      case 'loan_payable': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-600 p-4 rounded-3xl text-white shadow-lg shadow-emerald-100/50">
          <div className="flex items-center gap-2 mb-2 opacity-70">
            <i className="fas fa-hand-holding-dollar text-[10px]"></i>
            <span className="text-[8px] font-black uppercase tracking-widest">Total Receivables</span>
          </div>
          <div className="text-xl font-black">{currencySymbol}{totals.receivable.toLocaleString()}</div>
        </div>
        <div className="bg-rose-600 p-4 rounded-3xl text-white shadow-lg shadow-rose-100/50">
          <div className="flex items-center gap-2 mb-2 opacity-70">
            <i className="fas fa-receipt text-[10px]"></i>
            <span className="text-[8px] font-black uppercase tracking-widest">Total Payables</span>
          </div>
          <div className="text-xl font-black">{currencySymbol}{totals.payable.toLocaleString()}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filter === 'open' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('receivable')}
          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filter === 'receivable' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          Receivable
        </button>
        <button
          onClick={() => setFilter('payable')}
          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filter === 'payable' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          Payable
        </button>
        <button
          onClick={() => setFilter('settled')}
          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${filter === 'settled' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          Settled
        </button>
      </div>

      <div className="space-y-3">
        {filteredTxs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No credit/loan records found.</div>
          </div>
        ) : (
          filteredTxs
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(tx => (
              <div 
                key={tx.id} 
                className={`bg-white p-4 rounded-3xl border shadow-sm group ${tx.status === 'settled' ? 'border-slate-200 opacity-60' : 'border-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] shrink-0 ${getTypeColor(tx.type)}`}>
                      <i className={`fas ${['credit_receivable', 'loan_receivable'].includes(tx.type) ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-slate-900 truncate">{tx.description}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${getTypeColor(tx.type)}`}>
                          {getTypeLabel(tx.type)}
                        </span>
                        {tx.status && (
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                            tx.status === 'settled' ? 'bg-slate-200 text-slate-500' : 
                            tx.status === 'partial' ? 'bg-amber-100 text-amber-600' : 
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {tx.status}
                          </span>
                        )}
                        {tx.contact && (
                          <span className="text-[8px] font-bold text-indigo-500">
                            <i className="fas fa-user mr-1"></i>{tx.contact}
                          </span>
                        )}
                      </div>
                      <div className="text-[7px] font-bold text-slate-300 uppercase mt-1 tracking-wider">
                        {new Date(tx.date).toLocaleDateString()}
                        {tx.dueDate && <span className="text-rose-400 ml-2">Due {new Date(tx.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {tx.remainingAmount !== undefined && tx.remainingAmount !== tx.amount ? (
                        <>
                          <div className="text-sm font-black text-slate-900">{currencySymbol}{(tx.remainingAmount).toLocaleString()}</div>
                          <div className="text-[8px] font-bold text-slate-400 line-through">{currencySymbol}{tx.amount.toLocaleString()}</div>
                        </>
                      ) : (
                        <div className="text-sm font-black text-slate-900">{currencySymbol}{tx.amount.toLocaleString()}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
                      className="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition-all"
                    >
                      <i className="fas fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </div>
                {/* Show linked payments */}
                {getLinkedPayments(tx.id).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment History</div>
                    <div className="space-y-1">
                      {getLinkedPayments(tx.id).map(payment => (
                        <div key={payment.id} className="flex items-center justify-between text-[9px] bg-slate-50 px-2 py-1.5 rounded-lg">
                          <span className="font-bold text-slate-600">
                            <i className="fas fa-check-circle text-emerald-500 mr-1"></i>
                            {new Date(payment.date).toLocaleDateString()}
                          </span>
                          <span className="font-black text-emerald-600">-{currencySymbol}{payment.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default LedgerView;
