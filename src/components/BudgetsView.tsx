import React, { useState, useEffect } from 'react';
import { budgetsApi, BudgetResponse, BudgetCreate } from '../services/api';

interface BudgetsViewProps {
  currencySymbol: string;
}

const BudgetsView: React.FC<BudgetsViewProps> = ({ currencySymbol }) => {
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetResponse | null>(null);
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

      {/* Budget Detail View */}
      {selectedBudget && (
        <div className="animate-in fade-in slide-in-from-right duration-300">
          {/* Back Button */}
          <button
            onClick={() => setSelectedBudget(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 text-sm font-medium"
          >
            <i className="fas fa-arrow-left"></i>
            Back to Budgets
          </button>

          {/* Budget Header Card */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedBudget.type === 'spending_limit' ? 'bg-rose-100' : 'bg-emerald-100'
              }`}>
                <i className={`fas ${getTypeIcon(selectedBudget.type)} text-xl ${
                  selectedBudget.type === 'spending_limit' ? 'text-rose-500' : 'text-emerald-500'
                }`}></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900">{selectedBudget.name}</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {getTypeLabel(selectedBudget.type)} • {selectedBudget.period}
                  {selectedBudget.category && ` • ${selectedBudget.category}`}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                selectedBudget.status === 'over_budget' ? 'bg-rose-100 text-rose-600' :
                selectedBudget.status === 'warning' ? 'bg-amber-100 text-amber-600' :
                selectedBudget.status === 'achieved' ? 'bg-emerald-100 text-emerald-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {selectedBudget.status === 'over_budget' ? 'Over Budget' :
                 selectedBudget.status === 'warning' ? 'Near Limit' :
                 selectedBudget.status === 'achieved' ? 'Achieved!' :
                 'On Track'}
              </span>
            </div>

            {/* Big Progress Display */}
            <div className="text-center mb-4">
              <div className="text-3xl font-black text-slate-900">
                {currencySymbol}{selectedBudget.current_amount.toLocaleString()}
              </div>
              <div className="text-sm text-slate-400">
                of {currencySymbol}{selectedBudget.amount.toLocaleString()} {selectedBudget.type === 'spending_limit' ? 'limit' : 'goal'}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getStatusColor(selectedBudget.status, selectedBudget.type)} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, selectedBudget.progress_percent)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">0%</span>
                <span className={`text-sm font-bold ${
                  selectedBudget.status === 'over_budget' ? 'text-rose-500' :
                  selectedBudget.status === 'warning' ? 'text-amber-500' :
                  selectedBudget.status === 'achieved' ? 'text-emerald-500' :
                  'text-blue-500'
                }`}>
                  {selectedBudget.progress_percent.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-400">100%</span>
              </div>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Transactions Counted
              </h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                {selectedBudget.transactions?.length || 0} items
              </span>
            </div>

            {selectedBudget.transactions && selectedBudget.transactions.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedBudget.transactions
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {tx.description || 'No description'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tx.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                        {tx.category && <span className="ml-2 px-1.5 py-0.5 bg-slate-200 rounded text-slate-500">{tx.category}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900 ml-3">
                      {currencySymbol}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <i className="fas fa-receipt text-2xl mb-2"></i>
                <p className="text-xs">No transactions in this period yet</p>
              </div>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              handleDelete(selectedBudget.id);
              setSelectedBudget(null);
            }}
            className="w-full mt-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl text-sm font-bold transition-colors"
          >
            <i className="fas fa-trash mr-2"></i>
            Delete Budget
          </button>
        </div>
      )}

      {/* Budgets List */}
      {!selectedBudget && (
        <>
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
                  onClick={() => setSelectedBudget(budget)}
                  className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 cursor-pointer hover:shadow-xl hover:border-indigo-100 transition-all active:scale-[0.99]"
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
                    <div className="flex items-center gap-2">
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
                      <i className="fas fa-chevron-right text-slate-300 text-xs"></i>
                    </div>
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

                  {/* Tap hint */}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400">
                      {budget.transactions?.length || 0} transactions
                    </span>
                    <span className="text-[9px] text-indigo-400 font-medium">
                      Tap to view details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BudgetsView;
