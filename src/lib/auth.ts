import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/data/db_sql";
import jwt from 'jsonwebtoken';
import { sql } from 'drizzle-orm';

// JWT secret key - in production, store this in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface UserJwtPayload {
  userId: number;
  email: string;
  accountName: string;
  role: {
    roleId: number;
    roleName: string;
    isSuperAdmin: boolean;
  };
  permissions: string[];
}

/**
 * Extracts JWT token from request (supports both cookies and Authorization header)
 * @param request - NextRequest object containing the incoming request data
 * @returns JWT token string or null if not found
 */
export function extractToken(request: NextRequest): string | null {
  // First, try to get token from Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Fallback to cookie-based authentication for web application
  const cookieToken = request.cookies.get("auth_token")?.value;
  return cookieToken || null;
}

/**
 * Verifies authentication status by checking and validating JWT token
 * Supports both Bearer token (for mobile/API clients) and cookie-based auth (for web)
 * @param request - NextRequest object containing the incoming request data
 * @returns Object containing authentication status and user payload
 */
export async function verifyAuth(request: NextRequest) {
  const token = extractToken(request);
  // console.log('Auth Token:', token ? 'Present' : 'Missing');

  if (!token) {
    return { isAuthenticated: false, user: null };
  }

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    const payload = verified.payload as unknown as UserJwtPayload;
    // console.log('Auth Payload:', payload);
    return { isAuthenticated: true, user: payload };
  } catch (error) {
    console.error("Token verification failed:", error);
    return { isAuthenticated: false, user: null };
  }
}

/**
 * Verifies JWT token using jsonwebtoken library (alternative method)
 * Supports both Bearer token and cookie-based authentication
 * @param request - NextRequest object containing the incoming request data
 * @returns Object containing authentication status and user payload
 */
export function verifyAuthSync(request: NextRequest) {
  const token = extractToken(request);

  if (!token) {
    return { isAuthenticated: false, user: null };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as UserJwtPayload;
    return { isAuthenticated: true, user: payload };
  } catch (error) {
    console.error("Token verification failed:", error);
    return { isAuthenticated: false, user: null };
  }
}

/**
 * Checks if a user has a specific permission
 * @param userId - The ID of the user to check permissions for
 * @param permissionName - The name of the permission to check
 * @returns Promise<boolean> - True if user has permission, false otherwise
 */
export async function hasPermission(userId: number, permissionName: string): Promise<boolean> {
  try {
    // Get user's role using proper parameterized query
    const [userRoleResult] = await db.execute(
      sql`SELECT roleId FROM users WHERE user_id = ${userId}`
    );

    const userRows = userRoleResult as unknown as any[];
    if (!userRows?.length || !userRows[0]?.role_id) {
      // console.log('No role found for user:', userId);
      return false;
    }

    const roleId = userRows[0].role_id;

    // Check if role is super admin
    const [superAdminResult] = await db.execute(
      sql`SELECT is_superadmin FROM roles WHERE roleId = ${roleId}`
    );

    const superAdminRows = superAdminResult as unknown as any[];
    if (superAdminRows?.length && superAdminRows[0]?.is_super_admin) {
      return true; // Super admins have all permissions
    }

    // Get permission ID
    const [permissionResult] = await db.execute(
      sql`SELECT id FROM permissions WHERE name = ${permissionName}`
    );

    const permissionRows = permissionResult as unknown as any[];
    if (!permissionRows?.length) {
      // console.log('Permission not found:', permissionName);
      return false;
    }

    const permissionId = permissionRows[0].id;

    // Check role permission mapping
    const [rolePermissionResult] = await db.execute(
      sql`SELECT 1 FROM role_permissions WHERE roleId = ${roleId} AND permission_id = ${permissionId}`
    );

    const rolePermissionRows = rolePermissionResult as unknown as any[];
    return rolePermissionRows.length > 0;

  } catch (error) {
    console.error("Permission check error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    return false;
  }
}

interface DecodedToken {
  role?: {
    name: string;
  };
  // ... other user properties
}

export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
  } catch (error) {
    return null;
  }
};

/**
 * Fetches all permissions for a given role
 * @param roleId - The ID of the role to fetch permissions for
 * @returns Promise<string[]> - Array of permission names
 */
export async function getRolePermissions(roleId: number): Promise<string[]> {
  try {
    // Check if role is super admin first
    const [superAdminResult] = await db.execute(
      sql`SELECT is_superadmin FROM roles WHERE roleId = ${roleId}`
    );

    const superAdminRows = superAdminResult as unknown as any[];
    if (superAdminRows?.length && superAdminRows[0]?.is_super_admin) {
      // Super admins get all permissions
      const [allPermissionsResult] = await db.execute(
        sql`SELECT name FROM permissions`
      );
      const allPermissions = allPermissionsResult as unknown as any[];
      return allPermissions.map((p: any) => p.name);
    }

    // Get permissions for the specific role
    const [permissionsResult] = await db.execute(
      sql`
        SELECT p.name 
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.roleId = ${roleId}
      `
    );

    const permissionRows = permissionsResult as unknown as any[];
    return permissionRows.map((p: any) => p.name);

  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return [];
  }
}

/**
 * Checks if a user has a specific permission based on their JWT token
 * @param user - User payload from JWT token
 * @param permissionName - The name of the permission to check
 * @returns boolean - True if user has permission, false otherwise
 */
export function hasPermissionFromToken(user: UserJwtPayload | null, permissionName: string): boolean {
  if (!user) return false;
  
  // Super admins have all permissions
  if (user.role?.isSuperAdmin) return true;
  
  // Check if user has the specific permission
  return user.permissions?.includes(permissionName) || false;
}

/**
 * Middleware helper to check permissions from request
 * @param request - NextRequest object
 * @param requiredPermission - The permission required to access the resource
 * @returns Object with authentication status and permission check result
 */
export async function checkPermissionFromRequest(request: NextRequest, requiredPermission: string) {
  const { isAuthenticated, user } = await verifyAuth(request);
  
  if (!isAuthenticated || !user) {
    return {
      isAuthenticated: false,
      hasPermission: false,
      user: null,
      error: "Authentication required"
    };
  }
  
  const hasRequiredPermission = hasPermissionFromToken(user, requiredPermission);
  
  return {
    isAuthenticated: true,
    hasPermission: hasRequiredPermission,
    user: user,
    error: hasRequiredPermission ? null : `Permission '${requiredPermission}' required`
  };
}




export function getUserId(req: NextRequest): number {
  const authHeader = req.headers.get("authorization");

  // ✅ TEMPORARY DEV MODE (no token)
  if (!authHeader) {
    console.warn("⚠️ No token found, using default userId = 1 (DEV MODE)");
    return 8; // 👈 manually set for testing
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  const decoded: any = jwt.verify(token, JWT_SECRET);

  return decoded.userId;
}