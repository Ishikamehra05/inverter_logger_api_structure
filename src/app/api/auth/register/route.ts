import { NextResponse } from 'next/server';
import { AuthDAO } from '@/modules/user.auth';
import bcrypt from 'bcryptjs';
import { generateToken, JWTPayload } from '@/lib/jwt';
import { getRolePermissions } from '@/lib/auth';
import { dateUtils } from '@/data/dateHelpers';

const authDAO = new AuthDAO();
const current_date = dateUtils.formatDate();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountName, email, password, phoneNumber, registerType } = body;

    // device-id from headers
    const deviceId = req.headers.get('x-device-id');

    // Basic required fields
    if (!accountName || !password || !registerType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    //  device-id validation
    if (!deviceId) {
      return NextResponse.json(
        { message: "Device ID is required" },
        { status: 400 },
      );
    }

    const existingAccount = await authDAO.getUserByAccountName(accountName);

    if (existingAccount) {
      return NextResponse.json(
        { message: "Account name already exists" },
        { status: 400 },
      );
    }

    if (registerType === "email") {
      if (!email) {
        return NextResponse.json(
          { message: "Email is required for email registration" },
          { status: 400 },
        );
      }

      const existingEmail = await authDAO.getUserByEmail(email);

      if (existingEmail) {
        return NextResponse.json(
          { message: "Email already exists" },
          { status: 400 },
        );
      }
    }

    if (registerType === "phone") {
      if (!phoneNumber) {
        return NextResponse.json(
          { message: "Phone number is required for phone registration" },
          { status: 400 },
        );
      }
    }

    if (!["email", "phone"].includes(registerType)) {
      return NextResponse.json(
        { message: "Invalid registerType" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await authDAO.createUser({
      accountName,
      email: registerType === "email" ? email : null,
      phoneNumber: registerType === "phone" ? phoneNumber : null,
      password: hashedPassword,
      roleId: 3,
      loginType: "monitoring",
      registerType,
    });

    const newData = {
      ...newUser,
      createdAt: current_date,
      updatedAt: current_date
    }

    // get permissions
    const permissions = await getRolePermissions(3);

    //  JWT payload
    const jwtPayload: JWTPayload = {
      userId: newUser.userId, 
      email: email || "",
      accountName: accountName,
      role: {
        roleId: 3,
        roleName: null,
        isSuperAdmin: false,
      },
      permissions: permissions,
      fingerprint: deviceId,
    };

    // generate token
    const token = generateToken(jwtPayload);

    return NextResponse.json(
      {
        message: "User registered successfully",
        data: newData,
        token: token,
        device_id: deviceId,       
        permissions: permissions,   
      },
      { status: 201 },
    );

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}