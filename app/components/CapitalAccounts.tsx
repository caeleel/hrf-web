'use client';

import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { LoadingSpinner } from './TransactionList';

type Granularity = 'monthly' | 'yearly' | 'all-time';

interface CheckIn {
  username: string;
  check_in_date: string;
}

interface Transaction {
  amount: number;
  credited_user_id: number | null;
  type: string;
  posted_at: string;
}

interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

interface CategoryData {
  name: string;
  chang: { amount: number; count?: number };
  karl: { amount: number; count?: number };
}

interface TimePeriodData {
  timePeriod: string;
  categories: CategoryData[];
}

function getTimeRanges(granularity: Granularity): TimeRange[] {
  const now = new Date();
  const ranges: TimeRange[] = [];

  if (granularity === 'monthly') {
    let current = startOfMonth(now);
    // Go back 12 months
    for (let i = 0; i < 12; i++) {
      ranges.push({
        start: startOfMonth(current),
        end: endOfMonth(current),
        label: format(current, 'MMMM yyyy')
      });
      current = new Date(current.getFullYear(), current.getMonth() - 1);
    }
  } else if (granularity === 'yearly') {
    let current = startOfYear(now);
    // Go back 5 years
    for (let i = 0; i < 5; i++) {
      ranges.push({
        start: startOfYear(current),
        end: endOfYear(current),
        label: format(current, 'yyyy')
      });
      current = new Date(current.getFullYear() - 1, 0);
    }
  }

  // Add all-time range
  ranges.push({
    start: new Date(0),
    end: now,
    label: 'All Time'
  });

  return ranges;
}

function formatAmount(amount: number, count?: number): string {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (count !== undefined) {
    return `${formattedAmount} (${count} x 2,200)`;
  }

  return formattedAmount;
}

function calculateCapitalAccounts(
  timeRanges: TimeRange[],
  checkIns: CheckIn[],
  transactions: Transaction[]
): TimePeriodData[] {
  return timeRanges.map(range => {
    // Filter data for this time range
    const rangeCheckIns = checkIns.filter(ci =>
      new Date(ci.check_in_date) >= range.start &&
      new Date(ci.check_in_date) <= range.end
    );

    const rangeTransactions = transactions.filter(t =>
      new Date(t.posted_at) >= range.start &&
      new Date(t.posted_at) <= range.end
    );

    // Calculate all values
    const changFigmaCount = rangeCheckIns.filter(ci => ci.username.toLowerCase() === 'chang').length;
    const karlFigmaCount = rangeCheckIns.filter(ci => ci.username.toLowerCase() === 'karl').length;
    const changFigmaAmount = changFigmaCount * 2200;
    const karlFigmaAmount = karlFigmaCount * 2200;

    const nonFigmaIncome = rangeTransactions.filter(t => t.type === 'income');
    const changNonFigma = nonFigmaIncome
      .filter(t => t.credited_user_id === 2)
      .reduce((sum, t) => sum + t.amount, 0);
    const karlNonFigma = nonFigmaIncome
      .filter(t => t.credited_user_id === 1)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = rangeTransactions.filter(t => t.type === 'expense');
    let changExpenses = 0;
    let karlExpenses = 0;
    expenses.forEach(e => {
      if (e.credited_user_id === 2) {
        changExpenses += e.amount;
      } else if (e.credited_user_id === 1) {
        karlExpenses += e.amount;
      } else {
        // Split null user_id expenses 50/50
        changExpenses += e.amount / 2;
        karlExpenses += e.amount / 2;
      }
    });

    const distributions = rangeTransactions.filter(t => t.type === 'distribution');
    const changDistributions = distributions
      .filter(t => t.credited_user_id === 2)
      .reduce((sum, t) => sum + t.amount, 0);
    const karlDistributions = distributions
      .filter(t => t.credited_user_id === 1)
      .reduce((sum, t) => sum + t.amount, 0);

    // Skip if all values are 0
    if (
      changFigmaCount === 0 && karlFigmaCount === 0 &&
      changNonFigma === 0 && karlNonFigma === 0 &&
      changExpenses === 0 && karlExpenses === 0 &&
      changDistributions === 0 && karlDistributions === 0
    ) {
      return null;
    }

    // Calculate totals
    const changTotal = changFigmaAmount + Number(changNonFigma) - Number(changExpenses) - Number(changDistributions);
    const karlTotal = karlFigmaAmount + Number(karlNonFigma) - Number(karlExpenses) - Number(karlDistributions);

    return {
      timePeriod: range.label,
      categories: [
        {
          name: 'Figma Income',
          chang: { amount: changFigmaAmount, count: changFigmaCount },
          karl: { amount: karlFigmaAmount, count: karlFigmaCount }
        },
        {
          name: 'Non-Figma Income',
          chang: { amount: changNonFigma },
          karl: { amount: karlNonFigma }
        },
        {
          name: 'Expenses',
          chang: { amount: -changExpenses },
          karl: { amount: -karlExpenses }
        },
        {
          name: 'Distributions',
          chang: { amount: -changDistributions },
          karl: { amount: -karlDistributions }
        },
        {
          name: 'Total',
          chang: { amount: changTotal },
          karl: { amount: karlTotal }
        }
      ]
    };
  }).filter(period => period !== null) as TimePeriodData[];
}

export function CapitalAccounts() {
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rawData, setRawData] = useState<{ checkIns: CheckIn[], transactions: Transaction[] } | null>(null);
  const [capitalAccounts, setCapitalAccounts] = useState<TimePeriodData[]>([]);

  // Fetch data only once when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  // Recalculate when granularity changes or raw data updates
  useEffect(() => {
    if (rawData) {
      const timeRanges = getTimeRanges(granularity);
      const accounts = calculateCapitalAccounts(timeRanges, rawData.checkIns, rawData.transactions);
      setCapitalAccounts(accounts);
    }
  }, [granularity, rawData]);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/capital-accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch capital accounts data');
      }

      const data = await response.json();
      setRawData(data);
    } catch (err) {
      setError('Failed to load capital accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="w-full sm:text-base text-xs">
      <div className="flex justify-end mb-8 mr-4">
        <div className="px-2 py-1 border">
          <select
            value={granularity}
            className="outline-none"
            onChange={(e) => setGranularity(e.target.value as Granularity)}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-[140px,1fr,1fr,1fr] grid-cols-[100px,1fr,1fr,1fr] gap-2 py-2 px-6 border-b font-medium">
        <div>Time Period</div>
        <div>Category</div>
        <div className="text-right">Chang</div>
        <div className="text-right">Karl</div>
      </div>

      {capitalAccounts.map((period, periodIndex) => (
        <div key={periodIndex} className="border-b last:border-b-0">
          {period.categories.map((category, categoryIndex) => (
            <div
              key={`${periodIndex}-${categoryIndex}`}
              className={`
                grid sm:grid-cols-[140px,1fr,1fr,1fr] grid-cols-[100px,1fr,1fr,1fr] gap-2 py-2 px-6 hover:bg-gray-50 transition-colors
                ${category.name === 'Total' ? 'font-semibold' : ''}
              `}
            >
              {categoryIndex === 0 && (
                <div className="font-medium">{period.timePeriod}</div>
              )}
              {categoryIndex !== 0 && <div />}
              <div>{category.name}</div>
              <div className="text-right">
                {formatAmount(category.chang.amount, category.chang.count)}
              </div>
              <div className="text-right">
                {formatAmount(category.karl.amount, category.karl.count)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
} 