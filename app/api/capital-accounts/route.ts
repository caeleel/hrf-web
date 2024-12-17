import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/utils/auth';

const EXPENSE_ACCOUNTS = process.env.MERCURY_EXPENSE_ACCOUNTS!;
const STUDIO_ACCOUNT = EXPENSE_ACCOUNTS.split(',')[1]

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all check-ins
    const checkInsResult = await sql`
      SELECT username, check_in_date
      FROM check_ins c
      JOIN users u ON c.user_id = u.id
      ORDER BY check_in_date DESC
    `;

    // Get all relevant transactions
    const transactionsResult = await sql`
      SELECT 
        amount,
        account_number,
        credited_user_id,
        type,
        posted_at
      FROM marked_transactions
      WHERE type IN ('income', 'expense', 'distribution', 'deposit')
      ORDER BY posted_at DESC
    `;

    return NextResponse.json({
      checkIns: checkInsResult.rows,
      transactions: transactionsResult.rows.map((row) => {
        return {
          ...row,
          is_studio: row.account_number === STUDIO_ACCOUNT
        }
      })
    });
  } catch (error) {
    console.error('Error fetching capital accounts data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 