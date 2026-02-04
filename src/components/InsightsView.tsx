import React, { useState, useEffect } from 'react';
import { insightsApi } from '../services/api';

interface InsightsViewProps {
  currencySymbol: string;
  languageCode: string;
}

const InsightsView: React.FC<InsightsViewProps> = ({ currencySymbol, languageCode }) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string>('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [error, setError] = useState<string>('');

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
    
    setLoadingAnswer(true);
    setError('');
    try {
      const response = await insightsApi.askQuestion({
        question: question.trim(),
        currency_symbol: currencySymbol,
        language_code: languageCode,
      });
      setAnswer(response.answer);
    } catch (err) {
      setError('Failed to get answer. Please try again.');
      console.error('Failed to ask question:', err);
    } finally {
      setLoadingAnswer(false);
    }
  };

  useEffect(() => {
    fetchWeeklySummary();
  }, [currencySymbol, languageCode]);

  const suggestedQuestions = [
    "How much did I spend this week?",
    "What's my biggest expense category?",
    "Who owes me money?",
    "Compare this month vs last month",
  ];

  return (
    <div className="space-y-6">
      {/* Weekly Summary Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black">Weekly Insights</h3>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">AI-Powered Summary</p>
          </div>
          <button
            onClick={fetchWeeklySummary}
            disabled={loadingSummary}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
          >
            <i className={`fas fa-sync-alt text-sm ${loadingSummary ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
        
        {loadingSummary ? (
          <div className="flex items-center gap-3 py-8">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-white/80">Analyzing your finances...</span>
          </div>
        ) : error && !summary ? (
          <div className="py-4 text-white/80 text-sm">{error}</div>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-medium">
              {summary}
            </div>
          </div>
        )}
      </div>

      {/* Ask AI Section */}
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-1">Ask AI</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
          Ask anything about your finances
        </p>

        {/* Suggested Questions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => setQuestion(q)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-full text-[10px] font-bold text-slate-600 transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Question Input */}
        <form onSubmit={handleAskQuestion} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., How much did I spend on food this month?"
              className="w-full p-4 pr-12 text-[13px] font-medium border border-slate-200 rounded-2xl bg-slate-50 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <button
              type="submit"
              disabled={loadingAnswer || !question.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl flex items-center justify-center transition-all"
            >
              {loadingAnswer ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <i className="fas fa-paper-plane text-xs"></i>
              )}
            </button>
          </div>
        </form>

        {/* Answer */}
        {answer && (
          <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <i className="fas fa-robot text-white text-xs"></i>
              </div>
              <div className="text-[13px] leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">
                {answer}
              </div>
            </div>
          </div>
        )}

        {error && answer === '' && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Tips Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <i className="fas fa-lightbulb text-white text-xs"></i>
          </div>
          <div>
            <h4 className="text-sm font-black text-amber-800 mb-1">Pro Tip</h4>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              The more you track, the smarter your insights become. Try to log transactions daily for the most accurate analysis!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsView;
