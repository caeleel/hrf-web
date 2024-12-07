import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/utils/auth';

export async function GET(request: Request) {
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
        credited_user_id,
        type,
        posted_at
      FROM marked_transactions
      WHERE type IN ('income', 'expense', 'distribution')
      ORDER BY posted_at DESC
    `;

    return NextResponse.json({
      checkIns: checkInsResult.rows,
      transactions: transactionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching capital accounts data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 