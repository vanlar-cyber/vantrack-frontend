import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  insightsApi,
  HealthScoreResponse,
  SmartPredictionsResponse,
  ProactiveNudgesResponse,
  budgetsApi,
  BudgetResponse,
} from '../services/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InsightsViewProps {
  currencySymbol: string;
  languageCode: string;
  cachedHealthScore: HealthScoreResponse | null;
  onHealthScoreUpdate: (score: HealthScoreResponse | null) => void;
}

const renderMarkdown = (text: string): React.ReactNode => {
  const lines = (text ?? '').split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const withBold = line.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, j) => {
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
        return <strong key={`${i}-${j}`} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={`${i}-${j}`}>{part}</React.Fragment>;
    });
    if (trimmed.startsWith('### ')) return <div key={i} className="font-semibold mt-2 mb-1">{trimmed.replace('### ', '')}</div>;
    if (trimmed.startsWith('## ')) return <div key={i} className="font-semibold text-base mt-3 mb-1">{trimmed.replace('## ', '')}</div>;
    if (trimmed === '') return <div key={i} className="h-1.5" />;
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      return <div key={i} className="flex gap-2 ml-1"><span className="text-slate-400">•</span><span>{withBold}</span></div>;
    }
    return <div key={i}>{withBold}</div>;
  });
};

function useInsightsData(args: {
  currencySymbol: string;
  languageCode: string;
  cachedHealthScore: HealthScoreResponse | null;
  onHealthScoreUpdate: (score: HealthScoreResponse | null) => void;
}) {
  const { currencySymbol, languageCode, cachedHealthScore, onHealthScoreUpdate } = args;
  const [summary, setSummary] = useState('');
  const [predictions, setPredictions] = useState<SmartPredictionsResponse | null>(null);
  const [nudges, setNudges] = useState<ProactiveNudgesResponse | null>(null);
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const fetchWeeklySummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const response = await insightsApi.getWeeklySummary(currencySymbol, languageCode);
      setSummary(response.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  }, [currencySymbol, languageCode]);

  const fetchHealthScore = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const response = await insightsApi.getHealthScore(currencySymbol, languageCode);
      onHealthScoreUpdate(response);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHealth(false);
    }
  }, [currencySymbol, languageCode, onHealthScoreUpdate]);

  const fetchPredictions = useCallback(async () => {
    setLoadingPredictions(true);
    try {
      const response = await insightsApi.getSmartPredictions(currencySymbol);
      setPredictions(response);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPredictions(false);
    }
  }, [currencySymbol]);

  const fetchNudges = useCallback(async () => {
    try {
      const response = await insightsApi.getNudges(currencySymbol);
      setNudges(response);
    } catch (e) {
      console.error(e);
    }
  }, [currencySymbol]);

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await budgetsApi.getAll();
      setBudgets(response);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchWeeklySummary();
    if (!cachedHealthScore) fetchHealthScore();
    fetchPredictions();
    fetchNudges();
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    summary, predictions, nudges, budgets,
    loadingSummary, loadingHealth, loadingPredictions,
    fetchWeeklySummary, fetchHealthScore, fetchPredictions, fetchBudgets,
  };
}

function useAskAi(currencySymbol: string, languageCode: string) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const ask = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const response = await insightsApi.askQuestion({
        question: q,
        currency_symbol: currencySymbol,
        language_code: languageCode,
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [currencySymbol, languageCode]);

  return { chatHistory, question, setQuestion, loading, ask, chatEndRef, clearChat: () => setChatHistory([]) };
}

