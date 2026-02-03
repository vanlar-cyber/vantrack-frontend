
import React from 'react';
import { Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  currencySymbol?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, currencySymbol = '$' }) => {
  if (transactions.length === 0) {
    return (
      <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <i className="fas fa-ghost text-slate-200 text-xl"></i>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No entries yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const isPositive = ['income', 'loan_payable', 'payment_received'].includes(tx.type);
        return (
          <div key={tx.id} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {tx.description.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-black text-slate-900 text-xs leading-none mb-1 truncate">{tx.description}</div>
                <div className="flex items-center gap-1.5 overflow-hidden">
                   <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter shrink-0">{tx.category}</span>
                   <span className="w-0.5 h-0.5 bg-slate-200 rounded-full shrink-0"></span>
                   <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter truncate">{tx.account} {tx.contact && `@${tx.contact}`}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right flex items-center gap-3 shrink-0">
              <div>
                <div className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {isPositive ? '+' : '-'}{currencySymbol}{tx.amount}
                </div>
                <div className="text-[8px] font-bold text-slate-300 uppercase">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
              <button onClick={() => onDelete(tx.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                <i className="fas fa-times-circle"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;
