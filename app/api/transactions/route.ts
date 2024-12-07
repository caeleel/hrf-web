import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/utils/auth';
import { getAccountTransactions } from '@/app/utils/mercury';

if (!process.env.MERCURY_INCOME_ACCOUNT || !process.env.MERCURY_EXPENSE_ACCOUNT) {
  throw new Error('Mercury accounts not configured');
}

const INCOME_ACCOUNT = process.env.MERCURY_INCOME_ACCOUNT;
const EXPENSE_ACCOUNT = process.env.MERCURY_EXPENSE_ACCOUNT;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('account');

    // Get Mercury transactions
    const mercuryTransactions = [];
    if (accountType === 'income' || !accountType) {
      const incomeTransactions = await getAccountTransactions(INCOME_ACCOUNT, user);
      mercuryTransactions.push(...incomeTransactions);
    }
    if (accountType === 'expense' || !accountType) {
      const expenseTransactions = await getAccountTransactions(EXPENSE_ACCOUNT, user);
      mercuryTransactions.push(...expenseTransactions);
    }

    // Get marked transactions from database
    let accountFilter = '';
    if (accountType === 'income') {
      accountFilter = `WHERE mt.account_number = '${INCOME_ACCOUNT}'`;
    } else if (accountType === 'expense') {
      accountFilter = `WHERE mt.account_number = '${EXPENSE_ACCOUNT}'`;
    }

    const query = `
      SELECT 
        mt.*,
        u.username as credited_username,
        CASE 
          WHEN mt.account_number = '${EXPENSE_ACCOUNT}' OR mt.counterparty_id = '${EXPENSE_ACCOUNT}' THEN 'expense'
          WHEN mt.account_number = '${INCOME_ACCOUNT}' OR mt.counterparty_id = '${INCOME_ACCOUNT}' THEN 'income'
          ELSE 'internal'
        END as transaction_type,
        CASE
          WHEN mt.account_number = '${EXPENSE_ACCOUNT}' OR mt.account_number = '${INCOME_ACCOUNT}' THEN false
          ELSE true
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

    // Combine Mercury transactions with marked data
    const combinedTransactions = mercuryTransactions.map(mt => {
      const markedData = markedTransactionsMap[mt.id] || {
        credited_user_id: null,
        credited_username: null,
        type: 'unassigned'
      };

      return {
        id: mt.id,
        counterparty_name: mt.counterpartyName,
        counterparty_id: mt.counterpartyId,
        amount: mt.amount,
        posted_at: mt.postedAt,
        transaction_type: mt.counterpartyId === EXPENSE_ACCOUNT || mt.counterpartyId === INCOME_ACCOUNT
          ? 'internal'
          : (mt.counterpartyId === EXPENSE_ACCOUNT ? 'expense' : 'income'),
        is_internal: mt.counterpartyId === EXPENSE_ACCOUNT || mt.counterpartyId === INCOME_ACCOUNT,
        credited_user_id: markedData.credited_user_id,
        credited_username: markedData.credited_username,
        type: markedData.type,
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
      type
    } = await request.json();

    // Get transaction details from Mercury
    const transactions = await getAccountTransactions(INCOME_ACCOUNT, user);
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
        ${INCOME_ACCOUNT},
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