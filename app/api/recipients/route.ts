import { getCurrentUser } from "@/app/utils/auth";
import { getRecipients } from "@/app/utils/mercury";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipients = await getRecipients(user);

  return NextResponse.json({ recipients });
}