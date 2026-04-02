import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/data/db_sql';
import { sql } from 'drizzle-orm';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = '1d'; 
const device_id = "hbeon_mobile";

/**
 * JWT Payload interface for consistent token structure
 */
interface JWTPayload {
  userId: number;
  email: string;
  accountName: string | null;
  role: {
    roleId: number;
    roleName: string | null;
    isSuperAdmin: boolean | null;
  } | null;
  permissions: string[];
  fingerprint: string;
  iat?: number;
  exp?: number;
}

/**
 * Authentication result interface
 */
interface AuthResult {
  isAuthenticated: boolean;
  user: JWTPayload | null;
  error?: string;
}

/**
 * 🔐 Generate JWT token with device fingerprint
 * @param payload - User payload containing username and device fingerprint
 * @returns Signed JWT token string
 */
export function generateToken(payload: JWTPayload): string {
  if (!SECRET) throw new Error("JWT_SECRET environment variable is not set");

  //  DEVICE ID
  payload.fingerprint = device_id;

  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * 🔐 Legacy alias for generateToken (backward compatibility)
 * @param payload - User payload containing username and device fingerprint
 * @returns Signed JWT token string
 */
export function signJWT(payload: JWTPayload): string {
  return generateToken(payload);
}

/**
 * ✅ Verify JWT token and validate device fingerprint
 * @param token - JWT token to verify
 * @param incomingFingerprint - Device ID from request headers
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyToken(token: string, incomingFingerprint?: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as JWTPayload;

    // If fingerprint is provided, validate it matches
    if (incomingFingerprint && decoded.fingerprint !== incomingFingerprint) {
      console.warn('JWT fingerprint mismatch:', {
        expected: decoded.fingerprint,
        received: incomingFingerprint
      });
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * ✅ Legacy alias for verifyToken (backward compatibility)
 * @param token - JWT token to verify
 * @param incomingFingerprint - Device ID from request headers
 * @returns Decoded payload if valid, null if invalid
 */
export function verifyJWT(token: string, incomingFingerprint: string): JWTPayload | null {
  return verifyToken(token, incomingFingerprint);
}

/**
 * 🔍 Decode JWT token without verification (for inspection only)
 * @param token - JWT token to decode
 * @returns Decoded payload or null if invalid format
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

/**
 * 🛡️ Extract and verify user from request headers
 * Validates both Authorization header (Bearer token) and x-device-id header
 * @param req - NextRequest object
 * @returns Verified user payload or null if authentication fails
 */
export async function getVerifiedUser(req: NextRequest): Promise<JWTPayload | null> {
  // Try to get from headers first
  let authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  let deviceId = req.headers.get('x-device-id') || req.headers.get('X-Device-ID') || req.headers.get('device-id');

  // If not present in headers, try cookies (for web clients)
  if (!authHeader) {
    try {
      // next/headers cookies() API (for Next.js 13+)
      // This works only in server-side context
      // @ts-ignore
      const cookieStore = await cookies();
      if (cookieStore) {
        const cookieToken = cookieStore.get('auth_token');
        if (cookieToken && cookieToken.value) {
          authHeader = `Bearer ${cookieToken.value}`;
          // console.log(`>>>Auth token from cookie: ${authHeader}`);
        }
        // const cookieDeviceId = cookieStore.get('device_id'); // Uncomment this when you need web device ID
        // if (cookieDeviceId && cookieDeviceId.value) {
        //   deviceId = cookieDeviceId.value;
        // }
        deviceId = "hbeon_mobile"
      }
    } catch (e) {
      // fallback for environments where cookies() is not available
      // (e.g. edge runtime, or older Next.js)
    }
  }

  // Log for debugging (remove in production)
  console.log('Auth Header:', authHeader ? 'Present' : 'Missing');
  console.log('Device ID:', deviceId ? 'Present' : 'Missing');

  // Validate required credentials
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Missing or invalid Authorization header or cookie');
    return null;
  }
  if (!deviceId) {
    console.warn('Missing x-device-id header or device_id cookie');
    return null;
  }

  // Extract token and verify
  const token = authHeader.split(' ')[1];
  return verifyToken(token, deviceId);
}

