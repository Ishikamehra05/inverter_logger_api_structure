import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { forgetPasswordDAO } from "@/modules/forgetPassword";

const forgetPassword = new forgetPasswordDAO();

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const { accountName, new_password, confirm_password } = body;

    //  Basic validation
    if (!accountName || !new_password || !confirm_password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    //  Password match check
    if (new_password !== confirm_password) {
      return NextResponse.json(
        { message: "Passwords do not match" },
        { status: 400 },
      );
    }

    //  Get user
    const user = await forgetPassword.getUserByAccountName(accountName);

    if (!user || user.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const existingUser = user[0];

    const isSamePassword = await bcrypt.compare(
      new_password,
      existingUser.password,
    );

    if (isSamePassword) {
      return NextResponse.json(
        { message: "New password cannot be same as old password" },
        { status: 400 },
      );
    }

    //  Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    //  Update password
    await forgetPassword.updatePassword(existingUser.userId, hashedPassword);

    return NextResponse.json(
      {
        status: "success",
        message: "Password changed successfully",
        data: {
          accountName,
          password_updated: true,
          new_password
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
