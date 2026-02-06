import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Transaction, BalanceSummary, Message, DraftTransaction, Currency, CURRENCIES, Attachment, Language, LANGUAGES } from './types';
import BalanceCards from './components/BalanceCards';
import TransactionList from './components/TransactionList';
import ChatInterface from './components/ChatInterface';
import CreditManagement from './components/CreditManagement';
import LedgerView from './components/LedgerView';
import InsightsView from './components/InsightsView';
import AuthScreen from './components/AuthScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { 
  transactionsApi, 
  contactsApi, 
  messagesApi,
  draftsApi,
  aiApi,
  insightsApi,
  TransactionResponse,
  ContactResponse,
  MessageResponse,
  DraftResponse,
  TransactionCreate,
  HealthScoreResponse
} from './services/api';

type ViewMode = 'home' | 'assistant' | 'history' | 'portfolio' | 'ledger' | 'insights';

const mapApiTransaction = (tx: TransactionResponse): Transaction => ({
  id: tx.id,
  date: tx.date,
  dueDate: tx.due_date || undefined,
  amount: tx.amount,
  description: tx.description,
  category: tx.category || '',
  type: tx.type as Transaction['type'],
  account: tx.account as Transaction['account'],
  contact: tx.contact_name || undefined,
  contactId: tx.contact_id || undefined,
  linkedTransactionId: tx.linked_transaction_id || undefined,
  remainingAmount: tx.remaining_amount || undefined,
  status: tx.status as Transaction['status'] || undefined,
});

const mapApiContact = (c: ContactResponse): { id: string; name: string; phone?: string; email?: string; note?: string; createdAt: string } => ({
  id: c.id,
  name: c.name,
  phone: c.phone || undefined,
  email: c.email || undefined,
  note: c.note || undefined,
  createdAt: c.created_at,
});

const mapApiDraft = (d: DraftResponse): DraftTransaction => ({
  id: d.id,
  date: d.date,  // Use the transaction occurring date, not created_at
  amount: d.amount,
  description: d.description,
  category: d.category || '',
  type: d.type as DraftTransaction['type'],
  account: d.account as DraftTransaction['account'],
  contact: d.contact_name || undefined,
  contactId: d.contact_id || undefined,
  dueDate: d.due_date || undefined,
  linkedTransactionId: d.linked_transaction_id || undefined,
  actionStatus: 'pending',
});

