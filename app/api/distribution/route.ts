import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/utils/auth";
import { llcAccountId, transferFunds } from "@/app/utils/mercury";
import { sql } from "@vercel/postgres";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { amount, recipientId, idempotencyKey } = await request.json();

  const resp = await transferFunds(llcAccountId(), { recipientId, amount, idempotencyKey }, user);

  // mark a transaction in the db as type "distribution" credited to the current user
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
        ${llcAccountId()},
        ${resp.id},
        ${resp.amount < 0},
        ${Math.abs(resp.amount)},
        ${user.id},
        'distribution',
        ${resp.counterpartyId},
        ${resp.counterpartyName}
      )
    `;

  return NextResponse.json({ success: true });
}