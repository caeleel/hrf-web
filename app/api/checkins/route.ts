import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/utils/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Get all check-ins for the specified month
    const result = await sql`
      SELECT c.check_in_date, u.username
      FROM check_ins c
      JOIN users u ON u.id = c.user_id
      WHERE EXTRACT(YEAR FROM c.check_in_date) = ${year}
      AND EXTRACT(MONTH FROM c.check_in_date) = ${month}
      ORDER BY c.check_in_date
    `;

    return NextResponse.json({ checkins: result.rows });
  } catch (error) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await request.json();

    // Ensure the date is not in the future
    const checkInDate = new Date(date);
    if (checkInDate > new Date()) {
      return NextResponse.json({ error: 'Cannot check in for future dates' }, { status: 400 });
    }

    await sql`
      INSERT INTO check_ins (user_id, check_in_date)
      VALUES (${user.id}, ${date})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as any).code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Already checked in for this date' }, { status: 400 });
    }
    console.error('Error creating check-in:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    await sql`
      DELETE FROM check_ins
      WHERE user_id = ${user.id}
      AND check_in_date = ${date}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting check-in:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
