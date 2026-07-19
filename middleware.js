import { NextResponse } from 'next/server';
import { COOKIE_NAME, verifySession } from './lib/auth';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Halaman & API rekap penjualan cuma boleh diakses owner
  if (
    (pathname.startsWith('/rekap') || pathname.startsWith('/api/rekap')) &&
    session.role !== 'owner'
  ) {
    return NextResponse.redirect(new URL('/pesanan', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
