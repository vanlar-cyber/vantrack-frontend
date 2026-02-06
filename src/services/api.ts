const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('vantrack_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(response.status, error.detail || 'Request failed');
  }
  
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

// Auth
export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    request<{ id: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    }),
  
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  
  me: () => request<UserResponse>('/auth/me'),
};

// Users
export const usersApi = {
  getMe: () => request<UserResponse>('/users/me'),
  
  updateMe: (data: { full_name?: string; preferred_currency?: string; preferred_language?: string }) =>
    request<UserResponse>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Transactions
export const transactionsApi = {
  list: (skip = 0, limit = 100, typeFilter?: string) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (typeFilter) params.append('type_filter', typeFilter);
    return request<TransactionListResponse>(`/transactions?${params}`);
  },
  
  create: (data: TransactionCreate) =>
    request<TransactionResponse>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  get: (id: string) => request<TransactionResponse>(`/transactions/${id}`),
  
  update: (id: string, data: Partial<TransactionCreate>) =>
    request<TransactionResponse>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    request<void>(`/transactions/${id}`, { method: 'DELETE' }),
  
  getBalances: () => request<BalanceSummary>('/transactions/balances'),
  
  getOpenDebts: () => request<TransactionResponse[]>('/transactions/open-debts'),
};

// Contacts
export const contactsApi = {
  list: (skip = 0, limit = 100, search?: string) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (search) params.append('search', search);
    return request<ContactListResponse>(`/contacts?${params}`);
  },
  
  create: (data: ContactCreate) =>
    request<ContactResponse>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  get: (id: string) => request<ContactResponse>(`/contacts/${id}`),
  
  update: (id: string, data: Partial<ContactCreate>) =>
    request<ContactResponse>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    request<void>(`/contacts/${id}`, { method: 'DELETE' }),
};

// Messages
export const messagesApi = {
  list: (skip = 0, limit = 100) =>
    request<MessageListResponse>(`/messages?skip=${skip}&limit=${limit}`),
  
  create: (data: MessageCreate) =>
    request<MessageResponse>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  clear: () => request<void>('/messages', { method: 'DELETE' }),
  
  delete: (id: string) =>
    request<void>(`/messages/${id}`, { method: 'DELETE' }),
};

export interface MessageCreate {
  role: 'user' | 'assistant';
  content: string;
  drafts_json?: unknown[];
  attachments?: Attachment[];
}

