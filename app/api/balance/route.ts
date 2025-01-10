import { getCurrentUser } from "@/app/utils/auth";
import { getAccountBalance, llcAccountId } from "@/app/utils/mercury";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountBalance = await getAccountBalance(llcAccountId(), user);

  return NextResponse.json({ balance: accountBalance });
}
