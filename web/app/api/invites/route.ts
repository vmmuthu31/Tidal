import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDb, type InviteRecord } from "@/lib/mongodb";
import { randomUUID } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@suicrm.app";

// POST /api/invites — admin sends an invite
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminAddress, adminName, orgName, inviteeName, inviteeEmail, role: inviteRole } = body;

    if (!adminAddress || !adminName || !orgName || !inviteeName || !inviteeEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validRoles = ["viewer", "member", "manager", "admin"] as const;
    const selectedRole = validRoles.includes(inviteRole) ? inviteRole : "member";

    const db = await getDb();
    const invites = db.collection<InviteRecord>("invites");

    // Invalidate any existing pending invite for this email + org
    await invites.updateMany(
      { adminAddress, inviteeEmail, status: "pending" },
      { $set: { status: "expired" } }
    );

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite: InviteRecord = {
      token,
      adminAddress,
      adminName,
      orgName,
      inviteeName,
      inviteeEmail,
      role: selectedRole,
      status: "pending",
      expiresAt,
      createdAt: new Date(),
    };

    await invites.insertOne(invite);

    const inviteUrl = `${APP_URL}/invite/${token}`;

    // Send invite email via NodeMailer
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Tidal" <${FROM}>`,
      to: inviteeEmail,
      subject: `${adminName} invited you to join ${orgName} on Tidal`,
      html: buildInviteEmail({ inviteeName, adminName, orgName, inviteUrl }),
    });

    return NextResponse.json({ success: true, token }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/invites]", err);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}

// GET /api/invites?adminAddress=0x... — list invites sent by admin
export async function GET(req: NextRequest) {
  try {
    const adminAddress = req.nextUrl.searchParams.get("adminAddress");
    if (!adminAddress) return NextResponse.json({ error: "Missing adminAddress" }, { status: 400 });

    const db = await getDb();
    const invites = await db
      .collection<InviteRecord>("invites")
      .find({ adminAddress, status: { $ne: "removed" } })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich accepted invites: backfill memberAddress from user records if missing,
    // and add onchainRegistered status
    const enriched = await Promise.all(
      invites.map(async (invite) => {
        if (invite.status !== "accepted") return invite;

        let memberAddr = invite.memberAddress;

        // Backfill memberAddress for old invites (pre-code-change) by looking up user by email + orgAdminAddress
        if (!memberAddr) {
          const memberUser = await db.collection("users").findOne(
            { orgAdminAddress: adminAddress, email: invite.inviteeEmail, role: "member" },
            { projection: { suiAddress: 1, onchainRegistered: 1 } }
          );
          if (memberUser?.suiAddress) {
            memberAddr = memberUser.suiAddress;
            // Persist the backfill so we don't have to look it up again
            await db.collection<InviteRecord>("invites").updateOne(
              { token: invite.token },
              { $set: { memberAddress: memberAddr } }
            );
            return {
              ...invite,
              memberAddress: memberAddr,
              onchainRegistered: memberUser.onchainRegistered ?? false,
            };
          }
          return invite;
        }

        const memberUser = await db.collection("users").findOne(
          { suiAddress: memberAddr },
          { projection: { onchainRegistered: 1 } }
        );
        return { ...invite, onchainRegistered: memberUser?.onchainRegistered ?? false };
      })
    );

    return NextResponse.json({ invites: enriched });
  } catch (err: any) {
    console.error("[GET /api/invites]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildInviteEmail({
  inviteeName,
  adminName,
  orgName,
  inviteUrl,
}: {
  inviteeName: string;
  adminName: string;
  orgName: string;
  inviteUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden">

        <!-- Header -->
        <tr><td style="background:#1a1a1a;padding:32px 40px;text-align:center">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#fff;border-radius:14px;margin-bottom:12px">
            <span style="font-size:22px;font-weight:900;color:#1a1a1a">S</span>
          </div>
          <p style="margin:0;font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px">Tidal</p>
          <p style="margin:6px 0 0;font-size:12px;color:#94a3b8">Encrypted, on-chain customer relations</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px">
            You're invited, ${inviteeName}!
          </h1>
          <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6">
            <strong style="color:#1a1a1a">${adminName}</strong> has invited you to join
            <strong style="color:#1a1a1a">${orgName}</strong> as a team member on Tidal.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px">
            <tr><td align="center">
              <a href="${inviteUrl}"
                style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:16px 40px;border-radius:14px;letter-spacing:0.2px">
                Accept Invitation →
              </a>
            </td></tr>
          </table>

          <!-- Info box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:28px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">What is Tidal?</p>
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">
                A self-custodial CRM built on the Sui blockchain. You'll sign in with your Google account —
                no password required. Your identity is secured by zero-knowledge proofs.
              </p>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
            This invite expires in 7 days. If you weren't expecting this, you can safely ignore it.
            <br>Link: <a href="${inviteUrl}" style="color:#4f46e5">${inviteUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
          <p style="margin:0;font-size:11px;color:#cbd5e1">Powered by Sui Network · Self-custodial authentication</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
