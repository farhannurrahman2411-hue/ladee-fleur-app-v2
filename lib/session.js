import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySession } from './auth';

export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
