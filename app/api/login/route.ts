import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;
  
  const lowercaseUsername = username.toLowerCase();
  
  try {
    // Query the database for the user
    const { rows } = await sql`
      SELECT username, password_hash
      FROM users
      WHERE username = ${lowercaseUsername}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('USER_DATA', `user=${lowercaseUsername};pw=${password}`, {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
