import type { User } from './auth';

const MERCURY_BASE_URL = 'https://splendorlord.xyz';

let accountIdCache: Record<string, string> = {};

export async function fetchMercuryAPI(path: string, user: User, options: RequestInit = {}) {
  console.log(`Mercury API request by ${user.username}: ${path}`);

  const response = await fetch(`${MERCURY_BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.MERCURY_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Mercury API error: ${response.statusText}`);
  }

  return response.json();
}

export interface MercuryTransaction {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  status: string;
  postedAt: string;
}

interface MercuryAccount {
  id: string;
  accountNumber: string;
}

async function getAccountId(accountNumber: string, user: User): Promise<string> {
  // Return cached value if available
  if (accountIdCache[accountNumber]) {
    return accountIdCache[accountNumber];
  }

  // Fetch all accounts
  const { accounts }: { accounts: MercuryAccount[] } = await fetchMercuryAPI('/accounts', user);

  // Build cache for all accounts
  accounts.forEach(account => {
    accountIdCache[account.accountNumber] = account.id;
  });

  const accountId = accountIdCache[accountNumber];
  if (!accountId) {
    throw new Error(`Account not found for number: ${accountNumber}`);
  }

  return accountId;
}

export async function getAccountTransactions(accountNumber: string, user: User, limit = 100): Promise<MercuryTransaction[]> {
  const accountId = await getAccountId(accountNumber, user);
  return (await fetchMercuryAPI(`/account/${accountId}/transactions?limit=${limit}`, user)).transactions;
} 