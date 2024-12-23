'use client';

import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { LoadingSpinner } from './TransactionList';
import { Distributions } from './Distributions';

type Granularity = 'monthly' | 'yearly' | 'all-time';

interface CheckIn {
  username: string;
  check_in_date: string;
}

interface Transaction {
  amount: number;
  account_number: string;
  is_studio: boolean;
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

function getClientUsername(): 'karl' | 'chang' | null {
  const cookies = document.cookie.split(';');
  const userCookie = cookies.find(cookie => cookie.trim().startsWith('USER_DATA='));
  if (!userCookie) return null;

  const userData = decodeURIComponent(userCookie.split('=')[1]);
  const usernameData = userData.split(';')[0];
  const username = usernameData.split('=')[1];

  return username as 'karl' | 'chang';
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
  }).format(amount);

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

    const deposits = rangeTransactions.filter(t => t.type === 'deposit');
    const changDeposits = deposits
      .filter(t => t.credited_user_id === 2)
      .reduce((sum, t) => sum + t.amount, 0);
    const karlDeposits = deposits
      .filter(t => t.credited_user_id === 1)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = rangeTransactions.filter(t => t.type === 'expense');

    let changStudioExpenses = 0;
    let karlStudioExpenses = 0;
    let changeOtherExpenses = 0;
    let karlOtherExpenses = 0;
    expenses.forEach(e => {
      if (e.credited_user_id === 2) {
        if (e.is_studio) {
          changStudioExpenses += e.amount;
        } else {
          changeOtherExpenses += e.amount;
        }
      } else if (e.credited_user_id === 1) {
        if (e.is_studio) {
          karlStudioExpenses += e.amount;
        } else {
          karlOtherExpenses += e.amount;
        }
      } else {
        if (e.is_studio) {
          changStudioExpenses += e.amount / 2;
          karlStudioExpenses += e.amount / 2;
        } else {
          changeOtherExpenses += e.amount / 2;
          karlOtherExpenses += e.amount / 2;
        }
      }
    });

    const distributions = rangeTransactions.filter(t => t.type === 'distribution');
    const changDistributions = distributions
      .filter(t => t.credited_user_id === 2)
      .reduce((sum, t) => sum + t.amount, 0);
    const karlDistributions = distributions
      .filter(t => t.credited_user_id === 1)
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate totals
    const changTotal = changFigmaAmount + changNonFigma + changDeposits - changStudioExpenses - changeOtherExpenses - changDistributions;
    const karlTotal = karlFigmaAmount + karlNonFigma + karlDeposits - karlStudioExpenses - karlOtherExpenses - karlDistributions;
    const changeWithdrawable = changTotal + changStudioExpenses;
    const karlWithdrawable = karlTotal + karlStudioExpenses;
    const categories: CategoryData[] = []
    if (changFigmaAmount > 0 || karlFigmaAmount > 0) {
      categories.push({
        name: 'Figma Income',
        chang: { amount: changFigmaAmount, count: changFigmaCount },
        karl: { amount: karlFigmaAmount, count: karlFigmaCount }
      });
    }
    if (changNonFigma > 0 || karlNonFigma > 0) {
      categories.push({
        name: 'Non-Figma Income',
        chang: { amount: changNonFigma },
        karl: { amount: karlNonFigma }
      });
    }
    if (changDeposits > 0 || karlDeposits > 0) {
      categories.push({
        name: 'Deposits',
        chang: { amount: changDeposits },
        karl: { amount: karlDeposits }
      });
    }
    if (changStudioExpenses > 0 || karlStudioExpenses > 0) {
      categories.push({
        name: 'Studio Expenses',
        chang: { amount: -changStudioExpenses },
        karl: { amount: -karlStudioExpenses }
      });
    }
    if (changeOtherExpenses > 0 || karlOtherExpenses > 0) {
      categories.push({
        name: 'Other Expenses',
        chang: { amount: -changeOtherExpenses },
        karl: { amount: -karlOtherExpenses }
      });
    }
    if (changDistributions > 0 || karlDistributions > 0) {
      categories.push({
        name: 'Distributions',
        chang: { amount: -changDistributions },
        karl: { amount: -karlDistributions }
      });
    }
    if (changeWithdrawable > 0 || karlWithdrawable > 0) {
      categories.push({
        name: 'LLC Capital',
        chang: { amount: changeWithdrawable },
        karl: { amount: karlWithdrawable }
      });
    }
    if (changTotal !== 0 || karlTotal !== 0) {
      categories.push({
        name: 'Total',
        chang: { amount: changTotal },
        karl: { amount: karlTotal }
      });
    }
    if (categories.length === 0) {
      return null;
    }

    return {
      timePeriod: range.label,
      categories,
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
      for (const transaction of data.transactions) {
        transaction.amount = Number(transaction.amount);
      }
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

  const currentUser = getClientUsername();
  let currentUserCapital = 0;
  const account = capitalAccounts.length > 0
    ? capitalAccounts[capitalAccounts.length - 1].categories.find(c => c.name === 'LLC Capital') : null;
  if (account && currentUser) {
    currentUserCapital = account[currentUser].amount;
  }

  return (
    <div className="w-full sm:text-base text-xs relative min-h-full">
      <div className="flex justify-end mb-4 mr-4">
        <div className="px-4 py-1 bg-gray-100 rounded-full">
          <select
            value={granularity}
            className="outline-none bg-gray-100"
            onChange={(e) => setGranularity(e.target.value as Granularity)}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-[140px,1fr,1fr,1fr] grid-cols-[100px,1fr,1fr,1fr] gap-2 py-3 px-6 border-b font-semibold">
        <div>Time Period</div>
        <div>Category</div>
        <div className="text-right">Chang</div>
        <div className="text-right">Karl</div>
      </div>

      {capitalAccounts.map((period, periodIndex) => (
        <div key={periodIndex} className="border-b last:border-b-0 py-3">
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

      <Distributions llcCapital={currentUserCapital} />
    </div>
  );
} 