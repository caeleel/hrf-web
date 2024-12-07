import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export interface User {
  id: number;
  username: string;
  password_hash: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userDataCookie = cookieStore.get('USER_DATA');

  if (!userDataCookie) {
    return null;
  }

  const userData = userDataCookie.value;
  const [usernameData, passwordData] = userData.split(';');
  const username = usernameData.split('=')[1];
  const password = passwordData.split('=')[1];

  const result = await sql`
    SELECT id, username, password_hash
    FROM users
    WHERE username = ${username}
  `;

  const user = result.rows[0];
  if (!user) return null;

  // Verify password matches
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) return null;

  return user as User;
} 