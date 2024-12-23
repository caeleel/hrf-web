import { getCurrentUser } from "@/app/utils/auth";
import { getAccountBalance } from "@/app/utils/mercury";
import { NextResponse } from "next/server";

const ACCOUNT_NUMBER = process.env.MERCURY_INCOME_ACCOUNT!;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountBalance = await getAccountBalance(ACCOUNT_NUMBER, user);

  return NextResponse.json({ balance: accountBalance });
}
