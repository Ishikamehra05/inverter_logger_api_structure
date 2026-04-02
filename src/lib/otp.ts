import nodemailer from "nodemailer";
import { db } from "@/data/db_sql";

export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("Generated OTP:", otp);
  return otp;
}

// Save OTP to DB (upsert)
export async function saveOTP(email: string, otp: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await db.execute(
    `INSERT INTO otps (email, otp, expires_at, created_at, updated_at) 
     VALUES ('${email}', '${otp}', '${expiresAt
       .toISOString()
       .slice(0, 19)
       .replace("T", " ")}', NOW(), NOW()) 
     ON DUPLICATE KEY UPDATE 
       otp=VALUES(otp), 
       expires_at=VALUES(expires_at), 
       updated_at=NOW()`
  );
}

// -------- NETCORE EMAIL API (API KEY) ------------

type SendResult = {
  ok: boolean;
  data?: any;
  error?: any;
};

export async function sendOTPWithNetcore(email: string, otp: string): Promise<SendResult> {
  console.log("Attempting to send OTP via Netcore Email API...");

  const apiKey = 'a8102f788571ef1f931434c79c456348';
  if (!apiKey) {
    console.error("NETCORE_API_KEY is not set");
    return { ok: false, error: "NETCORE_API_KEY missing" };
  }

  const url = "https://emailapi.netcorecloud.net/v5/mail/send";

  const payload = {
    from: {
      email: "info@utlsolarrms.com",
      name: "UTL SOLAR",
    },
    subject: "Your OTP Code",
    content: [
      {
        type: "html",
        value: `<p>Your OTP code is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
      },
    ],
    personalizations: [
      {
        to: [
          {
            email,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        api_key: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON, keep raw text
    }

    if (!res.ok) {
      console.error("Netcore API error:", res.status, text);
      return { ok: false, error: `Status ${res.status}: ${text}` };
    }

    console.log("Netcore API success:", json || text);
    return { ok: true, data: json || text };
  } catch (err) {
    console.error("Netcore API request failed:", err);
    return { ok: false, error: err };
  }
}

// --- Nodemailer (SMTP) helper

export async function sendWithNodemailer(email: string, otp: string): Promise<SendResult> {
  console.log("Attempting to send via Nodemailer (SMTP)...");

  // 👉 In production, move these to env vars instead of hard-coding
  const transporter = nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: {
      user: "info@utlsolarrms.com",
      pass: "pM6kl+4iM2",
    },
  });

  // Optional verify
  try {
    const v = await transporter.verify();
    console.log("Nodemailer verify:", v);
  } catch (vErr) {
    console.warn("Nodemailer verify failed (non-fatal):", vErr);
  }

  const from = "UTL SOLAR <info@utlsolarrms.com>";

  const mailOptions = {
    from,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
    html: `<p>Your OTP code is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { ok: true, data: info }; // 👈 unified `data` field
  } catch (err) {
    console.error("Nodemailer sendMail error:", err);
    return { ok: false, error: err };
  }
}