const InsightsView: React.FC<InsightsViewProps> = ({
  currencySymbol,
  languageCode,
  cachedHealthScore,
  onHealthScoreUpdate,
}) => {
  const {
    summary, predictions, nudges, budgets,
    loadingSummary, loadingHealth, loadingPredictions,
    fetchWeeklySummary, fetchHealthScore, fetchBudgets,
  } = useInsightsData({ currencySymbol, languageCode, cachedHealthScore, onHealthScoreUpdate });

  const healthScore = cachedHealthScore;
  const { chatHistory, question, setQuestion, loading: askLoading, ask, chatEndRef, clearChat } = useAskAi(currencySymbol, languageCode);
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'ai'>('overview');

  const cashFlow = predictions?.cash_flow_forecast;
  const alerts = nudges?.nudges.filter(n => n.type === 'alert' || n.priority === 'high') || [];
  const celebrations = nudges?.nudges.filter(n => n.type === 'celebration') || [];

  const quickQuestions = [
    "What's my profit this month?",
    "Who owes me money?",
    "What bills are due soon?",
    "How can I save more?",
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4">
        <div className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
            { id: 'budgets', label: 'Budgets', icon: 'fa-bullseye' },
            { id: 'ai', label: 'Ask Van', icon: 'fa-robot' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              <i className={`fas ${tab.icon} mr-1.5`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Cash Position Hero - Most important for MSMEs */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Cash Position</span>
                {loadingPredictions && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              </div>
              
              {cashFlow ? (
                <>
                  <div className="text-3xl font-black mb-4">
                    {currencySymbol}{cashFlow.current_balance.toLocaleString()}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 uppercase font-medium mb-0.5">End of Month</div>
                      <div className={`text-lg font-bold ${cashFlow.projected_end_of_month >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currencySymbol}{Math.abs(cashFlow.projected_end_of_month).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3">
                      <div className="text-[10px] text-slate-400 uppercase font-medium mb-0.5">Days Left</div>
                      <div className="text-lg font-bold">{cashFlow.days_remaining}</div>
                    </div>
                  </div>
                  
                  {cashFlow.message && (
                    <p className="text-xs text-slate-300 mt-3 leading-relaxed">{cashFlow.message}</p>
                  )}
                </>
              ) : (
                <div className="text-2xl font-bold text-slate-500">Loading...</div>
              )}
            </div>

            {/* Alerts - Action items that need attention */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Needs Attention</h3>
                {alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-exclamation-triangle text-amber-600 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                      <p className="text-xs text-slate-600">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Celebrations - Positive reinforcement */}
            {celebrations.length > 0 && (
              <div className="space-y-2">
                {celebrations.slice(0, 2).map((item, i) => (
                  <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-check-circle text-emerald-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-600">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Business Health - Simple score */}
            {healthScore && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Business Health</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    healthScore.score >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    healthScore.score >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {healthScore.score}/100
                  </div>
                </div>
                
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      healthScore.score >= 70 ? 'bg-emerald-500' :
                      healthScore.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${healthScore.score}%` }}
                  />
                </div>
                
                <p className="text-xs text-slate-500">{healthScore.grade}</p>
                
                <button 
                  onClick={fetchHealthScore}
                  disabled={loadingHealth}
                  className="mt-2 text-xs text-indigo-600 font-medium hover:text-indigo-700 disabled:opacity-50"
                >
                  {loadingHealth ? 'Updating...' : 'Refresh'}
                </button>
              </div>
            )}

            {/* Upcoming Bills - Critical for cash flow planning */}
            {predictions?.bill_reminders && predictions.bill_reminders.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Upcoming Bills</h3>
                <div className="space-y-2">
                  {predictions.bill_reminders.slice(0, 4).map((bill, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{bill.name}</p>
                        <p className={`text-xs ${bill.days_until_due <= 3 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                          {bill.days_until_due === 0 ? '⚠️ Due today' : 
                           bill.days_until_due === 1 ? '⚠️ Due tomorrow' : 
                           `In ${bill.days_until_due} days`}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{currencySymbol}{bill.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Summary - Expandable for details */}
            <details className="bg-white rounded-2xl border border-slate-200 overflow-hidden group">
              <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors list-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-chart-line text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Weekly Summary</h3>
                    <p className="text-xs text-slate-400">AI-powered insights</p>
                  </div>
                </div>
                <i className="fas fa-chevron-down text-slate-400 text-sm group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-4 pb-4 border-t border-slate-100">
                {loadingSummary ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-slate-400">Analyzing your finances...</span>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 leading-relaxed pt-3">
                    {renderMarkdown(summary)}
                  </div>
                )}
                <button 
                  onClick={fetchWeeklySummary}
                  disabled={loadingSummary}
                  className="mt-3 text-xs text-indigo-600 font-medium hover:text-indigo-700 disabled:opacity-50"
                >
                  {loadingSummary ? 'Refreshing...' : 'Refresh Summary'}
                </button>
              </div>
            </details>

            {/* Debt Overview */}
            {predictions?.debt_payoff && predictions.debt_payoff.total_debt > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Money Owed to You</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">Total Outstanding</span>
                  <span className="text-xl font-bold text-indigo-600">{currencySymbol}{predictions.debt_payoff.total_debt.toLocaleString()}</span>
                </div>
                {predictions.debt_payoff.payoff_date && (
                  <p className="text-xs text-slate-500">
                    Expected collection by <span className="font-semibold text-slate-700">{predictions.debt_payoff.payoff_date}</span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'budgets' && (
          <BudgetsTab currencySymbol={currencySymbol} budgets={budgets} onRefresh={fetchBudgets} />
        )}

        {activeTab === 'ai' && (
          <AskAiTab 
            chatHistory={chatHistory}
            question={question}
            setQuestion={setQuestion}
            loading={askLoading}
            ask={ask}
            chatEndRef={chatEndRef}
            clearChat={clearChat}
            quickQuestions={quickQuestions}
          />
        )}
      </div>
    </div>
  );
};

function BudgetsTab({ currencySymbol, budgets, onRefresh }: { currencySymbol: string; budgets: BudgetResponse[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'spending_limit', amount: '', category: '', period: 'monthly' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    setSubmitting(true);
    try {
      await budgetsApi.create({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category || undefined,
        period: formData.period,
      });
      setFormData({ name: '', type: 'spending_limit', amount: '', category: '', period: 'monthly' });
      setShowForm(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await budgetsApi.delete(id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Budgets & Goals</h2>
          <p className="text-xs text-slate-500">Track spending limits and savings targets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'} mr-1.5`} />
          {showForm ? 'Cancel' : 'New Budget'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Budget name (e.g., Monthly Food, Rent)"
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              className="px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white"
            >
              <option value="spending_limit">Spending Limit</option>
              <option value="income_goal">Income Goal</option>
              <option value="savings_goal">Savings Goal</option>
            </select>
            <select
              value={formData.period}
              onChange={e => setFormData({ ...formData, period: e.target.value })}
              className="px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <input
            type="number"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
            placeholder={`Target amount (${currencySymbol})`}
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl"
            required
          />
          {formData.type === 'spending_limit' && (
            <input
              type="text"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              placeholder="Category (optional, e.g., food, transport)"
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl"
            />
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating...' : 'Create Budget'}
          </button>
        </form>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-bullseye text-slate-300 text-3xl" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">No budgets yet</h3>
          <p className="text-sm text-slate-400 mb-4">Set spending limits to stay on track</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => (
            <div key={budget.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{budget.name}</h4>
                  <p className="text-xs text-slate-400 capitalize">
                    {budget.type.replace('_', ' ')} • {budget.period}
                    {budget.category && ` • ${budget.category}`}
                  </p>
                </div>
                <button onClick={() => handleDelete(budget.id)} className="text-slate-300 hover:text-rose-500 p-1 -mr-1">
                  <i className="fas fa-trash text-xs" />
                </button>
              </div>
              
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-2xl font-bold text-slate-800">{currencySymbol}{budget.current_amount.toLocaleString()}</span>
                  <span className="text-sm text-slate-400 ml-1">/ {currencySymbol}{budget.amount.toLocaleString()}</span>
                </div>
                <span className={`text-sm font-bold ${
                  budget.status === 'over_budget' ? 'text-rose-600' :
                  budget.status === 'warning' ? 'text-amber-600' :
                  budget.status === 'achieved' ? 'text-emerald-600' : 'text-indigo-600'
                }`}>{budget.progress_percent.toFixed(0)}%</span>
              </div>
              
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    budget.status === 'over_budget' ? 'bg-rose-500' :
                    budget.status === 'warning' ? 'bg-amber-500' :
                    budget.status === 'achieved' ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, budget.progress_percent)}%` }}
                />
              </div>
              
              {budget.status === 'over_budget' && (
                <p className="text-xs text-rose-600 mt-2 font-medium">
                  ⚠️ Over budget by {currencySymbol}{(budget.current_amount - budget.amount).toLocaleString()}
                </p>
              )}
              {budget.status === 'warning' && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚡ Approaching limit - {currencySymbol}{(budget.amount - budget.current_amount).toLocaleString()} remaining
                </p>
              )}
              {budget.status === 'achieved' && budget.type !== 'spending_limit' && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  🎉 Goal achieved!
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AskAiTab({ chatHistory, question, setQuestion, loading, ask, chatEndRef, clearChat, quickQuestions }: {
  chatHistory: ChatMessage[];
  question: string;
  setQuestion: (q: string) => void;
  loading: boolean;
  ask: (q: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  clearChat: () => void;
  quickQuestions: string[];
}) {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {chatHistory.length > 0 && (
        <div className="flex justify-end mb-3">
          <button onClick={clearChat} className="text-xs text-slate-400 hover:text-rose-500 font-medium">
            <i className="fas fa-trash mr-1" /> Clear chat
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-robot text-indigo-600 text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Ask Van Anything</h3>
            <p className="text-sm text-slate-500 mb-6">Get instant answers about your business finances</p>
            
            <div className="space-y-2 max-w-sm mx-auto">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => ask(q)}
                  className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                >
                  <i className="fas fa-arrow-right text-indigo-500 mr-2 text-xs" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3' 
                    : 'bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3'
                }`}>
                  <div className="text-sm leading-relaxed">
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); ask(question); }} className="sticky bottom-0 bg-slate-50 pt-2">
        <div className="relative">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about your finances..."
            className="w-full px-4 py-3.5 pr-12 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-colors"
          >
            <i className="fas fa-paper-plane text-xs" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default InsightsView;
