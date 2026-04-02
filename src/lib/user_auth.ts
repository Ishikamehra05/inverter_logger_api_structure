import {authenticateRequest, createUnauthorizedResponse} from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function getAuthenticatedUser(request: NextRequest) {
    const authResult = await authenticateRequest(request);

    if (!authResult.isAuthenticated || !authResult.user) {
        return {
            success: false,
            response: createUnauthorizedResponse(authResult.error),
            user: null
        };
    }

    return {
        success: true,
        user: authResult.user,
        response: null
    };
}