import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/subscribe/benefits',
  '/decks/public',
]);

const PROTECTED_PREFIXES = [
  '/chat',
  '/decks',
  '/notes',
  '/quiz',
  '/add',
  '/progress',
  '/belt-road',
  '/monster-collection',
  '/shop',
  '/conversations',
  '/study-groups',
  '/live',
  '/profile',
  '/settings',
  '/admin',
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_EXACT_PATHS.has(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/samples/')
  ) {
    return NextResponse.next();
  }

  const requiresAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret:
      process.env.NEXTAUTH_SECRET ||
      'gizmo-ai-studio-super-secret-nextauth-key-2026',
  });

  if (!token || token.status === 'DISABLED') {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/chat', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|samples/).*)',
  ],
};
