export type TransactionType = 
  | 'expense' 
  | 'income' 
  | 'transfer' 
  | 'credit_receivable' 
  | 'credit_payable' 
  | 'loan_receivable' 
  | 'loan_payable'
  | 'payment_received'
  | 'payment_made';

export type AccountType = 'cash' | 'bank';
export type DebtStatus = 'open' | 'partial' | 'settled';

export type AttachmentType = 'image' | 'audio';

export interface Attachment {
  id: string;
  type: AttachmentType;
  mimeType: string;
  dataUrl: string;
  name?: string;
  durationMs?: number;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export interface Language {
  code: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'pt', nativeName: 'Português' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'it', nativeName: 'Italiano' },
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'vi', nativeName: 'Tiếng Việt' },
  { code: 'th', nativeName: 'ไทย' },
  { code: 'zh', nativeName: '中文' },
  { code: 'ja', nativeName: '日本語' },
  { code: 'ko', nativeName: '한국어' },
  { code: 'ru', nativeName: 'Русский' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'hi', nativeName: 'हिन्दी' },
];

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  date: string;
  dueDate?: string;
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  account: AccountType;
  contact?: string;
  contactId?: string;
  linkedTransactionId?: string;
  remainingAmount?: number;
  status?: DebtStatus;
  metadata?: {
    interestRate?: number;
    termMonths?: number;
    isReminded?: boolean;
  };
}

export interface BalanceSummary {
  cash: number;
  credit: number;
  loan: number;
  bank: number;
}

export interface DraftTransaction extends Transaction {
  actionStatus: 'pending' | 'confirmed' | 'discarded';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'processing' | 'done' | 'error';
  drafts?: DraftTransaction[];
  attachments?: Attachment[];
}

export interface GeminiParsedTransaction {
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  account: AccountType;
  contact?: string;
  dueDate?: string;
  interestRate?: number;
  termMonths?: number;
  linkedTransactionId?: string;
}

export interface GeminiResponse {
  transactions: GeminiParsedTransaction[];
  isQuestion: boolean;
  questionResponse?: string;
  isCorrection?: boolean;
}
