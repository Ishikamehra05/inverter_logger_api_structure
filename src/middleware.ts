import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of protected routes
const protectedPaths = [
  '/dashboard',
  '/control',
  '/control/plant',
  '/devices',
  '/maindevices',
  '/alerts',
  '/device-library',
  '/about',
  '/member',
  '/business',
  '/role',
  '/delete_account',
  '/deviceControl'
];

// Public auth paths (should not be visited when logged in)
const authPaths = ['/login', '/register'];

/**
 * Extract token from Authorization header or cookie
 */
function extractTokenSimple(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return request.cookies.get('auth_token')?.value || null;
}

/**
 * Clean host string: remove extra comma values if present
 */
function getCleanHost(header: string | null): string {
  if (!header) return 'localhost:3000';
  return header.split(',')[0].trim(); // Get first host
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = extractTokenSimple(request);

  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // 🔒 User not authenticated but trying to access protected route
  if (isProtectedPath && !authToken) {
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const cleanHost = getCleanHost(rawHost);
    const origin = `${proto}://${cleanHost}`;

    let loginUrl: URL;
    try {
      loginUrl = new URL('/login', origin);
    } catch (error) {
      console.error('❌ Invalid redirect URL:', origin, rawHost, error);
      loginUrl = new URL('http://localhost:3000/login');
    }

    loginUrl.searchParams.set('callbackUrl', pathname);

    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  // ✅ User already logged in, prevent access to login/register
  if (isAuthPath && authToken) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  // Allow all other requests
  return NextResponse.next();
}

// Only run on frontend pages, not static assets or APIs
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
