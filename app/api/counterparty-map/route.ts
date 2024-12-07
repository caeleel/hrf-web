import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/utils/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      SELECT counterparty_id, user_id
      FROM counterparty_map
    `;

    const map = result.rows.reduce((acc: Record<string, number | null>, row) => {
      acc[row.counterparty_id] = row.user_id;
      return acc;
    }, {});

    return NextResponse.json({ map });
  } catch (error) {
    console.error('Error fetching counterparty map:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { counterpartyId, userId } = await request.json();

    await sql`
      INSERT INTO counterparty_map (counterparty_id, user_id)
      VALUES (${counterpartyId}, ${userId})
      ON CONFLICT (counterparty_id) DO UPDATE
      SET user_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating counterparty map:', error);
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
    const counterpartyId = searchParams.get('counterpartyId');

    if (!counterpartyId) {
      return NextResponse.json({ error: 'Counterparty ID is required' }, { status: 400 });
    }

    await sql`
      DELETE FROM counterparty_map
      WHERE counterparty_id = ${counterpartyId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting counterparty map:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 