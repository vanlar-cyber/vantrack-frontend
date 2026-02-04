import React, { useState, useEffect, useRef } from 'react';
import { insightsApi } from '../services/api';

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
}

const InsightsView: React.FC<InsightsViewProps> = ({ currencySymbol, languageCode }) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
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

  useEffect(() => {
    fetchWeeklySummary();
  }, [currencySymbol, languageCode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const suggestedQuestions = [
    "How much did I spend this week?",
    "What's my biggest expense?",
    "Who owes me money?",
    "Compare this vs last month",
  ];

  return (
    <div className="space-y-4">
      {/* Weekly Summary Card - Collapsible */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl overflow-hidden">
        <button
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-sm"></i>
            </div>
            <div className="text-left">
              <h3 className="text-base font-black">Weekly Insights</h3>
              <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">
                {loadingSummary ? 'Analyzing...' : 'Tap to view AI summary'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fetchWeeklySummary(); }}
              disabled={loadingSummary}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
            >
              <i className={`fas fa-sync-alt text-xs ${loadingSummary ? 'animate-spin' : ''}`}></i>
            </button>
            <i className={`fas fa-chevron-down text-sm transition-transform duration-300 ${summaryExpanded ? 'rotate-180' : ''}`}></i>
          </div>
        </button>
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${summaryExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
            {loadingSummary ? (
              <div className="flex items-center gap-3 py-6">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-white/80">Analyzing your finances...</span>
              </div>
            ) : error && !summary ? (
              <div className="py-4 text-white/80 text-sm">{error}</div>
            ) : (
              <div className="text-[12px] leading-relaxed font-medium text-white/90 max-h-[400px] overflow-y-auto">
                {renderMarkdown(summary)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ask AI Section - Chat Style */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col" style={{ height: 'calc(100vh - 340px)', minHeight: '300px' }}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Ask AI</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Chat about your finances
            </p>
          </div>
          {chatHistory.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-[9px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            >
              Clear Chat
            </button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
  );
};

export default InsightsView;
