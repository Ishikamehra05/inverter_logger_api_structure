import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequest } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    let currentUser = null;
    try {
      const authResult = await authenticateRequest(req);
      if (authResult.isAuthenticated && authResult.user) {
        currentUser = authResult.user;
        console.log(`Logout request from authenticated user: ${currentUser.accountName}`);
      }
    } catch (authError) {
      // Continue with logout even if authentication fails
      console.log(" Logout request from unauthenticated session");
    }

    // Clear the auth token cookie for web clients
    try {
      const cookieStore = await cookies();
      cookieStore.delete("auth_token");
      console.log(" Auth cookie cleared");
    } catch (cookieError) {
      console.warn(" Could not clear cookie (mobile client?):", cookieError);
      // Continue for mobile clients that don't use cookies
    }

    const response = {
      success: true,
      message: "Logged out successfully",
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ Logout error:", error);
    
    // Still try to clear cookie even if there's an error
    try {
      const cookieStore = await cookies();
      cookieStore.delete("auth_token");
    } catch (cookieError) {
      // Ignore cookie errors
    }

    return NextResponse.json({ 
      success: true, // Return success even on error to ensure logout
      message: "Logged out (with errors)",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Use POST to logout",
    endpoint: "/api/auth/logout",
    method: "POST",
    description: "Logout user and clear authentication tokens",
    features: [
      "Clears HTTP-only cookies for web clients",
      "Provides token invalidation info for mobile clients",
      "Validates current session before logout",
      "Works for both authenticated and unauthenticated requests"
    ],
    note: "For mobile clients: After logout, delete the stored JWT token and device_id from secure storage",
    optional_headers: {
      "Authorization": "Bearer <jwt_token>",
      "x-device-id": "<device_identifier>"
    }
  });
}