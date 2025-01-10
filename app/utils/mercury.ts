import type { User } from './auth';

const MERCURY_BASE_URL = 'https://splendorlord.xyz';

const accountIdCache: Record<string, string> = {};
const EXPENSE_ACCOUNTS = process.env.MERCURY_EXPENSE_ACCOUNTS!;
const LLC_ACCOUNT = EXPENSE_ACCOUNTS.split(',')[0];
const STUDIO_ACCOUNT = EXPENSE_ACCOUNTS.split(',')[1];

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
  accountId: string;
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  kind: string;
  status: string;
  postedAt: string;
}

interface MercuryAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
}

interface MercuryRecipient {
  id: string;
  name: string;
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

export async function getAccountTransactions(accountNumber: string, user: User): Promise<MercuryTransaction[]> {
  const accountId = await getAccountId(accountNumber, user);
  return (await fetchMercuryAPI(`/account/${accountId}/transactions?start=2024-09-01`, user)).transactions;
}

export async function getRecipients(user: User) {
  const { recipients }: { recipients: MercuryRecipient[] } = await fetchMercuryAPI('/recipients', user);

  return recipients.filter(recipient => recipient.name !== 'Bathing Culture PBC');
}

interface TransferParams {
  recipientId: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
}

export async function transferFunds(fromAccountNumber: string, params: TransferParams, user: User) {
  const { recipientId, amount, note, idempotencyKey } = params;
  // Get account IDs
  const fromAccountId = await getAccountId(fromAccountNumber, user);

  return fetchMercuryAPI(`/account/${fromAccountId}/transactions`, user, {
    method: 'POST',
    body: JSON.stringify({
      recipientId,
      amount, // Convert to cents
      note,
      idempotencyKey,
      paymentMethod: 'ach',
    }),
  });
}

export async function getAccountBalance(accountNumber: string, user: User) {
  const accountId = await getAccountId(accountNumber, user);
  const { availableBalance } = await fetchMercuryAPI(`/account/${accountId}`, user);
  return availableBalance as number;
}

export function llcAccountId() {
  return LLC_ACCOUNT
}

export function studioAccountId() {
  return STUDIO_ACCOUNT
}