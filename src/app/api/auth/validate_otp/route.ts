import { NextRequest, NextResponse } from "next/server";
import { db } from "@/data/db_sql";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: "Email and OTP are required" }, { status: 400 });
    }

    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // Fetch OTP from DB
    const [rows]: any = await db.execute(
      `SELECT * FROM otps WHERE email = "${email}" AND otp = ${otp} AND expires_at > "${currentTime}" LIMIT 1`
    );
    // const [rows]: any = await db.execute(
    //   `SELECT * FROM otp

    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid or expired OTP" }, { status: 401 });
    }

    // Optionally: Invalidate/Delete OTP after successful validation
    await db.execute(`DELETE FROM otps WHERE email = "${email}"`);

    return NextResponse.json({ success: true, message: "OTP validated successfully" });
  } catch (error) {
    console.error("OTP validation error:", error);
    return NextResponse.json({ success: false, message: "Failed to validate OTP" }, { status: 500 });
  }
}
