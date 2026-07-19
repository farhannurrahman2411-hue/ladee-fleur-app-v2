import { SignJWT, jwtVerify } from 'jose';

export const COOKIE_NAME = 'lf_session';
const ALG = 'HS256';
const EXPIRES_IN = '7d';

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET belum diisi di file .env.local');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecretKey());
}

export async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload; // { id, username, full_name, role, iat, exp }
  } catch (err) {
    return null;
  }
}
