import { NextResponse } from "next/server";
import { AuthDAO } from "@/modules/user.auth";
import bcrypt from "bcryptjs";
import { generateToken, JWTPayload } from '@/lib/jwt';
import { getRolePermissions } from "@/lib/auth";
import { roles } from "@/data/user_management";
import { db } from "@/data/db_sql";
import { eq } from "drizzle-orm";

const authDAO = new AuthDAO();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { accountName, password, loginType } = body;

        const deviceId = req.headers.get("x-device-id");


        if (!accountName || !password || !loginType) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        if (!deviceId) {
            return NextResponse.json({
                success: false,
                error: "Device ID is required for security. Please provide device_id in request body.",
                code: "MISSING_DEVICE_ID"
            }, { status: 400 });
        }

        // Get user
        const user = await authDAO.getUserByAccountName(accountName);

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 400 }
            );
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { message: "Invalid password" },
                { status: 400 }
            );
        }

        //  Get role
        const roleData = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, user.roleId));

        const role = roleData[0];

        const allowedLoginTypes = ["monitoring", "service"];

        if (!allowedLoginTypes.includes(loginType)) {
            return NextResponse.json(
                { message: "Invalid login type" },
                { status: 400 }
            );
        }


        //  LOGIN TYPE CHECK
        if (loginType === "monitoring" && role.roleName !== "end user") {
            return NextResponse.json(
                { message: "Only end users can login here" },
                { status: 403 }
            );
        }

        if (
            loginType === "service" &&
            !["admin", "super admin"].includes(role.roleName)
        ) {
            return NextResponse.json(
                { message: "Only admin/super admin allowed" },
                { status: 403 }
            );
        }

        const permissions = await getRolePermissions(user.roleId);
        //  GENERATE TOKEN (WITH DEVICE-ID)
        const jwtPayload: JWTPayload = {
            userId: user.userId,
            email: user.email || "",
            accountName: accountName,
            role: {
                roleId: role.roleId,
                roleName: role.roleName,
                isSuperAdmin: !!role.isSuperadmin,
            },
            permissions: permissions,
            fingerprint: deviceId,
        };

        const token = generateToken(jwtPayload);

        return NextResponse.json({
            message: "Login successful",
            token,
            user: {
                userId: user.userId,
                accountName: user.accountName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                loginType: user.loginType,
                role: {
                    roleId: role.roleId,
                    roleName: role.roleName,
                    isSuperAdmin: !!role.isSuperadmin,
                },
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}