// Drafts
export const draftsApi = {
  list: (status: 'pending' | 'confirmed' | 'discarded' = 'pending', skip = 0, limit = 100) =>
    request<DraftListResponse>(`/drafts?status_filter=${status}&skip=${skip}&limit=${limit}`),
  
  create: (data: DraftCreate) =>
    request<DraftResponse>('/drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createBatch: (drafts: DraftCreate[]) =>
    request<DraftResponse[]>('/drafts/batch', {
      method: 'POST',
      body: JSON.stringify(drafts),
    }),
  
  get: (id: string) => request<DraftResponse>(`/drafts/${id}`),
  
  update: (id: string, data: Partial<DraftCreate>) =>
    request<DraftResponse>(`/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  confirm: (id: string) =>
    request<TransactionResponse>(`/drafts/${id}/confirm`, { method: 'POST' }),
  
  discard: (id: string) =>
    request<DraftResponse>(`/drafts/${id}/discard`, { method: 'POST' }),
  
  delete: (id: string) =>
    request<void>(`/drafts/${id}`, { method: 'DELETE' }),
};

export interface DraftCreate {
  date?: string;  // Transaction occurring date (defaults to today)
  amount: number;
  description: string;
  category?: string;
  type: string;
  account: string;
  contact_name?: string;
  contact_id?: string;
  due_date?: string;
  linked_transaction_id?: string;
  message_id?: string;
}

export interface DraftResponse {
  id: string;
  user_id: string;
  message_id: string | null;
  date: string;  // Transaction occurring date
  amount: number;
  description: string;
  category: string | null;
  type: string;
  account: string;
  contact_name: string | null;
  contact_id: string | null;
  due_date: string | null;
  linked_transaction_id: string | null;
  status: 'pending' | 'confirmed' | 'discarded';
  created_at: string;
  updated_at: string;
}

export interface DraftListResponse {
  drafts: DraftResponse[];
  total: number;
}

// AI
export const aiApi = {
  parse: (data: AIParseRequest) =>
    request<AIParseResponse>('/ai/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Types
export interface UserResponse {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  preferred_currency: string;
  preferred_language: string;
  created_at: string;
}

export interface TransactionCreate {
  date?: string;
  amount: number;
  description: string;
  category?: string;
  type: string;
  account: string;
  contact_name?: string;
  contact_id?: string;
  due_date?: string;
  linked_transaction_id?: string;
  metadata_json?: Record<string, unknown>;
}

export interface TransactionResponse {
  id: string;
  user_id: string;
  date: string;
  due_date: string | null;
  amount: number;
  description: string;
  category: string | null;
  type: string;
  account: string;
  contact_name: string | null;
  contact_id: string | null;
  linked_transaction_id: string | null;
  remaining_amount: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  transactions: TransactionResponse[];
  total: number;
}

export interface BalanceSummary {
  cash: number;
  bank: number;
  credit: number;
  loan: number;
}

export interface ContactCreate {
  name: string;
  phone?: string;
  email?: string;
  note?: string;
}

export interface ContactResponse {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactListResponse {
  contacts: ContactResponse[];
  total: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio';
  mime_type: string;
  data_url: string;
  name?: string;
  duration_ms?: number;
}

export interface MessageResponse {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  drafts_json: unknown[] | null;
  attachments_json: unknown[] | null;
}

export interface MessageListResponse {
  messages: MessageResponse[];
  total: number;
}

export interface AIParseRequest {
  input_text: string;
  history?: { role: string; content: string }[];
  pending_drafts?: Record<string, unknown>[];
  open_debts?: Record<string, unknown>[];
  currency_code?: string;
  currency_symbol?: string;
  language_code?: string;
  attachments?: Attachment[];
}

export interface ParsedTransaction {
  amount: number;
  description: string;
  category?: string;
  type: string;
  account: string;
  contact?: string;
  date?: string;  // Transaction occurring date (defaults to today)
  due_date?: string;
  linked_transaction_id?: string;
}

export interface AIParseResponse {
  transactions: ParsedTransaction[];
  is_question: boolean;
  question_response?: string;
  is_correction?: boolean;
}

// Insights API
export interface WeeklySummaryResponse {
  summary: string;
}

export interface QuestionRequest {
  question: string;
  currency_symbol?: string;
  language_code?: string;
}

export interface QuestionResponse {
  answer: string;
}

export interface BreakdownItem {
  score: number;
  max: number;
  value: string;
  label: string;
}

export interface HealthBreakdown {
  savings_rate: BreakdownItem;
  debt_ratio: BreakdownItem;
  consistency: BreakdownItem;
  emergency_fund: BreakdownItem;
}

export interface HealthSummary {
  monthly_income: number;
  monthly_expense: number;
  total_receivable: number;
  total_payable: number;
  net_position: number;
}

export interface HealthScoreResponse {
  score: number;
  grade: string;
  grade_color: string;
  breakdown: HealthBreakdown;
  summary: HealthSummary;
  tips: string;
}

export interface ComparisonItem {
  category: string;
  your_value: string;
  your_pct?: string;
  benchmark: string;
  difference: number;
  is_better: boolean;
  insight: string;
}

export interface SpendingComparisonsResponse {
  monthly_income: number;
  monthly_expenses: number;
  comparisons: ComparisonItem[];
  percentile: number;
  summary: string;
}

export interface CashFlowForecast {
  current_balance: number;
  projected_end_of_month: number;
  projected_income: number;
  projected_expenses: number;
  days_remaining: number;
  trend: string;
  message: string;
}

export interface BillReminder {
  name: string;
  amount: number;
  usual_day: number;
  days_until_due: number;
  is_upcoming: boolean;
  message: string;
}

export interface DebtItem {
  id: string;
  description: string;
  contact: string;
  original_amount: number;
  remaining: number;
  due_date?: string;
}

export interface DebtPayoff {
  total_debt: number;
  debt_count: number;
  debts: DebtItem[];
  avg_monthly_payment: number;
  months_to_payoff?: number;
  payoff_date?: string;
  message?: string;
}

export interface SmartPredictionsResponse {
  cash_flow_forecast: CashFlowForecast;
  bill_reminders: BillReminder[];
  debt_payoff: DebtPayoff;
  generated_at: string;
}

export interface NudgeDetails {
  weekly_income?: number;
  weekly_expenses?: number;
  weekly_balance?: number;
  days_left?: number;
}

export interface Nudge {
  type: string;
  icon: string;
  color: string;
  title: string;
  message: string;
  priority?: string;
  details?: NudgeDetails;
}

export interface NudgeSummary {
  weekly_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  days_left_week: number;
  days_left_month: number;
}

export interface ProactiveNudgesResponse {
  nudges: Nudge[];
  summary: NudgeSummary;
  generated_at: string;
}

export interface BudgetCreate {
  name: string;
  type: string;
  category?: string;
  amount: number;
  period?: string;
  alert_at_percent?: number;
}

export interface BudgetTransactionSummary {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string;
}

export interface BudgetResponse {
  id: string;
  name: string;
  type: string;
  category?: string;
  amount: number;
  period: string;
  current_amount: number;
  progress_percent: number;
  alert_at_percent: number;
  is_active: boolean;
  is_over_budget: boolean;
  status: string;
  period_start?: string;
  created_at: string;
  transactions: BudgetTransactionSummary[];
}

export const insightsApi = {
  getWeeklySummary: (currencySymbol: string = '$', languageCode: string = 'en') =>
    request<WeeklySummaryResponse>(`/insights/weekly-summary?currency_symbol=${encodeURIComponent(currencySymbol)}&language_code=${languageCode}`),
  
  askQuestion: (data: QuestionRequest) =>
    request<QuestionResponse>('/insights/ask', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getHealthScore: (currencySymbol: string = '$', languageCode: string = 'en') =>
    request<HealthScoreResponse>(`/insights/health-score?currency_symbol=${encodeURIComponent(currencySymbol)}&language_code=${languageCode}`),
  
  getSpendingComparisons: (currencySymbol: string = '$') =>
    request<SpendingComparisonsResponse>(`/insights/spending-comparisons?currency_symbol=${encodeURIComponent(currencySymbol)}`),
  
  getSmartPredictions: (currencySymbol: string = '$') =>
    request<SmartPredictionsResponse>(`/insights/smart-predictions?currency_symbol=${encodeURIComponent(currencySymbol)}`),
  
  getNudges: (currencySymbol: string = '$') =>
    request<ProactiveNudgesResponse>(`/insights/nudges?currency_symbol=${encodeURIComponent(currencySymbol)}`),
};

export const budgetsApi = {
  getAll: () => request<BudgetResponse[]>('/budgets'),
  
  create: (data: BudgetCreate) =>
    request<BudgetResponse>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<BudgetCreate> & { is_active?: boolean }) =>
    request<BudgetResponse>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    request<void>(`/budgets/${id}`, { method: 'DELETE' }),
};

export { ApiError };
