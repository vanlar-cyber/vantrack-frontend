import React, { useState, useEffect, useRef } from 'react';
import { insightsApi, HealthScoreResponse, SpendingComparisonsResponse, SmartPredictionsResponse, ProactiveNudgesResponse } from '../services/api';
import BudgetsView from './BudgetsView';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    let content: React.ReactNode = line;
    
    // Bold: **text** or __text__
    content = line.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('__') && part.endsWith('__')) {
        return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    
    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      return (
        <div key={i} className="flex gap-2 ml-2">
          <span>•</span>
          <span>{content}</span>
        </div>
      );
    }
    
    // Headers
    if (line.trim().startsWith('### ')) {
      return <div key={i} className="font-bold mt-2 mb-1">{line.replace('### ', '')}</div>;
    }
    if (line.trim().startsWith('## ')) {
      return <div key={i} className="font-bold text-lg mt-3 mb-1">{line.replace('## ', '')}</div>;
    }
    
    // Empty lines
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }
    
    return <div key={i}>{content}</div>;
  });
};

interface InsightsViewProps {
  currencySymbol: string;
  languageCode: string;
  cachedHealthScore: HealthScoreResponse | null;
  onHealthScoreUpdate: (score: HealthScoreResponse | null) => void;
}

const InsightsView: React.FC<InsightsViewProps> = ({ currencySymbol, languageCode, cachedHealthScore, onHealthScoreUpdate }) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthExpanded, setHealthExpanded] = useState(false);
  const [comparisons, setComparisons] = useState<SpendingComparisonsResponse | null>(null);
  const [loadingComparisons, setLoadingComparisons] = useState(false);
  const [comparisonsExpanded, setComparisonsExpanded] = useState(false);
  const [predictions, setPredictions] = useState<SmartPredictionsResponse | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [predictionsExpanded, setPredictionsExpanded] = useState(false);
  const [nudges, setNudges] = useState<ProactiveNudgesResponse | null>(null);
  const [loadingNudges, setLoadingNudges] = useState(false);
  const [budgetsExpanded, setBudgetsExpanded] = useState(false);
  
  // Use cached health score from parent
  const healthScore = cachedHealthScore;
  const [askAiExpanded, setAskAiExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchWeeklySummary = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const response = await insightsApi.getWeeklySummary(currencySymbol, languageCode);
      setSummary(response.summary);
    } catch (err) {
      setError('Failed to load insights. Please try again.');
      console.error('Failed to fetch weekly summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    const userMessage = question.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuestion('');
    setLoadingAnswer(true);
    setError('');
    
    try {
      const response = await insightsApi.askQuestion({
        question: userMessage,
        currency_symbol: currencySymbol,
        language_code: languageCode,
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (err) {
      setError('Failed to get answer. Please try again.');
      console.error('Failed to ask question:', err);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setError('');
  };

  const fetchHealthScore = async () => {
    setLoadingHealth(true);
    try {
      const response = await insightsApi.getHealthScore(currencySymbol, languageCode);
      onHealthScoreUpdate(response);
    } catch (err) {
      console.error('Failed to fetch health score:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchComparisons = async () => {
    setLoadingComparisons(true);
    try {
      const response = await insightsApi.getSpendingComparisons(currencySymbol);
      setComparisons(response);
    } catch (err) {
      console.error('Failed to fetch comparisons:', err);
    } finally {
      setLoadingComparisons(false);
    }
  };

  const fetchPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const response = await insightsApi.getSmartPredictions(currencySymbol);
      setPredictions(response);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const fetchNudges = async () => {
    setLoadingNudges(true);
    try {
      const response = await insightsApi.getNudges(currencySymbol);
      setNudges(response);
    } catch (err) {
      console.error('Failed to fetch nudges:', err);
    } finally {
      setLoadingNudges(false);
    }
  };

  useEffect(() => {
    fetchWeeklySummary();
    // Only fetch health score if not already cached
    if (!cachedHealthScore) {
      fetchHealthScore();
    }
    // Fetch comparisons
    if (!comparisons) {
      fetchComparisons();
    }
    // Fetch predictions
    if (!predictions) {
      fetchPredictions();
    }
    // Fetch nudges
    fetchNudges();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const suggestedQuestions = [
    "How much did I spend this week?",
    "What's my biggest expense?",
    "Who owes me money?",
    "Compare this vs last month",
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-teal-600';
    if (score >= 60) return 'from-blue-500 to-indigo-600';
    if (score >= 40) return 'from-amber-500 to-orange-600';
    return 'from-rose-500 to-red-600';
  };

  const getBarColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 70) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getNudgeIcon = (icon: string) => {
    const iconMap: Record<string, string> = {
      'sun': 'fa-sun',
      'bell': 'fa-bell',
      'exclamation-triangle': 'fa-exclamation-triangle',
      'chart-bar': 'fa-chart-bar',
      'party-horn': 'fa-party-horn',
      'check-circle': 'fa-check-circle',
      'trophy': 'fa-trophy',
      'piggy-bank': 'fa-piggy-bank',
    };
    return iconMap[icon] || 'fa-bell';
  };

  const getNudgeColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'amber': 'bg-amber-100 text-amber-600',
      'rose': 'bg-rose-100 text-rose-600',
      'emerald': 'bg-emerald-100 text-emerald-600',
      'orange': 'bg-orange-100 text-orange-600',
    };
    return colorMap[color] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-4">
      {/* Proactive Nudges - Always visible at top */}
      {nudges && nudges.nudges.length > 0 && (
        <div className="space-y-2">
          {nudges.nudges.slice(0, 3).map((nudge, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 border ${
                nudge.type === 'celebration' ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100' :
                nudge.type === 'alert' ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100' :
                'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getNudgeColor(nudge.color)}`}>
                  <i className={`fas ${getNudgeIcon(nudge.icon)} text-sm`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">{nudge.title}</h4>
                  <p className="text-xs text-slate-600">{nudge.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Budgets & Goals Card - Collapsible */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <button
          onClick={() => setBudgetsExpanded(!budgetsExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-bullseye text-white text-sm"></i>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Budgets & Goals</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Set limits and track progress
              </p>
            </div>
          </div>
          <i className={`fas fa-chevron-down text-sm text-slate-400 transition-transform duration-300 ${budgetsExpanded ? 'rotate-180' : ''}`}></i>
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${budgetsExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
            <BudgetsView currencySymbol={currencySymbol} />
          </div>
        </div>
      </div>

      {/* Financial Health Score Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <button
          onClick={() => setHealthExpanded(!healthExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            {loadingHealth ? (
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : healthScore ? (
              <div className={`w-12 h-12 bg-gradient-to-br ${getScoreGradient(healthScore.score)} rounded-xl flex items-center justify-center`}>
                <span className="text-white font-black text-lg">{healthScore.score}</span>
              </div>
            ) : (
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-heart-pulse text-slate-400"></i>
              </div>
            )}
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Financial Health</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {loadingHealth ? 'Calculating...' : healthScore ? healthScore.grade : 'Tap to view'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchHealthScore(); }}
              disabled={loadingHealth}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs text-slate-500 ${loadingHealth ? 'animate-spin' : ''}`}></i>
            </button>
            <i className={`fas fa-chevron-down text-sm text-slate-400 transition-transform duration-300 ${healthExpanded ? 'rotate-180' : ''}`}></i>
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${healthExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {healthScore && (
            <div className="px-4 pb-4 space-y-4">
              {/* Score Breakdown */}
              <div className="space-y-3">
                {Object.entries(healthScore.breakdown).map(([key, item]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                      <span className="text-[10px] font-bold text-slate-400">{item.value}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getBarColor(item.score, item.max)} rounded-full transition-all duration-500`}
                        style={{ width: `${(item.score / item.max) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-end mt-0.5">
                      <span className="text-[9px] text-slate-400">{item.score}/{item.max}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Tips */}
              {healthScore.tips && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center">
                      <i className="fas fa-lightbulb text-white text-[8px]"></i>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">How to Improve</span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-600">
                    {renderMarkdown(healthScore.tips)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Anonymous Comparisons Card - Collapsible */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <button
          onClick={() => setComparisonsExpanded(!comparisonsExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-users text-white text-sm"></i>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">How You Compare</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {loadingComparisons ? 'Analyzing...' : comparisons ? comparisons.summary : 'Anonymous benchmarks'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchComparisons(); }}
              disabled={loadingComparisons}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs text-slate-500 ${loadingComparisons ? 'animate-spin' : ''}`}></i>
            </button>
            <i className={`fas fa-chevron-down text-sm text-slate-400 transition-transform duration-300 ${comparisonsExpanded ? 'rotate-180' : ''}`}></i>
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${comparisonsExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {loadingComparisons ? (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 py-6">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-400">Comparing your spending...</span>
              </div>
            </div>
          ) : comparisons && comparisons.comparisons.length > 0 ? (
            <div className="px-4 pb-4 space-y-3">
              {comparisons.comparisons.map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${item.is_better ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-slate-700">{item.category}</span>
                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${item.is_better ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                      {item.is_better ? '✓ Better' : 'Room to improve'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">You: <span className="font-bold text-slate-700">{item.your_value}</span></span>
                    <span className="text-slate-500">Avg: <span className="font-bold text-slate-700">{item.benchmark}</span></span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 italic">{item.insight}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 pb-4">
              <p className="text-sm text-slate-400 text-center py-4">Add more transactions to see comparisons</p>
            </div>
          )}
        </div>
      </div>

      {/* Smart Predictions Card - Collapsible */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <button
          onClick={() => setPredictionsExpanded(!predictionsExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-crystal-ball text-white text-sm"></i>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Smart Predictions</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {loadingPredictions ? 'Calculating...' : 'Forecasts & reminders'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchPredictions(); }}
              disabled={loadingPredictions}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs text-slate-500 ${loadingPredictions ? 'animate-spin' : ''}`}></i>
            </button>
            <i className={`fas fa-chevron-down text-sm text-slate-400 transition-transform duration-300 ${predictionsExpanded ? 'rotate-180' : ''}`}></i>
          </div>
        </button>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${predictionsExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {loadingPredictions ? (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 py-6">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-400">Analyzing patterns...</span>
              </div>
            </div>
          ) : predictions ? (
            <div className="px-4 pb-4 space-y-4">
              {/* Cash Flow Forecast */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-cyan-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-chart-line text-white text-[10px]"></i>
                  </div>
                  <span className="text-[10px] font-black text-cyan-700 uppercase tracking-widest">Cash Flow Forecast</span>
                </div>
                <p className="text-sm font-bold text-slate-700 mb-3">{predictions.cash_flow_forecast.message}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Current</p>
                    <p className={`text-lg font-black ${predictions.cash_flow_forecast.current_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currencySymbol}{Math.abs(predictions.cash_flow_forecast.current_balance).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2">
                    <p className="text-[9px] text-slate-500 uppercase font-bold">End of Month</p>
                    <p className={`text-lg font-black ${predictions.cash_flow_forecast.projected_end_of_month >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {currencySymbol}{Math.abs(predictions.cash_flow_forecast.projected_end_of_month).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 mt-2 text-center">
                  {predictions.cash_flow_forecast.days_remaining} days remaining this month
                </p>
              </div>

              {/* Bill Reminders */}
              {predictions.bill_reminders.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-amber-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-bell text-white text-[10px]"></i>
                    </div>
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Bill Reminders</span>
                  </div>
                  <div className="space-y-2">
                    {predictions.bill_reminders.map((bill, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center justify-between p-2 rounded-lg ${bill.is_upcoming ? 'bg-amber-100 border border-amber-200' : 'bg-white/60'}`}
                      >
                        <div className="flex items-center gap-2">
                          {bill.is_upcoming && (
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                          )}
                          <div>
                            <p className="text-[11px] font-bold text-slate-700">{bill.name}</p>
                            <p className="text-[9px] text-slate-500">Due around the {bill.usual_day}{bill.usual_day === 1 ? 'st' : bill.usual_day === 2 ? 'nd' : bill.usual_day === 3 ? 'rd' : 'th'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black text-slate-700">{currencySymbol}{bill.amount.toLocaleString()}</p>
                          <p className={`text-[9px] font-bold ${bill.is_upcoming ? 'text-amber-600' : 'text-slate-400'}`}>
                            {bill.days_until_due === 0 ? 'Today!' : bill.days_until_due === 1 ? 'Tomorrow' : `In ${bill.days_until_due} days`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debt Payoff Timeline */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-violet-500 rounded-lg flex items-center justify-center">
                    <i className="fas fa-calendar-check text-white text-[10px]"></i>
                  </div>
                  <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Debt Payoff Timeline</span>
                </div>
                <p className="text-sm font-bold text-slate-700 mb-3">{predictions.debt_payoff.message}</p>
                {predictions.debt_payoff.total_debt > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                      <span className="text-[10px] text-slate-500 font-bold">Total Debt</span>
                      <span className="text-sm font-black text-rose-600">{currencySymbol}{predictions.debt_payoff.total_debt.toLocaleString()}</span>
                    </div>
                    {predictions.debt_payoff.months_to_payoff && (
                      <div className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 font-bold">Months to Freedom</span>
                        <span className="text-sm font-black text-violet-600">{predictions.debt_payoff.months_to_payoff} months</span>
                      </div>
                    )}
                    {predictions.debt_payoff.payoff_date && (
                      <div className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                        <span className="text-[10px] text-slate-500 font-bold">Debt-Free By</span>
                        <span className="text-sm font-black text-emerald-600">{predictions.debt_payoff.payoff_date}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4">
              <p className="text-sm text-slate-400 text-center py-4">Add more transactions to see predictions</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Summary Card - Collapsible */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <button
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-white text-sm"></i>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Weekly Insights</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {loadingSummary ? 'Analyzing...' : 'Tap to view AI summary'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchWeeklySummary(); }}
              disabled={loadingSummary}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs text-slate-500 ${loadingSummary ? 'animate-spin' : ''}`}></i>
            </button>
            <i className={`fas fa-chevron-down text-sm text-slate-400 transition-transform duration-300 ${summaryExpanded ? 'rotate-180' : ''}`}></i>
          </div>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${summaryExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
            {loadingSummary ? (
              <div className="flex items-center gap-3 py-6">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-400">Analyzing your finances...</span>
              </div>
            ) : error && !summary ? (
              <div className="py-4 text-slate-500 text-sm">{error}</div>
            ) : (
              <div className="text-[12px] leading-relaxed font-medium text-slate-600 max-h-[400px] overflow-y-auto">
                {renderMarkdown(summary)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask AI Section - Collapsible Chat Style */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setAskAiExpanded(!askAiExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-robot text-indigo-500 text-sm"></i>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Ask AI</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {chatHistory.length > 0 ? `${chatHistory.length} messages` : 'Chat about your finances'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chatHistory.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearChat(); }}
                className="px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              >
                Clear
              </button>
            )}
            <i className={`fas fa-chevron-down text-sm text-slate-400 transition-transform duration-300 ${askAiExpanded ? 'rotate-180' : ''}`}></i>
          </div>
        </button>

        {/* Expandable Content */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${askAiExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {/* Chat Messages */}
          <div className="h-[280px] overflow-y-auto p-4 space-y-3 border-t border-slate-100">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
                <i className="fas fa-robot text-indigo-500 text-lg"></i>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-4">Ask me anything about your finances</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-full text-[9px] font-bold text-slate-500 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                          <i className="fas fa-robot text-white text-[10px]"></i>
                        </div>
                        <div className="bg-slate-100 rounded-2xl rounded-tl-md px-3 py-2 text-[12px] leading-relaxed text-slate-700">
                          {renderMarkdown(msg.content)}
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-md px-3 py-2">
                        <p className="text-[12px] leading-relaxed">{msg.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loadingAnswer && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                      <i className="fas fa-robot text-white text-[10px]"></i>
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleAskQuestion} className="p-3 border-t border-slate-100">
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="w-full p-3 pr-11 text-[12px] font-medium border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <button
              type="submit"
              disabled={loadingAnswer || !question.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center transition-all"
            >
              <i className="fas fa-paper-plane text-[10px]"></i>
            </button>
          </div>
        </form>

        {error && chatHistory.length > 0 && (
          <div className="px-4 pb-3">
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-[11px]">
              {error}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default InsightsView;
