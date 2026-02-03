
import React from 'react';
import { BalanceSummary } from '../types';

interface BalanceCardsProps {
  balances: BalanceSummary;
  currencySymbol?: string;
}

const BalanceCards: React.FC<BalanceCardsProps> = ({ balances, currencySymbol = '$' }) => {
  const cards = [
    { label: 'Cash', value: balances.cash, icon: 'fa-wallet', color: 'bg-emerald-500', iconColor: 'text-emerald-500' },
    { label: 'Bank', value: balances.bank, icon: 'fa-university', color: 'bg-blue-500', iconColor: 'text-blue-500' },
    { label: 'Credit', value: balances.credit, icon: 'fa-credit-card', color: 'bg-purple-500', iconColor: 'text-purple-500' },
    { label: 'Loan', value: balances.loan, icon: 'fa-coins', color: 'bg-rose-500', iconColor: 'text-rose-500' },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1 snap-x no-scrollbar">
      {cards.map((card) => (
        <div key={card.label} className="min-w-[140px] snap-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm first:ml-0">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${card.color.replace('500', '50')} ${card.iconColor}`}>
              <i className={`fas ${card.icon} text-[10px]`}></i>
            </div>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{card.label}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900 leading-none">
              {currencySymbol}{Math.abs(card.value).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BalanceCards;