const MainApp: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [activeView, setActiveView] = useState<ViewMode>('home');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone?: string; email?: string; note?: string; createdAt: string }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<DraftTransaction[]>([]);
  
  const [currency, setCurrency] = useState<Currency>(() => {
    const code = user?.preferred_currency || 'USD';
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  });
  
  const [language, setLanguage] = useState<Language>(() => {
    const code = user?.preferred_language || 'en';
    return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
  });

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Cash reconciliation state
  const [showCashUpdate, setShowCashUpdate] = useState(false);
  const [cashUpdateMode, setCashUpdateMode] = useState<'total' | 'today'>('total');
  const [cashUpdateAmount, setCashUpdateAmount] = useState('');
  const [dailyStartingCash, setDailyStartingCash] = useState<{ date: string; amount: number } | null>(() => {
    const saved = localStorage.getItem('dailyStartingCash');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date === today) return parsed;
    }
    return null;
  });
  
  // Initial cash setup state (for new users)
  const [hasInitialCash, setHasInitialCash] = useState<boolean>(() => {
    return localStorage.getItem('hasInitialCash') === 'true';
  });
  const [showInitialCashSetup, setShowInitialCashSetup] = useState(false);
  const [initialCashAmount, setInitialCashAmount] = useState('');
  
  // Cached health score - persists across tab switches
  const [cachedHealthScore, setCachedHealthScore] = useState<HealthScoreResponse | null>(null);

  // Map API message to local Message type
  const mapApiMessage = (m: MessageResponse): Message => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: new Date(m.timestamp),
    drafts: m.drafts_json as DraftTransaction[] | undefined,
    attachments: m.attachments_json as Attachment[] | undefined,
  });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [txResponse, contactsResponse, messagesResponse, draftsResponse] = await Promise.all([
        transactionsApi.list(0, 500),
        contactsApi.list(0, 500),
        messagesApi.list(0, 500),
        draftsApi.list('pending', 0, 500),
      ]);
      setTransactions(txResponse.transactions.map(mapApiTransaction));
      setContacts(contactsResponse.contacts.map(mapApiContact));
      setMessages(messagesResponse.messages.map(mapApiMessage));
      setPendingDrafts(draftsResponse.drafts.map(mapApiDraft));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper to save message to backend and update local state
  const saveMessage = async (
    role: 'user' | 'assistant',
    content: string,
    drafts?: DraftTransaction[],
    attachments?: Attachment[]
  ): Promise<Message> => {
    const apiAttachments = attachments?.map(a => ({
      id: a.id,
      type: a.type,
      mime_type: a.mimeType,
      data_url: a.dataUrl,
      name: a.name,
      duration_ms: a.durationMs,
    }));

    try {
      const saved = await messagesApi.create({
        role,
        content,
        drafts_json: drafts,
        attachments: apiAttachments,
      });
      
      const localMessage: Message = {
        id: saved.id,
        role: saved.role as 'user' | 'assistant',
        content: saved.content,
        timestamp: new Date(saved.timestamp),
        drafts,
        attachments,
      };
      
      setMessages(prev => [...prev, localMessage]);
      return localMessage;
    } catch (error) {
      console.error('Failed to save message:', error);
      // Fallback to local-only message
      const localMessage: Message = {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
        drafts,
        attachments,
      };
      setMessages(prev => [...prev, localMessage]);
      return localMessage;
    }
  };

  // Update user preferences when currency/language changes
  const handleCurrencyChange = async (c: Currency) => {
    setCurrency(c);
    setShowCurrencyPicker(false);
    try {
      await updateUser({ preferred_currency: c.code });
    } catch (error) {
      console.error('Failed to update currency preference:', error);
    }
  };

  const handleLanguageChange = async (l: Language) => {
    setLanguage(l);
    setShowLanguagePicker(false);
    try {
      await updateUser({ preferred_language: l.code });
    } catch (error) {
      console.error('Failed to update language preference:', error);
    }
  };

  const balances = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const amt = tx.amount;
      const acct = tx.account;

      switch (tx.type) {
        case 'income': 
          acc[acct] += amt; 
          break;
        case 'expense': 
          acc[acct] -= amt; 
          break;
        case 'credit_receivable': 
          acc.credit += amt; 
          break;
        case 'credit_payable': 
          acc.loan += amt; 
          break;
        case 'loan_receivable': 
          acc[acct] -= amt;
          acc.credit += amt; 
          break;
        case 'loan_payable': 
          acc[acct] += amt;
          acc.loan += amt; 
          break;
        case 'payment_received':
          acc[acct] += amt;
          acc.credit -= amt;
          break;
        case 'payment_made':
          acc[acct] -= amt;
          acc.loan -= amt;
          break;
        case 'transfer': 
          acc[acct] -= amt; 
          break;
      }

      return acc;
    }, { cash: 0, bank: 0, credit: 0, loan: 0 } as BalanceSummary);
  }, [transactions]);

  // Today's cash flow calculation
  const todayCash = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date);
        txDate.setHours(0, 0, 0, 0);
        // Exclude initial_balance and adjustment categories from today's count
        const isInitialOrAdjustment = tx.category === 'initial_balance' || tx.category === 'adjustment';
        return txDate.getTime() === today.getTime() && tx.account === 'cash' && !isInitialOrAdjustment;
      })
      .reduce((acc, tx) => {
        switch (tx.type) {
          case 'income':
          case 'payment_received':
          case 'loan_payable':
            return { ...acc, income: acc.income + tx.amount };
          case 'expense':
          case 'payment_made':
          case 'loan_receivable':
            return { ...acc, expense: acc.expense + tx.amount };
          default:
            return acc;
        }
      }, { income: 0, expense: 0 });
  }, [transactions]);

  const openDebts = useMemo(() => {
    return transactions.filter(t => 
      ['credit_receivable', 'credit_payable', 'loan_receivable', 'loan_payable'].includes(t.type) &&
      t.status !== 'settled'
    );
  }, [transactions]);

  // Handle TOTAL cash update - adjusts overall balance
  const handleTotalCashUpdate = useCallback(async (actualCash: number) => {
    const currentCash = balances.cash;
    const difference = actualCash - currentCash;
    
    if (Math.abs(difference) > 0.01) {
      try {
        const txData: TransactionCreate = {
          date: new Date().toISOString(),
          amount: Math.abs(difference),
          description: difference > 0 ? 'Cash adjustment (found extra)' : 'Cash adjustment (missing)',
          category: 'adjustment',
          type: difference > 0 ? 'income' : 'expense',
          account: 'cash',
        };
        const newTx = await transactionsApi.create(txData);
        setTransactions(prev => [mapApiTransaction(newTx), ...prev]);
      } catch (error) {
        console.error('Failed to create adjustment:', error);
      }
    }
    
    setShowCashUpdate(false);
    setCashUpdateAmount('');
  }, [balances.cash]);

  // Handle TODAY's cash update - user says "I made X today"
  const handleTodayCashUpdate = useCallback(async (actualTodayCash: number) => {
    const currentTodayNet = todayCash.income - todayCash.expense;
    const difference = actualTodayCash - currentTodayNet;
    
    if (Math.abs(difference) > 0.01) {
      try {
        const txData: TransactionCreate = {
          date: new Date().toISOString(),
          amount: Math.abs(difference),
          description: difference > 0 ? 'Unlogged income today' : 'Unlogged expense today',
          category: 'unlogged',
          type: difference > 0 ? 'income' : 'expense',
          account: 'cash',
        };
        const newTx = await transactionsApi.create(txData);
        setTransactions(prev => [mapApiTransaction(newTx), ...prev]);
      } catch (error) {
        console.error('Failed to create today adjustment:', error);
      }
    }
    
    setShowCashUpdate(false);
    setCashUpdateAmount('');
  }, [todayCash]);

  // Handle initial cash setup for new users
  const handleInitialCashSetup = useCallback(async (amount: number) => {
    try {
      // Backdate to yesterday so it doesn't count as today's income
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0); // Set to noon yesterday
      
      const txData: TransactionCreate = {
        date: yesterday.toISOString(),
        amount: amount,
        description: 'Initial cash balance',
        category: 'initial_balance',
        type: 'income',
        account: 'cash',
      };
      const newTx = await transactionsApi.create(txData);
      setTransactions(prev => [mapApiTransaction(newTx), ...prev]);
      
      // Mark as completed
      localStorage.setItem('hasInitialCash', 'true');
      setHasInitialCash(true);
      setShowInitialCashSetup(false);
      setInitialCashAmount('');
    } catch (error) {
      console.error('Failed to set initial cash:', error);
    }
  }, []);

  // Show initial cash setup prompt for new users
  useEffect(() => {
    if (!isLoading && transactions.length === 0 && !hasInitialCash) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => setShowInitialCashSetup(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, transactions.length, hasInitialCash]);

  const addContact = useCallback(async (name: string, phone?: string, email?: string, note?: string) => {
    try {
      const newContact = await contactsApi.create({ name, phone, email, note });
      const mapped = mapApiContact(newContact);
      setContacts(prev => [...prev, mapped]);
      return mapped;
    } catch (error) {
      console.error('Failed to create contact:', error);
      throw error;
    }
  }, []);

  const updateContact = useCallback(async (id: string, updates: Partial<{ name: string; phone?: string; email?: string; note?: string }>) => {
    try {
      await contactsApi.update(id, updates);
      setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  }, []);

  const detectLanguageFromText = (text: string): Language | null => {
    const value = text.trim();
    if (!value) return null;
    const letterChars = value.replace(/[^\p{L}]/gu, '');
    if (letterChars.length < 3) return null;

    const share = (re: RegExp) => {
      const matches = letterChars.match(re);
      return matches ? matches.length / letterChars.length : 0;
    };

    if (share(/[\u0600-\u06FF]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'ar') || null;
    if (share(/[\u0900-\u097F]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'hi') || null;
    if (share(/[\u0E00-\u0E7F]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'th') || null;
    if (share(/[\u0400-\u04FF]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'ru') || null;
    if (share(/[\u4E00-\u9FFF]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'zh') || null;
    if (share(/[\u3040-\u30FF]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'ja') || null;
    if (share(/[\uAC00-\uD7AF]/g) >= 0.3) return LANGUAGES.find(l => l.code === 'ko') || null;
    return null;
  };

  const getLanguageLabel = (target: Language, uiLang: Language) => {
    try {
      const display = new Intl.DisplayNames([uiLang.code], { type: 'language' });
      return display.of(target.code) || target.nativeName;
    } catch {
      return target.nativeName;
    }
  };

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    const detected = detectLanguageFromText(text);
    const nextLanguage = detected || language;
    if (detected && detected.code !== language.code) {
      setLanguage(detected);
    }
    
    // Save user message to backend
    await saveMessage('user', text, undefined, attachments.length > 0 ? attachments : undefined);
    setIsProcessing(true);

    try {
      const apiAttachments = attachments.map(a => ({
        id: a.id,
        type: a.type,
        mime_type: a.mimeType,
        data_url: a.dataUrl,
        name: a.name,
        duration_ms: a.durationMs,
      }));

      const response = await aiApi.parse({
        input_text: text,
        history: messages.slice(-3).map(m => ({ role: m.role, content: m.content })),
        pending_drafts: pendingDrafts.map(d => ({
          type: d.type,
          account: d.account,
          amount: d.amount,
          description: d.description,
          category: d.category,
          contact: d.contact,
          dueDate: d.dueDate,
          linkedTransactionId: d.linkedTransactionId,
        })),
        open_debts: openDebts.map(d => ({
          id: d.id,
          contact: d.contact,
          remaining_amount: d.remainingAmount ?? d.amount,
          type: d.type,
        })),
        currency_code: currency.code,
        currency_symbol: currency.symbol,
        language_code: nextLanguage.code,
        attachments: apiAttachments,
      });

      let assistantContent = response.question_response || "";

      if (response.transactions && response.transactions.length > 0) {
        // Create drafts in the backend
        const draftsToCreate = response.transactions.map(t => {
          const targetContact = contacts.find(c => c.name.toLowerCase() === t.contact?.toLowerCase());
          return {
            date: t.date,  // Transaction occurring date from AI (defaults to today)
            amount: t.amount,
            description: t.description,
            category: t.category || '',
            type: t.type,
            account: t.account,
            contact_name: t.contact,
            contact_id: targetContact?.id,
            due_date: t.due_date,
            linked_transaction_id: t.linked_transaction_id,
          };
        });

        // Save drafts to backend
        const savedDrafts = await draftsApi.createBatch(draftsToCreate);
        
        // Update local state with saved drafts
        setPendingDrafts(prev => [...prev, ...savedDrafts.map(mapApiDraft)]);

        const feedbackCount = savedDrafts.length;
        const feedbackMsg = assistantContent || (feedbackCount > 1 
          ? `I've prepared ${feedbackCount} entries for your review.` 
          : "I've extracted an entry. Does this look correct?");

        await saveMessage('assistant', feedbackMsg);
      } else if (assistantContent) {
        await saveMessage('assistant', assistantContent);
      }
    } catch (error: any) {
      const errorMessage = error.status === 429 
        ? "You've hit the current project's quota. Please try again later."
        : "I hit a snag. Please try again in a moment.";
      
      await saveMessage('assistant', errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDraft = async (draftId: string) => {
    const draft = pendingDrafts.find(d => d.id === draftId);
    if (!draft) return;

    try {
      // Use the backend drafts API to confirm - it handles contact creation and transaction creation
      await draftsApi.confirm(draftId);
      await fetchData();

      const typeLabel = draft.type.replace('_receivable', '').replace('_payable', '').replace('_', ' ');
      const flowArrow = ['income', 'loan_payable', 'payment_received'].includes(draft.type) ? '←' : '→';
      let feedback = `✅ Synced Record\n${draft.description}\n${currency.symbol}${draft.amount.toLocaleString()} [${typeLabel.toUpperCase()}]\n${draft.account.toUpperCase()} ${flowArrow} ${draft.contact ? `@${draft.contact}` : ''}`;
      
      if (draft.linkedTransactionId) {
        feedback += `\n🔗 Linked to existing debt`;
      }
      
      await saveMessage('assistant', feedback);
    } catch (error) {
      console.error('Failed to confirm draft:', error);
      await saveMessage('assistant', '❌ Failed to sync record. Please try again.');
    }
  };

  const discardDraft = async (draftId: string) => {
    try {
      await draftsApi.discard(draftId);
      setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    } catch (error) {
      console.error('Failed to discard draft:', error);
    }
  };

  const updateDraft = async (draftId: string, updates: Partial<Transaction>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.account !== undefined) updateData.account = updates.account;
      if (updates.contact !== undefined) updateData.contact_name = updates.contact;
      if (updates.contactId !== undefined) updateData.contact_id = updates.contactId;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.linkedTransactionId !== undefined) updateData.linked_transaction_id = updates.linkedTransactionId;
      
      const updated = await draftsApi.update(draftId, updateData);
      setPendingDrafts(prev => prev.map(d => d.id === draftId ? mapApiDraft(updated) : d));
    } catch (error) {
      console.error('Failed to update draft:', error);
    }
  };

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await transactionsApi.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#fdfdfd] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#fdfdfd] flex flex-col overflow-hidden text-slate-900 select-none max-w-md mx-auto shadow-2xl relative border-x border-slate-100">
      <header className="px-5 pt-6 pb-4 flex flex-col bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-50">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-indigo-600 leading-none">VanTrack.</h1>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Intelligence Layer</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowLanguagePicker(true)}
              className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-200 transition-all"
            >
              {language.code.toUpperCase()}
            </button>
            <button 
              onClick={() => setShowCurrencyPicker(true)}
              className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 hover:bg-slate-200 transition-all"
            >
              {currency.symbol} {currency.code}
            </button>
            <div className="text-right">
              <span className="text-[8px] font-black text-slate-400 block uppercase leading-none mb-1">Net Worth</span>
              <span className="text-base font-black leading-none">{currency.symbol}{(balances.cash + balances.bank + balances.credit - balances.loan).toLocaleString()}</span>
            </div>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt text-[10px]"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Currency Picker Modal */}
      {showCurrencyPicker && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center animate-in fade-in duration-200" onClick={() => setShowCurrencyPicker(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900">Select Currency</h3>
              <button onClick={() => setShowCurrencyPicker(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => handleCurrencyChange(c)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    currency.code === c.code 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-lg font-black">{c.symbol}</div>
                  <div className="text-[8px] font-bold uppercase">{c.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center animate-in fade-in duration-200" onClick={() => setShowLanguagePicker(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900">Select Language</h3>
              <button onClick={() => setShowLanguagePicker(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    language.code === l.code 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase">{l.code}</div>
                  <div className="text-[11px] font-bold">
                    {getLanguageLabel(l, language)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Initial Cash Setup Modal (for new users) */}
      {showInitialCashSetup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
                <i className="fas fa-wallet text-white text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Welcome! Set Your Cash</h3>
              <p className="text-sm text-slate-500">How much cash do you have right now? This will be your starting balance.</p>
            </div>

            <div className="mb-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">{currency.symbol}</span>
                <input
                  type="number"
                  value={initialCashAmount}
                  onChange={(e) => setInitialCashAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-14 pr-4 py-5 text-3xl font-black text-center border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-0 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  if (initialCashAmount && parseFloat(initialCashAmount) > 0) {
                    handleInitialCashSetup(parseFloat(initialCashAmount));
                  }
                }}
                disabled={!initialCashAmount || parseFloat(initialCashAmount) <= 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
              >
                <i className="fas fa-check mr-2"></i>
                Set Initial Balance
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('hasInitialCash', 'true');
                  setHasInitialCash(true);
                  setShowInitialCashSetup(false);
                }}
                className="w-full py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
              >
                Skip for now (start from zero)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Update Modal */}
      {showCashUpdate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Update Cash</h3>
              <button 
                onClick={() => { setShowCashUpdate(false); setCashUpdateAmount(''); setCashUpdateMode('total'); }}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setCashUpdateMode('total'); setCashUpdateAmount(''); }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  cashUpdateMode === 'total'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="fas fa-wallet mr-2"></i>
                Total Cash
              </button>
              <button
                onClick={() => { setCashUpdateMode('today'); setCashUpdateAmount(''); }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  cashUpdateMode === 'today'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="fas fa-calendar-day mr-2"></i>
                Today's Cash
              </button>
            </div>

            {/* TOTAL CASH MODE */}
            {cashUpdateMode === 'total' && (
              <>
                <div className="bg-emerald-50 rounded-2xl p-4 text-center mb-4">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Current Total (Calculated)</span>
                  <div className="text-2xl font-black text-emerald-700">{currency.symbol}{balances.cash.toLocaleString()}</div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    How much cash do you actually have?
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">{currency.symbol}</span>
                    <input
                      type="number"
                      value={cashUpdateAmount}
                      onChange={(e) => setCashUpdateAmount(e.target.value)}
                      placeholder="Count all your cash..."
                      className="w-full pl-12 pr-4 py-4 text-xl font-bold border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:ring-0 outline-none"
                      autoFocus
                    />
                  </div>
                  
                  {cashUpdateAmount && parseFloat(cashUpdateAmount) !== balances.cash && (
                    <div className={`mt-3 p-3 rounded-xl ${parseFloat(cashUpdateAmount) > balances.cash ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <div className="flex items-center gap-2">
                        <i className={`fas ${parseFloat(cashUpdateAmount) > balances.cash ? 'fa-plus-circle text-emerald-500' : 'fa-minus-circle text-rose-500'}`}></i>
                        <span className={`text-sm font-bold ${parseFloat(cashUpdateAmount) > balances.cash ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {parseFloat(cashUpdateAmount) > balances.cash ? 'Found extra: ' : 'Missing: '}
                          {currency.symbol}{Math.abs(parseFloat(cashUpdateAmount) - balances.cash).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">An adjustment will be created</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (cashUpdateAmount) {
                      handleTotalCashUpdate(parseFloat(cashUpdateAmount));
                    }
                  }}
                  disabled={!cashUpdateAmount}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fas fa-check mr-2"></i>
                  Update Total Cash
                </button>
              </>
            )}

            {/* TODAY'S CASH MODE */}
            {cashUpdateMode === 'today' && (
              <>
                <div className="bg-blue-50 rounded-2xl p-4 text-center mb-4">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Today's Net (Calculated)</span>
                  <div className="text-2xl font-black text-blue-700">
                    {todayCash.income - todayCash.expense >= 0 ? '+' : ''}{currency.symbol}{(todayCash.income - todayCash.expense).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-500 mt-1">
                    In: {currency.symbol}{todayCash.income.toLocaleString()} | Out: {currency.symbol}{todayCash.expense.toLocaleString()}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    What's your actual net for today? (+ profit, - loss)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">{currency.symbol}</span>
                    <input
                      type="number"
                      value={cashUpdateAmount}
                      onChange={(e) => setCashUpdateAmount(e.target.value)}
                      placeholder="e.g. 500 or -200"
                      className="w-full pl-12 pr-4 py-4 text-xl font-bold border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-0 outline-none"
                      autoFocus
                    />
                  </div>
                  
                  {cashUpdateAmount && parseFloat(cashUpdateAmount) !== (todayCash.income - todayCash.expense) && (
                    <div className={`mt-3 p-3 rounded-xl ${parseFloat(cashUpdateAmount) > (todayCash.income - todayCash.expense) ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <div className="flex items-center gap-2">
                        <i className={`fas ${parseFloat(cashUpdateAmount) > (todayCash.income - todayCash.expense) ? 'fa-plus-circle text-emerald-500' : 'fa-minus-circle text-rose-500'}`}></i>
                        <span className={`text-sm font-bold ${parseFloat(cashUpdateAmount) > (todayCash.income - todayCash.expense) ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {parseFloat(cashUpdateAmount) > (todayCash.income - todayCash.expense) ? 'Unlogged income: ' : 'Unlogged expense: '}
                          {currency.symbol}{Math.abs(parseFloat(cashUpdateAmount) - (todayCash.income - todayCash.expense)).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">A transaction will be added for today</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (cashUpdateAmount !== '') {
                      handleTodayCashUpdate(parseFloat(cashUpdateAmount));
                    }
                  }}
                  disabled={cashUpdateAmount === ''}
                  className="w-full py-4 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <i className="fas fa-check mr-2"></i>
                  Update Today's Cash
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-3">
                  Use this when you forgot to log some transactions today
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden flex flex-col pb-20">
        {activeView === 'home' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Cash Balance Hero - Tappable */}
            <div 
              onClick={() => setShowCashUpdate(true)}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-xl shadow-emerald-100 cursor-pointer hover:shadow-2xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <i className="fas fa-wallet text-lg"></i>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Cash on Hand</span>
                    <div className="text-2xl font-black leading-none">
                      {currency.symbol}{balances.cash.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 block">
                    {dailyStartingCash ? 'Since Start' : 'Today'}
                  </span>
                  <div className="text-lg font-black">
                    {dailyStartingCash 
                      ? `${balances.cash - dailyStartingCash.amount >= 0 ? '+' : ''}${currency.symbol}${(balances.cash - dailyStartingCash.amount).toLocaleString()}`
                      : `${todayCash.income - todayCash.expense >= 0 ? '+' : ''}${currency.symbol}${(todayCash.income - todayCash.expense).toLocaleString()}`
                    }
                  </div>
                </div>
              </div>
              
              {/* Today's breakdown */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <i className="fas fa-arrow-down text-[10px] opacity-80"></i>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">In Today</span>
                  </div>
                  <div className="text-base font-black">{currency.symbol}{todayCash.income.toLocaleString()}</div>
                </div>
                <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <i className="fas fa-arrow-up text-[10px] opacity-80"></i>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">Out Today</span>
                  </div>
                  <div className="text-base font-black">{currency.symbol}{todayCash.expense.toLocaleString()}</div>
                </div>
              </div>
              
              {/* Tap hint */}
              <div className="mt-3 text-center">
                <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider">
                  <i className="fas fa-hand-pointer mr-1"></i> Tap to update cash
                </span>
              </div>
            </div>

            <BalanceCards balances={balances} currencySymbol={currency.symbol} />
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Feed</h2>
              <button onClick={() => setActiveView('history')} className="text-[10px] font-black text-indigo-600 uppercase">Vault</button>
            </div>
            <TransactionList transactions={transactions.slice(0, 10)} onDelete={deleteTransaction} currencySymbol={currency.symbol} />
          </div>
        )}

        {activeView === 'assistant' && (
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 bg-slate-50">
            <ChatInterface 
              messages={messages} 
              contacts={contacts}
              pendingDrafts={pendingDrafts}
              onSendMessage={handleSendMessage} 
              onConfirmDraft={confirmDraft}
              onDiscardDraft={discardDraft}
              onUpdateDraft={updateDraft}
              isProcessing={isProcessing} 
              recentTransactions={transactions.slice(0, 10)}
              onDeleteTransaction={deleteTransaction}
              currencySymbol={currency.symbol}
            />
          </div>
        )}

        {activeView === 'history' && (
          <div className="h-full overflow-y-auto p-5 animate-in fade-in slide-in-from-left-4 duration-500 space-y-4">
            <h2 className="text-xl font-black tracking-tight">Full Vault</h2>
            <TransactionList transactions={transactions} onDelete={deleteTransaction} currencySymbol={currency.symbol} />
          </div>
        )}

        {activeView === 'portfolio' && (
          <div className="h-full overflow-y-auto p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black tracking-tight mb-6">Contacts</h2>
            <CreditManagement 
              transactions={transactions} 
              contacts={contacts} 
              onAddContact={addContact}
              onUpdateContact={updateContact}
              onDelete={deleteTransaction}
              onCreateSplitExpense={async (data) => {
                // Create credit_receivable transactions for each person who owes
                for (const split of data.splits) {
                  if (data.paidBy === 'me' && !split.paid) {
                    // I paid, they owe me
                    await transactionsApi.create({
                      amount: split.amount,
                      description: `${data.description} (split)`,
                      category: 'Split Expense',
                      type: 'credit_receivable',
                      account: 'cash',
                      contact_name: split.contactName,
                      contact_id: split.contactId,
                    });
                  } else if (data.paidBy === split.contactId) {
                    // They paid, I owe them my share
                    await transactionsApi.create({
                      amount: data.totalAmount / (data.splits.length + 1), // My share
                      description: `${data.description} (split - my share)`,
                      category: 'Split Expense',
                      type: 'credit_payable',
                      account: 'cash',
                      contact_name: split.contactName,
                      contact_id: split.contactId,
                    });
                  }
                }
                // Refresh data and invalidate health score cache
                await fetchData();
                setCachedHealthScore(null);
              }}
              currencySymbol={currency.symbol} 
            />
          </div>
        )}

        {activeView === 'ledger' && (
          <div className="h-full overflow-y-auto p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black tracking-tight mb-6">Credit & Loan Ledger</h2>
            <LedgerView 
              transactions={transactions} 
              onDelete={deleteTransaction}
              currencySymbol={currency.symbol} 
            />
          </div>
        )}

        {activeView === 'insights' && (
          <div className="h-full overflow-y-auto p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black tracking-tight mb-6">AI Insights</h2>
            <InsightsView 
              currencySymbol={currency.symbol}
              languageCode={language.code}
              cachedHealthScore={cachedHealthScore}
              onHealthScoreUpdate={setCachedHealthScore}
            />
          </div>
        )}
      </main>

      <nav className="absolute bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center px-2 z-50">
        <button onClick={() => setActiveView('home')} className={`flex flex-col items-center gap-1 ${activeView === 'home' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-th-large text-base"></i>
          <span className="text-[6px] font-black uppercase tracking-tighter">Home</span>
        </button>
        <button onClick={() => setActiveView('portfolio')} className={`flex flex-col items-center gap-1 ${activeView === 'portfolio' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-address-book text-base"></i>
          <span className="text-[6px] font-black uppercase tracking-tighter">Contacts</span>
        </button>
        <button onClick={() => setActiveView('assistant')} className="relative">
          <div className={`w-11 h-11 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all ${
            activeView === 'assistant'
              ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-indigo-500/40 scale-100 translate-y-0'
              : 'bg-white text-indigo-600 border border-indigo-100 -translate-y-6 scale-110 shadow-2xl shadow-indigo-200/60 ring-4 ring-indigo-500/10 animate-pulse'
          }`}>
            <i className="fas fa-plus text-base"></i>
          </div>
        </button>
        <button onClick={() => setActiveView('ledger')} className={`flex flex-col items-center gap-1 ${activeView === 'ledger' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-file-invoice-dollar text-base"></i>
          <span className="text-[6px] font-black uppercase tracking-tighter">Ledger</span>
        </button>
        <button onClick={() => setActiveView('insights')} className={`flex flex-col items-center gap-1 ${activeView === 'insights' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-brain text-base"></i>
          <span className="text-[6px] font-black uppercase tracking-tighter">Insights</span>
        </button>
        <button onClick={() => setActiveView('history')} className={`flex flex-col items-center gap-1 ${activeView === 'history' ? 'text-indigo-600' : 'text-slate-300'}`}>
          <i className="fas fa-layer-group text-base"></i>
          <span className="text-[6px] font-black uppercase tracking-tighter">Vault</span>
        </button>
      </nav>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#fdfdfd] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <MainApp /> : <AuthScreen />;
};

export default App;
