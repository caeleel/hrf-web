import { sql } from '@vercel/postgres';
import { MercuryTransaction } from './mercury';

if (!process.env.MERCURY_EXPENSE_ACCOUNTS) {
  throw new Error('Mercury expense account not configured');
}

const EXPENSE_ACCOUNTS = process.env.MERCURY_EXPENSE_ACCOUNTS;

export async function getCounterpartyMap() {
  const result = await sql`
    SELECT counterparty_id, user_id
    FROM counterparty_map
  `;
  return result.rows.reduce((acc: Record<string, number | null>, row) => {
    acc[row.counterparty_id] = row.user_id;
    return acc;
  }, {});
}

export async function autoMarkTransactions(transactions: MercuryTransaction[], counterpartyMap: Record<string, number | null>) {
  for (const transaction of transactions) {
    const userId = counterpartyMap[transaction.counterpartyId];

    // Skip if we don't have a mapping OR if it's the expense account
    if (userId === undefined || transaction.counterpartyId === EXPENSE_ACCOUNTS[0]) {
      continue;
    }

    // Check if transaction is already marked
    const existing = await sql`
      SELECT id FROM marked_transactions
      WHERE transaction_id = ${transaction.id}
    `;

    if (existing.rows.length > 0) {
      continue;
    }

    // Insert new transaction
    await sql`
      INSERT INTO marked_transactions (
        account_number,
        transaction_id,
        is_debit,
        amount,
        credited_user_id,
        type,
        counterparty_id,
        counterparty_name
      ) VALUES (
        ${transaction.counterpartyId},
        ${transaction.id},
        ${transaction.amount < 0},
        ${Math.abs(transaction.amount)},
        ${userId},
        ${userId === null ? 'check_in' : 'income'},
        ${transaction.counterpartyId},
        ${transaction.counterpartyName}
      )
    `;
  }
} 