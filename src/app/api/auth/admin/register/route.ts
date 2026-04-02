import { NextResponse, NextRequest } from 'next/server';
import { AuthDAO } from '@/modules/user.auth';
import bcrypt from 'bcryptjs';
import { generateToken, JWTPayload } from '@/lib/jwt';
import { getRolePermissions } from '@/lib/auth';
import { dateUtils } from '@/data/dateHelpers';
import { hasPermission } from "@/lib/jwt";
import { getAuthenticatedUser } from "@/lib/user_auth";

const authDAO = new AuthDAO();
const current_date = dateUtils.formatDate();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            accountName,
            email,
            password,
            confirmPassword,
            phoneNumber,
        } = body;

        const { success, user, response } = await getAuthenticatedUser(req);

        if (!success || !user) {
            return response;
        }

        const userId = user.userId;

        // permission check
        const canCreate = user.role?.isSuperAdmin || await hasPermission(userId, "create_admin");

        if (!canCreate) {
            return NextResponse.json(
                { error: "Forbidden", message: "No permission to create admin" },
                { status: 403 }
            );
        }

        // Get device ID from headers
        const deviceId = req.headers.get('x-device-id');

        // ================= VALIDATIONS =================

        if (!accountName || !password || !confirmPassword) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Password match
        if (password !== confirmPassword) {
            return NextResponse.json(
                { message: "Passwords do not match" },
                { status: 400 }
            );
        }

        // Device ID check
        if (!deviceId) {
            return NextResponse.json(
                { message: "Device ID is required" },
                { status: 400 }
            );
        }



        // Check account name
        const existingAccount = await authDAO.getUserByAccountName(accountName);
        if (existingAccount) {
            return NextResponse.json(
                { message: "Account name already exists" },
                { status: 400 }
            );
        }

        // Email validation (if provided)
        if (email) {
            const existingEmail = await authDAO.getUserByEmail(email);
            if (existingEmail) {
                return NextResponse.json(
                    { message: "Email already exists" },
                    { status: 400 }
                );
            }
        }

        // ================= BUSINESS LOGIC =================

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Decide register type
        // const registerType = email ? "email" : "phone";

        // Create user
        const newUser = await authDAO.createUser({
            accountName,
            email: email || null,
            phoneNumber: phoneNumber || null,
            password: hashedPassword,
            roleId: 2,              // default role
            loginType: "service",   // default login type
            //   registerType,
        });

        const newData = {
            ...newUser,
            createdAt: current_date,
            updatedAt: current_date,
        };

        // Get permissions
        const permissions = await getRolePermissions(2);

        // ================= JWT =================

        const jwtPayload: JWTPayload = {
            userId: newUser.userId,
            email: email || "",
            accountName: accountName,
            role: {
                roleId: 2,
                roleName: null,
                isSuperAdmin: false,
            },
            permissions: permissions,
            fingerprint: deviceId,
        };

        const token = generateToken(jwtPayload);

        // ================= RESPONSE =================

        return NextResponse.json(
            {
                message: "User registered successfully",
                data: newData,
                token: token,
                device_id: deviceId,
                permissions: permissions,
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("REGISTER API ERROR:", error);

        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}