'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MarkedTransaction {
  id: string;
  counterparty_name: string;
  counterparty_id: string;
  amount: number;
  is_debit: boolean;
  credited_user_id: number | null;
  credited_username: string | null;
  type: string;
  transaction_type: 'income' | 'expense' | 'internal';
  is_internal: boolean;
  posted_at: string;
}

interface RememberMapModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  counterpartyName: string;
}

function RememberMapModal({ onConfirm, onCancel, counterpartyName }: RememberMapModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold mb-4">Remember Assignment</h3>
        <p className="mb-6">
          Would you like to remember this assignment for future transactions with {counterpartyName}?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Yes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AssignmentDropdown({
  transaction,
  onAssign
}: {
  transaction: MarkedTransaction;
  onAssign: (userId: number | null) => Promise<void>;
}) {
  const [isAssigning, setIsAssigning] = useState(false);

  if (transaction.is_internal) {
    return <div className="text-gray-500">Internal Transfer</div>;
  }

  const handleChange = async (value: string) => {
    setIsAssigning(true);
    try {
      const userId = value === '' ? null : parseInt(value);
      await onAssign(userId);
    } finally {
      setIsAssigning(false);
    }
  };

  const options = transaction.transaction_type === 'expense'
    ? [
      { label: 'Both', value: null },
      { label: 'Karl', value: 1 },
      { label: 'Chang', value: 2 }
    ]
    : [
      { label: 'Karl', value: 1 },
      { label: 'Chang', value: 2 },
      { label: 'Auto', value: null }
    ];

  return (
    <div className="flex justify-end">
      <select
        value={transaction.credited_user_id || ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isAssigning}
        className="py-1 w-16 bg-transparent outline-none"
      >
        {options.map(option => (
          <option key={option.label} value={option.value || ''}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex w-full items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
    </div>
  );
}

export function TransactionList() {
  const [transactions, setTransactions] = useState<MarkedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accountFilter, setAccountFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [rememberMapModal, setRememberMapModal] = useState<{
    show: boolean;
    transaction: MarkedTransaction;
    userId: number | null;
  } | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [accountFilter]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const url = accountFilter === 'all'
        ? '/api/transactions'
        : `/api/transactions?account=${accountFilter}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions);

      // Check for unassigned transactions
      const unassignedTransactions = data.transactions.filter((t: MarkedTransaction) => t.type === 'unassigned');
      if (unassignedTransactions.length > 0) {
        // Fetch counterparty map
        const mapResponse = await fetch('/api/counterparty-map');
        if (!mapResponse.ok) {
          throw new Error('Failed to fetch counterparty map');
        }
        const { map } = await mapResponse.json();

        // Process each unassigned transaction that has a mapping
        for (const transaction of unassignedTransactions) {
          const userId = map[transaction.counterparty_id];
          if (userId !== undefined) {
            await handleAssign(transaction, userId, false); // false means don't show remember modal
          }
        }
      }
    } catch (err) {
      setError('Failed to load transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (transaction: MarkedTransaction, userId: number | null, showRememberPrompt = true) => {
    // Optimistically update the UI
    setTransactions(prev => prev.map(t =>
      t.id === transaction.id
        ? { ...t, credited_user_id: userId, credited_username: userId === 1 ? 'karl' : userId === 2 ? 'chang' : null }
        : t
    ));

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          creditedUserId: userId,
          type: transaction.transaction_type
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign transaction');
      }

      // Only show remember modal for manual assignments
      if (showRememberPrompt) {
        setRememberMapModal({
          show: true,
          transaction,
          userId
        });
      }
    } catch (err) {
      console.error('Error assigning transaction:', err);
      // Revert optimistic update on error
      await fetchTransactions();
    }
  };

  const handleRememberMap = async (confirm: boolean) => {
    if (confirm && rememberMapModal) {
      try {
        await fetch('/api/counterparty-map', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            counterpartyId: rememberMapModal.transaction.counterparty_id,
            userId: rememberMapModal.userId,
          }),
        });
      } catch (err) {
        console.error('Error updating counterparty map:', err);
      }
    }
    setRememberMapModal(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-end mb-8 mr-4">
        <div className="px-2 py-1 border">
          <select
            value={accountFilter}
            className="outline-none"
            onChange={(e) => setAccountFilter(e.target.value as typeof accountFilter)}
          >
            <option value="all">All Accounts</option>
            <option value="income">Income Account</option>
            <option value="expense">Expense Account</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(240px,1fr),120px,80px] lg:grid-cols-[minmax(300px,1fr),120px,100px,80px] gap-2 p-6 border-b font-medium">
        <div>From / To</div>
        <div>Amount</div>
        <div className="hidden lg:block">Type</div>
        <div className="pl-1 text-right">Credit to</div>
      </div>
      {transactions.map(transaction => (
        <div
          key={transaction.id}
          className="grid grid-cols-[minmax(240px,1fr),120px,80px] lg:grid-cols-[minmax(300px,1fr),120px,100px,80px] gap-2 p-6 hover:bg-gray-50 transition-colors"
        >
          <div className="truncate">{transaction.counterparty_name}</div>
          <div className={`${transaction.is_debit ? 'text-red-500' : 'text-green-500'}`}>
            ${Math.abs(transaction.amount).toFixed(2)}
          </div>
          <div className="capitalize hidden lg:block">{transaction.transaction_type}</div>
          <AssignmentDropdown
            transaction={transaction}
            onAssign={(userId) => handleAssign(transaction, userId)}
          />
        </div>
      ))}

      <AnimatePresence>
        {rememberMapModal && (
          <RememberMapModal
            counterpartyName={rememberMapModal.transaction.counterparty_name}
            onConfirm={() => handleRememberMap(true)}
            onCancel={() => handleRememberMap(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 