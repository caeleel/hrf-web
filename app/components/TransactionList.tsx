'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MarkedTransaction {
  id: string;
  counterparty_name: string;
  counterparty_id: string;
  amount: number;
  is_debit: boolean;
  credited_user_id: number | null;
  credited_username: string | null;
  type: string;
  transaction_type: string;
  is_internal: boolean;
  account_id: string;
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
        className="py-1 w-18 bg-transparent outline-none"
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

function TypeDropdown({
  transaction,
  onTypeChange
}: {
  transaction: MarkedTransaction;
  onTypeChange: (type: string) => Promise<void>;
}) {
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = async (value: string) => {
    setIsChanging(true);
    try {
      await onTypeChange(value);
    } finally {
      setIsChanging(false);
    }
  };

  const options = transaction.amount > 0
    ? [
      { label: 'Income', value: 'income' },
      { label: 'Deposit', value: 'deposit' }
    ]
    : [
      { label: 'Expense', value: 'expense' },
      { label: 'Distribution', value: 'distribution' }
    ];

  return (
    <select
      value={transaction.transaction_type}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isChanging || transaction.is_internal}
      className={`block w-full py-1 bg-transparent outline-none capitalize ${transaction.is_internal ? 'text-gray-500' : ''}`}
    >
      {transaction.is_internal ? (
        <option value="internal">Internal</option>
      ) : (
        options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))
      )}
    </select>
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
  const [rememberMapModal, setRememberMapModal] = useState<{
    show: boolean;
    transaction: MarkedTransaction;
    userId: number | null;
  } | null>(null);
  const [showExpenseNotification, setShowExpenseNotification] = useState(true);
  const [isAutoMarking, setIsAutoMarking] = useState(false);
  const [autoMarkProgress, setAutoMarkProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions);
      setLoading(false);

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
        ? { ...t, credited_user_id: userId, credited_username: userId === 1 ? 'karl' : userId === 2 ? 'chang' : null, type: transaction.transaction_type }
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
          accountId: transaction.account_id,
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

  const getUnmarkedExpenses = () => {
    return transactions.filter(t =>
      t.transaction_type === 'expense' && t.type === 'unassigned'
    );
  };

  const handleAutoMark = async () => {
    const unmarkedExpenses = getUnmarkedExpenses();
    setIsAutoMarking(true);
    setAutoMarkProgress({ current: 0, total: unmarkedExpenses.length });

    try {
      for (let i = 0; i < unmarkedExpenses.length; i++) {
        await handleAssign(unmarkedExpenses[i], null, false);
        setAutoMarkProgress(prev => ({ ...prev, current: i + 1 }));
      }
    } finally {
      setIsAutoMarking(false);
      setShowExpenseNotification(false);
    }
  };

  const handleTypeChange = async (transaction: MarkedTransaction, newType: string) => {
    // Optimistically update the UI
    setTransactions(prev => prev.map(t =>
      t.id === transaction.id
        ? { ...t, transaction_type: newType }
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
          creditedUserId: transaction.credited_user_id,
          accountId: transaction.account_id,
          type: newType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction type');
      }
    } catch (err) {
      console.error('Error updating transaction type:', err);
      // Revert optimistic update on error
      await fetchTransactions();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="w-full">
      <div className="lg:hidden h-12 w-full"/>
      <div className="sm:text-base text-xs">
        <div className="hidden sm:grid sm:grid-cols-[80px,minmax(240px,1fr),120px,80px] lg:grid-cols-[80px,minmax(300px,1fr),100px,120px,100px,80px] gap-2 p-6 border-b font-semibold">
          <div>Date</div>
          <div>From / To</div>
          <div className="hidden lg:block">Category</div>
          <div>Amount</div>
          <div className="hidden lg:block">Type</div>
          <div className="pl-1 text-right">Credit to</div>
        </div>
        <div className="sm:hidden flex items-center justify-between p-6 border-b font-semibold">
          <div>
            <div>Date</div>
            <div>From / To</div>
            <div>Amount</div>
          </div>
          <div className="text-right">Credit to</div>
        </div>
        {transactions.map(transaction => (
          <Fragment key={transaction.id}>
            <div
              className="hidden sm:grid grid-cols-[80px,minmax(240px,1fr),120px,80px] lg:grid-cols-[80px,minmax(300px,1fr),100px,120px,100px,80px] gap-2 p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="text-gray-600 items-center flex">
                {new Date(transaction.posted_at).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: '2-digit'
                })}
              </div>
              <div className="truncate flex items-center gap-2">
                {transaction.counterparty_name}
                {transaction.transaction_type === 'expense' && transaction.type === 'unassigned' && (
                  <span className="bg-red-100 text-red-800 text-[10px] px-2 rounded-full font-semibold">
                    NEEDS REVIEW
                  </span>
                )}
              </div>
              <div className="hidden lg:block">{transaction.account_id === '202417010376' ? 'Studio' : 'LLC'}</div>
              <div className={`${transaction.is_debit ? 'text-red-500' : 'text-black'}`}>
                ${Math.abs(transaction.amount).toFixed(2)}
              </div>
              <div className="hidden lg:block">
                <TypeDropdown
                  transaction={transaction}
                  onTypeChange={(newType) => handleTypeChange(transaction, newType)}
                />
              </div>
              <AssignmentDropdown
                transaction={transaction}
                onAssign={(userId) => handleAssign(transaction, userId)}
              />
            </div>
            <div
              className="sm:hidden flex items-center justify-between p-6"
            >
              <div>
                <div className="text-gray-600 items-center flex">
                  {new Date(transaction.posted_at).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                  })}
                </div>
                <div className="truncate">{transaction.counterparty_name}</div>
                <div className={`${transaction.is_debit ? 'text-red-500' : 'text-black'}`}>
                  ${Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
              <AssignmentDropdown
                transaction={transaction}
                onAssign={(userId) => handleAssign(transaction, userId)}
              />
            </div>
          </Fragment>
        ))}
      </div>
      <div className="w-full h-32" />

      <AnimatePresence>
        {showExpenseNotification && getUnmarkedExpenses().length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg"
          >
            <div className="mx-auto flex items-center justify-end gap-8">
              <div className="text-gray-700">
                There are currently {getUnmarkedExpenses().length} expenses waiting to be marked
              </div>
              <div className="flex items-center gap-4">
                {isAutoMarking ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5">
                      <div className="w-full h-full border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
                    </div>
                    <span className="text-gray-600">
                      {autoMarkProgress.current}/{autoMarkProgress.total}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleAutoMark}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Auto-mark
                  </button>
                )}
                <button
                  onClick={() => setShowExpenseNotification(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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