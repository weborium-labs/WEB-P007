import { env } from "../config/env.js";

const FRONTEND_URL = (env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

function baseLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weborium Labs IMS</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#141B2A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F8FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background-color:#FFFFFF;border-radius:20px;border:1px solid #EEF0F3;overflow:hidden;box-shadow:0 10px 30px rgba(20,27,42,0.06);">
          
          <!-- Dark Brand Header matching your Auth Visual Panel -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#020407 0%,#0E1B3D 55%,#1D4ED8 100%);padding:28px 24px;">
              <div style="font-size:18px;font-weight:700;letter-spacing:-0.03em;color:#FFFFFF;">
                Weborium Labs
              </div>
              <div style="margin-top:4px;font-family:monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);">
                Internship Management System
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#F7F8FA;border-top:1px solid #EEF0F3;padding:18px 24px;">
              <p style="margin:0;font-size:11px;line-height:16px;color:#647087;">
                Powered by <strong style="color:#141B2A;">Weborium Labs</strong>
              </p>
              <p style="margin:4px 0 0;font-size:11px;line-height:16px;color:#98A2B3;">
                This is an automated security message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function renderOtpBoxes(otp: string): string {
    const digits = otp.split("");
    return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
      <tr>
        ${digits
            .map(
                (digit) => `
          <td style="padding:0 6px;">
            <div style="width:48px;height:54px;line-height:54px;text-align:center;background-color:#F1F3F6;border:1px solid #E2E6EC;border-radius:12px;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:#141B2A;">
              ${digit}
            </div>
          </td>
        `,
            )
            .join("")}
      </tr>
    </table>
  `;
}

export function getSignupOtpEmailTemplate(params: {
    username: string;
    otp: string;
}): string {
    return baseLayout(`
    <h1 style="margin:0;text-align:center;font-size:21px;font-weight:700;letter-spacing:-0.02em;color:#141B2A;">
      Verify your email address
    </h1>
    <p style="margin:10px 0 0;text-align:center;font-size:14px;line-height:21px;color:#536078;">
      Hi <strong style="color:#141B2A;">${params.username}</strong>, enter the 4-digit verification code below to activate your IMS workspace account.
    </p>

    ${renderOtpBoxes(params.otp)}

    <p style="margin:0;text-align:center;font-size:12px;line-height:18px;color:#647087;">
      This code expires in <strong style="color:#141B2A;">10 minutes</strong>.
    </p>

    <div style="margin-top:24px;padding:12px 14px;background-color:#F7F8FA;border-radius:12px;border-left:3px solid #2862F4;">
      <p style="margin:0;font-size:12px;line-height:18px;color:#536078;">
        If you didn&apos;t create an account on Weborium Labs IMS, you can safely ignore this email.
      </p>
    </div>
  `);
}

export function getPasswordResetOtpEmailTemplate(params: {
    username: string;
    otp: string;
}): string {
    return baseLayout(`
    <h1 style="margin:0;text-align:center;font-size:21px;font-weight:700;letter-spacing:-0.02em;color:#141B2A;">
      Reset your password
    </h1>
    <p style="margin:10px 0 0;text-align:center;font-size:14px;line-height:21px;color:#536078;">
      Hi <strong style="color:#141B2A;">${params.username}</strong>, we received a request to reset your password. Use the 4-digit code below to proceed:
    </p>

    ${renderOtpBoxes(params.otp)}

    <p style="margin:0;text-align:center;font-size:12px;line-height:18px;color:#647087;">
      This code expires in <strong style="color:#141B2A;">10 minutes</strong>.
    </p>

    <div style="margin-top:24px;padding:12px 14px;background-color:#FFF8F6;border-radius:12px;border-left:3px solid #D94A4A;">
      <p style="margin:0;font-size:12px;line-height:18px;color:#647087;">
        Didn&apos;t request a password reset? Ignore this email—your current password will remain unchanged.
      </p>
    </div>
  `);
}

export function getWelcomeEmailTemplate(params: {
    username: string;
    role: string;
}): string {
    const loginLink = `${FRONTEND_URL}/login`;

    return baseLayout(`
    <div style="text-align:center;">
      <span style="display:inline-block;padding:5px 12px;background-color:#ECFDF5;color:#2EAD79;border-radius:999px;font-size:12px;font-weight:600;">
        ✓ Email Verified
      </span>
    </div>

    <h1 style="margin:14px 0 0;text-align:center;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#141B2A;">
      Welcome to Weborium Labs IMS!
    </h1>
    <p style="margin:10px 0 0;text-align:center;font-size:14px;line-height:21px;color:#536078;">
      Hi <strong style="color:#141B2A;">${params.username}</strong>, your account is verified and ready as <strong style="color:#2862F4;">${params.role}</strong>.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0;background-color:#F7F8FA;border-radius:14px;padding:16px;">
      <tr>
        <td style="font-size:13px;line-height:22px;color:#30394B;">
          <div style="font-weight:600;color:#141B2A;margin-bottom:6px;">Next steps to get started:</div>
          <div>1. Log in to your workspace dashboard</div>
          <div>2. Complete your profile &amp; KYC document verification</div>
          <div>3. Track your daily attendance, tasks, and batch updates</div>
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto 8px;">
      <tr>
        <td align="center" style="border-radius:12px;background-color:#2862F4;">
          <a href="${loginLink}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">
            Go to Login &rarr;
          </a>
        </td>
      </tr>
    </table>
  `);
}