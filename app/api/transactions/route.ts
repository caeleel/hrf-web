import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/utils/auth';
import { getAccountTransactions, MercuryTransaction } from '@/app/utils/mercury';
import { MarkedTransaction } from '@/app/components/TransactionList';

if (!process.env.MERCURY_INCOME_ACCOUNT || !process.env.MERCURY_EXPENSE_ACCOUNTS) {
  throw new Error('Mercury accounts not configured');
}

const INCOME_ACCOUNT = process.env.MERCURY_INCOME_ACCOUNT;
const EXPENSE_ACCOUNTS = process.env.MERCURY_EXPENSE_ACCOUNTS;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('account');

    const expenseAccounts = EXPENSE_ACCOUNTS.split(',');

    // Get Mercury transactions
    let mercuryTransactions: MercuryTransaction[] = [];
    if (accountType === 'income' || !accountType) {
      const incomeTransactions = await getAccountTransactions(INCOME_ACCOUNT, user);
      mercuryTransactions.push(...(incomeTransactions.map((t) => ({ ...t, accountId: INCOME_ACCOUNT }))));
    }
    if (accountType === 'expense' || !accountType) {
      for (const account of expenseAccounts) {
        const expenseTransactions = await getAccountTransactions(account, user);
        mercuryTransactions.push(...(expenseTransactions.map((t) => ({ ...t, accountId: account }))));
      }
    }
    // Get marked transactions from database
    let accountFilter = '';
    if (accountType === 'income') {
      accountFilter = `WHERE mt.account_number = '${INCOME_ACCOUNT}'`;
    } else if (accountType === 'expense') {
      accountFilter = `WHERE mt.account_number = '${expenseAccounts[0]}' OR mt.account_number = '${expenseAccounts[1]}'`;
    }

    const query = `
      SELECT 
        mt.*,
        u.username as credited_username,
        mt.type as transaction_type,
        CASE
          WHEN mt.account_number = '${expenseAccounts[0]}' AND mt.account_number = '${INCOME_ACCOUNT}' THEN true
          ELSE false
        END as is_internal
      FROM marked_transactions mt
      LEFT JOIN users u ON mt.credited_user_id = u.id
      ${accountFilter}
    `;

    const result = await sql.query(query);
    const markedTransactions = result.rows;

    // Create a map of transaction IDs to their marked data
    const markedTransactionsMap = markedTransactions.reduce((acc, mt) => {
      acc[mt.transaction_id] = mt;
      return acc;
    }, {});
    mercuryTransactions = mercuryTransactions.filter(mt => mt.counterpartyId !== INCOME_ACCOUNT && mt.status !== 'failed' && !!mt.postedAt && mt.kind !== 'internalTransfer');

    // Combine Mercury transactions with marked data
    const combinedTransactions: MarkedTransaction[] = mercuryTransactions.map(mt => {
      const markedData = markedTransactionsMap[mt.id] || {
        credited_user_id: null,
        credited_username: null,
        type: 'unassigned',
        transaction_type: mt.amount < 0 ? 'expense' : 'income',
      };

      return {
        id: mt.id,
        counterparty_name: mt.counterpartyName,
        counterparty_id: mt.counterpartyId,
        amount: mt.amount,
        account_id: mt.accountId,
        posted_at: mt.postedAt,
        is_debit: mt.amount < 0,
        transaction_type: markedData.transaction_type,
        is_internal: mt.counterpartyId === expenseAccounts[0] && mt.accountId === INCOME_ACCOUNT,
        credited_user_id: markedData.credited_user_id,
        credited_username: markedData.credited_username,
        type: markedData.type || markedData.transaction_type,
      };
    });

    // Sort by posted date
    combinedTransactions.sort((a, b) =>
      new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime()
    );

    return NextResponse.json({ transactions: combinedTransactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      transactionId,
      creditedUserId,
      accountId,
      type
    } = await request.json();

    // Get transaction details from Mercury
    const transactions = await getAccountTransactions(accountId, user);
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Insert or update marked transaction
    await sql`
      INSERT INTO marked_transactions (
        account_number,
        transaction_id,
        is_debit,
        amount,
        credited_user_id,
        type,
        counterparty_id,
        counterparty_name,
        posted_at
      ) VALUES (
        ${accountId},
        ${transaction.id},
        ${transaction.amount < 0},
        ${Math.abs(transaction.amount)},
        ${creditedUserId},
        ${type},
        ${transaction.counterpartyId},
        ${transaction.counterpartyName},
        ${transaction.postedAt}
      )
      ON CONFLICT (transaction_id) DO UPDATE
      SET 
        credited_user_id = ${creditedUserId},
        type = ${type}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 