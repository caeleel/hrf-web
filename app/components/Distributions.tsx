'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Recipient {
  id: string;
  name: string;
}

interface ConfirmModalProps {
  amount: number;
  recipient: Recipient;
  onConfirm: () => void;
  onCancel: () => void;
}

function AmountWithLabel({ amount, label }: { amount: number, label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="text-lg font-medium">
        ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}

function ConfirmModal({ amount, recipient, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg p-6 max-w-md mx-4"
      >
        <h3 className="text-lg font-semibold mb-4">Confirm Distribution</h3>
        <p className="mb-6">
          Are you sure you want to distribute ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} to {recipient.name}?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function Distributions({ llcCapital }: { llcCapital: number }) {
  const [amount, setAmount] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch recipients and bank balance on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipientsResponse, balanceResponse] = await Promise.all([
          fetch('/api/recipients'),
          fetch('/api/balance')
        ]);

        if (!recipientsResponse.ok || !balanceResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const { recipients } = await recipientsResponse.json();
        const { balance } = await balanceResponse.json();

        setRecipients(recipients);
        setBankBalance(balance);
      } catch (err) {
        setError('Failed to load distribution data');
        console.error(err);
      }
    };

    fetchData();
  }, []);

  const maxDistribution = Math.min(bankBalance ?? 0, llcCapital);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const distributionAmount = parseFloat(amount);
    if (isNaN(distributionAmount) || distributionAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (distributionAmount > maxDistribution) {
      setError(`Maximum distribution amount is $${maxDistribution.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      return;
    }

    if (!selectedRecipient) {
      setError('Please select a recipient');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmDistribution = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/distribution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          recipientId: selectedRecipient!.id,
          idempotencyKey: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process distribution');
      }

      // Reset form
      setAmount('');
      setSelectedRecipient(null);
      setShowConfirmModal(false);
    } catch (err) {
      setError('Failed to process distribution');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-16 pb-24 w-full items-center flex flex-col">
      <div className="w-96 p-8 shadow-lg border border-gray-200 rounded-lg">
        <h2 className="text-xl font-semibold mb-6">Distribute Capital</h2>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
          <AmountWithLabel amount={bankBalance ?? 0} label="Bank balance" />
          <AmountWithLabel amount={llcCapital} label="Your LLC capital" />
          <AmountWithLabel amount={maxDistribution} label="Maximum distribution" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient
            </label>
            <select
              value={selectedRecipient?.id || ''}
              onChange={(e) => {
                const recipient = recipients.find(r => r.id === e.target.value);
                setSelectedRecipient(recipient || null);
              }}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select recipient</option>
              {recipients.map(recipient => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Make Distribution'}
          </button>
        </form>

        <AnimatePresence>
          {showConfirmModal && selectedRecipient && (
            <ConfirmModal
              amount={parseFloat(amount)}
              recipient={selectedRecipient}
              onConfirm={handleConfirmDistribution}
              onCancel={() => setShowConfirmModal(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 