import { NextRequest, NextResponse } from "next/server";
import { generateOTP, sendOTPWithNetcore, saveOTP, sendWithNodemailer } from "@/lib/otp";



// ---------- API ROUTE ----------
export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    console.log(`\n====== OTP PROCESS STARTED FOR: ${email} ======`);

    // Generate one OTP and try Netcore first
    const otp = generateOTP();

    const netcoreResult = await sendOTPWithNetcore(email, otp);

    if (netcoreResult.ok) {
      await saveOTP(email, otp);
      console.log("FINAL: Sent via Netcore Email API");
      return NextResponse.json({
        success: true,
        via: "netcore",
        message: "OTP sent to email via Netcore",
        data: netcoreResult.data ?? null,
      });
    }

    console.warn("Netcore failed, falling back to Nodemailer...", netcoreResult.error);

    // Fallback to Nodemailer using the SAME OTP
    const smtpResult = await sendWithNodemailer(email, otp);

    if (smtpResult.ok) {
      await saveOTP(email, otp);
      console.log("FINAL: Sent via SMTP (Nodemailer)");
      return NextResponse.json({
        success: true,
        via: "smtp",
        message: "OTP sent to email via SMTP (fallback)",
        data: smtpResult.data ?? null,
      });
    }

    // Both providers failed
    console.error("FINAL: BOTH PROVIDERS FAILED", {
      netcoreError: netcoreResult.error,
      smtpError: smtpResult.error,
    });

    return NextResponse.json(
      { success: false, message: "Sending OTP Failed - 100" },
      { status: 500 }
    );
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send OTP-101" },
      { status: 500 }
    );
  }
}
