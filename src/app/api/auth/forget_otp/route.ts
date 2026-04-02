import { NextRequest, NextResponse } from "next/server";
import { db } from "@/data/db_sql";
import { users } from "@/data/user_management";
import { eq } from "drizzle-orm";
import { generateOTP, sendOTPWithNetcore, saveOTP, sendWithNodemailer } from "@/lib/otp";


// ---------- API ROUTE ----------
export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required" },
        { status: 400 }
      );
    }

    // 1) Verify user exists
    const userRows = await db.select().from(users).where(eq(users.email, email));
    if (userRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "No account found with this email." },
        { status: 200 }
      );
    }

    // 2) Generate OTP
    const otp = generateOTP();

    // 3) Try Netcore first
    const netcoreResult = await sendOTPWithNetcore(email, otp);

    if (netcoreResult.ok) {
      await saveOTP(email, otp);
      return NextResponse.json({
        success: true,
        via: "netcore",
        message: "OTP sent via Netcore Email API",
        data: netcoreResult.data ?? null,
      });
    }

    console.warn("Netcore failed, falling back to Nodemailer:", netcoreResult.error);

    // 4) Fallback to Nodemailer
    const nodemailerResult = await sendWithNodemailer(email, otp);

    if (nodemailerResult.ok) {
      await saveOTP(email, otp);
      return NextResponse.json({
        success: true,
        via: "nodemailer",
        message: "OTP sent via Nodemailer (SMTP)",
        data: nodemailerResult.data ?? null,
      });
    }

    // 5) Both failed
    return NextResponse.json(
      {
        success: false,
        message: "Unable to send OTP via Netcore or Nodemailer",
        netcoreError: netcoreResult.error,
        nodemailerError: nodemailerResult.error,
      },
      { status: 500 }
    );
  } catch (err) {
    console.error("route.ts POST error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
