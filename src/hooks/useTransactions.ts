import { useState, useEffect, useCallback } from 'react';
import { 
  transactionsApi, 
  TransactionResponse, 
  TransactionCreate, 
  BalanceSummary 
} from '../services/api';

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [balances, setBalances] = useState<BalanceSummary>({ cash: 0, bank: 0, credit: 0, loan: 0 });
  const [openDebts, setOpenDebts] = useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await transactionsApi.list(0, 500);
      setTransactions(response.transactions);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchBalances = useCallback(async () => {
    try {
      const response = await transactionsApi.getBalances();
      setBalances(response);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchOpenDebts = useCallback(async () => {
    try {
      const response = await transactionsApi.getOpenDebts();
      setOpenDebts(response);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchTransactions(), fetchBalances(), fetchOpenDebts()]);
    setIsLoading(false);
  }, [fetchTransactions, fetchBalances, fetchOpenDebts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTransaction = async (data: TransactionCreate) => {
    const newTx = await transactionsApi.create(data);
    await refresh();
    return newTx;
  };

  const deleteTransaction = async (id: string) => {
    await transactionsApi.delete(id);
    await refresh();
  };

  const updateTransaction = async (id: string, data: Partial<TransactionCreate>) => {
    const updated = await transactionsApi.update(id, data);
    await refresh();
    return updated;
  };

  return {
    transactions,
    balances,
    openDebts,
    isLoading,
    error,
    refresh,
    createTransaction,
    deleteTransaction,
    updateTransaction,
  };
}
