import { NextRequest, NextResponse } from "next/server";
import { getDb, type InviteRecord } from "@/lib/mongodb";

// GET /api/invites/[token] — validate and return invite details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = await getDb();
    const invite = await db.collection<InviteRecord>("invites").findOne({ token });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    if (invite.status === "accepted") {
      return NextResponse.json({ error: "Invite already used" }, { status: 410 });
    }
    if (invite.status === "expired" || new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    return NextResponse.json({ invite });
  } catch (err: any) {
    console.error("[GET /api/invites/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/invites/[token] — mark accepted
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const db = await getDb();
    await db
      .collection<InviteRecord>("invites")
      .updateOne({ token }, { $set: { status: "accepted" } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PATCH /api/invites/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