/**
 * 🛡️ Comprehensive authentication middleware for API routes
 * Validates JWT token and device ID, returns appropriate error responses
 * @param req - NextRequest object
 * @returns Authentication result with user data or error information
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  try {
    const user = await getVerifiedUser(req);

    if (!user) {
      return {
        isAuthenticated: false,
        user: null,
        error: 'Invalid or missing authentication credentials'
      };
    }

    return {
      isAuthenticated: true,
      user: user
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      isAuthenticated: false,
      user: null,
      error: 'Authentication processing failed'
    };
  }
}

/**
 * 🚫 Create standardized 401 Unauthorized response
 * @param message - Optional custom error message
 * @returns NextResponse with 401 status and error details
 */
export function createUnauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
      message: message || 'Authentication required. Please provide valid Authorization header with Bearer token and x-device-id header.',
      code: 'AUTH_REQUIRED'
    },
    { status: 401 }
  );
}

/**
 * 🔒 Authentication wrapper for API route handlers
 * Automatically handles authentication and returns 401 if unauthorized
 * @param handler - The actual API route handler function
 * @returns Wrapped handler that includes authentication
 */
export function withAuth<T extends any[]>(
  handler: (req: NextRequest, user: JWTPayload, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await authenticateRequest(req);

    if (!authResult.isAuthenticated || !authResult.user) {
      return createUnauthorizedResponse(authResult.error);
    }

    try {
      return await handler(req, authResult.user, ...args);
    } catch (error) {
      console.error('API handler error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          message: 'An error occurred while processing your request'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * 📱🖥️ Cross-platform compatibility helper
 * Extracts authentication headers with fallback support for different client types
 * @param req - NextRequest object
 * @returns Object containing extracted headers
 */
export async function extractAuthHeaders(req: NextRequest) {
  let authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  let deviceId = req.headers.get('x-device-id') || req.headers.get('X-Device-ID') || req.headers.get('device-id');

  // Try cookies if not present in headers
  if (!authHeader) {
    try {
      // @ts-ignore
      const cookieStore = await cookies();
      if (cookieStore) {
        const cookieToken = cookieStore.get('auth_token');
        if (cookieToken && cookieToken.value) {
          authHeader = `Bearer ${cookieToken.value}`;
        }
        const cookieDeviceId = cookieStore.get('device_id');
        if (cookieDeviceId && cookieDeviceId.value) {
          deviceId = cookieDeviceId.value;
        }
      }
    } catch (e) { }
  }

  return {
    authHeader,
    deviceId,
    hasValidFormat: authHeader?.startsWith('Bearer ') && Boolean(deviceId)
  };
}


export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  try {
    const [userRoleResult] = await db.execute(
      sql`SELECT roleId FROM users WHERE userId = ${userId}`
    );

    const userRows = userRoleResult as unknown as any[];
    if (!userRows?.length || !userRows[0]?.roleId) {
      return false;
    }

    const roleId = userRows[0].roleId;

    const [superAdminResult] = await db.execute(
      sql`SELECT is_superadmin FROM roles WHERE roleId = ${roleId}`
    );

    const superAdminRows = superAdminResult as unknown as any[];
    if (superAdminRows?.length && superAdminRows[0]?.is_superadmin) {
      return true; // Super admins have all permissions
    }

    const [permissionResult] = await db.execute(
      sql`SELECT id FROM permissions WHERE name = ${permissionName}`
    );

    const permissionRows = permissionResult as unknown as any[];
    if (!permissionRows?.length) {
      return false;
    }

    const permissionId = permissionRows[0].id;

    const [rolePermissionResult] = await db.execute(
      sql`SELECT 1 FROM role_permissions WHERE roleId = ${roleId} AND permission_id = ${permissionId}`
    );

    const rolePermissionRows = rolePermissionResult as unknown as any[];
    return rolePermissionRows.length > 0;

  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}
// Export types for use in other modules
export type { JWTPayload, AuthResult };