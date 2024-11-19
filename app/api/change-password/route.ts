import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getCurrentUser } from '@/app/utils/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPassword } = await request.json();

    // Hash the new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in the database
    await sql`
      UPDATE users
      SET password_hash = ${newPasswordHash}
      WHERE id = ${user.id}
    `;

    const response = NextResponse.json({ success: true });
    response.cookies.set('USER_DATA', `user=${user.username};pw=${newPassword}`, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 