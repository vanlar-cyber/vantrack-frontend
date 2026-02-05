import React, { useState, useEffect } from 'react';
import { budgetsApi, BudgetResponse, BudgetCreate } from '../services/api';

interface BudgetsViewProps {
  currencySymbol: string;
}

const BudgetsView: React.FC<BudgetsViewProps> = ({ currencySymbol }) => {
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BudgetCreate>({
    name: '',
    type: 'spending_limit',
    category: '',
    amount: 0,
    period: 'monthly',
    alert_at_percent: 80,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchBudgets = async () => {
    try {
      const data = await budgetsApi.getAll();
      setBudgets(data);
    } catch (err) {
      console.error('Failed to fetch budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    
    setSubmitting(true);
    try {
      await budgetsApi.create(formData);
      setShowForm(false);
      setFormData({
        name: '',
        type: 'spending_limit',
        category: '',
        amount: 0,
        period: 'monthly',
        alert_at_percent: 80,
      });
      fetchBudgets();
    } catch (err) {
      console.error('Failed to create budget:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      fetchBudgets();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'spending_limit') {
      if (status === 'over_budget') return 'bg-rose-500';
      if (status === 'warning') return 'bg-amber-500';
      return 'bg-emerald-500';
    } else {
      if (status === 'achieved') return 'bg-emerald-500';
      return 'bg-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spending_limit': return 'fa-hand-holding-dollar';
      case 'income_goal': return 'fa-arrow-trend-up';
      case 'savings_goal': return 'fa-piggy-bank';
      case 'profit_goal': return 'fa-chart-line';
      default: return 'fa-bullseye';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'spending_limit': return 'Spending Limit';
      case 'income_goal': return 'Income Goal';
      case 'savings_goal': return 'Savings Goal';
      case 'profit_goal': return 'Profit Goal';
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Budgets & Goals</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-all flex items-center gap-1"
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`}></i>
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Food Budget, Monthly Savings"
              className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="spending_limit">Spending Limit</option>
                <option value="income_goal">Income Goal</option>
                <option value="savings_goal">Savings Goal</option>
                <option value="profit_goal">Profit Goal</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Period</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Amount ({currencySymbol})</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            {formData.type === 'spending_limit' && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category (optional)</label>
                <input
                  type="text"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., food, entertainment"
                  className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !formData.name || !formData.amount}
            className="w-full py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Budget'}
          </button>
        </form>
      )}

      {/* Budgets List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <i className="fas fa-bullseye text-3xl mb-2"></i>
          <p className="text-sm">No budgets yet. Create one to start tracking!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget) => (
            <div
              key={budget.id}
              className="bg-white rounded-xl p-4 shadow-lg border border-slate-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    budget.type === 'spending_limit' ? 'bg-rose-100' : 'bg-emerald-100'
                  }`}>
                    <i className={`fas ${getTypeIcon(budget.type)} text-sm ${
                      budget.type === 'spending_limit' ? 'text-rose-500' : 'text-emerald-500'
                    }`}></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{budget.name}</h3>
                    <p className="text-[9px] text-slate-400 uppercase">
                      {getTypeLabel(budget.type)} • {budget.period}
                      {budget.category && ` • ${budget.category}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(budget.id)}
                  className="text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500">
                    {currencySymbol}{budget.current_amount.toLocaleString()} / {currencySymbol}{budget.amount.toLocaleString()}
                  </span>
                  <span className={`text-xs font-bold ${
                    budget.status === 'over_budget' ? 'text-rose-500' :
                    budget.status === 'warning' ? 'text-amber-500' :
                    budget.status === 'achieved' ? 'text-emerald-500' :
                    'text-blue-500'
                  }`}>
                    {budget.progress_percent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(budget.status, budget.type)} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, budget.progress_percent)}%` }}
                  />
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-400">
                  {budget.transactions?.length || 0} transactions counted
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  budget.status === 'over_budget' ? 'bg-rose-100 text-rose-600' :
                  budget.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                  budget.status === 'achieved' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {budget.status === 'over_budget' ? 'Over Budget' :
                   budget.status === 'warning' ? 'Near Limit' :
                   budget.status === 'achieved' ? 'Achieved!' :
                   'On Track'}
                </span>
              </div>

              {/* Transactions List - Expandable */}
              {budget.transactions && budget.transactions.length > 0 && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <i className="fas fa-list text-[8px]"></i>
                    View transactions
                    <i className="fas fa-chevron-down text-[8px] group-open:rotate-180 transition-transform ml-auto"></i>
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {budget.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-lg text-[10px]">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-700 truncate">{tx.description || 'No description'}</p>
                          <p className="text-slate-400">
                            {new Date(tx.date).toLocaleDateString()}
                            {tx.category && ` • ${tx.category}`}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800 ml-2">
                          {currencySymbol}{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BudgetsView;
