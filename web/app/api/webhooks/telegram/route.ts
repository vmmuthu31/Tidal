import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSurrealClient } from "@/lib/surreal";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "default_secret";

function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (expectedSignature.length !== signature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const data = await req.json();
    const event = data.event;

    if (!event) {
      return NextResponse.json(
        { error: "Missing event data" },
        { status: 400 },
      );
    }

    const payloadString = JSON.stringify(event);
    if (!verifySignature(payloadString, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const db = await getSurrealClient();

    const userId = `user:telegram_${event.external_id}`;

    const userRecord = await db.select(userId).catch(() => null);

    if (!userRecord || (Array.isArray(userRecord) && userRecord.length === 0)) {
      await db.create(userId, {
        username:
          event.metadata?.username ||
          event.metadata?.first_name ||
          event.external_id,
        wallet_address: null,
        platform: "telegram",
        external_id: event.external_id,
        created_at: new Date().toISOString(),
      });
    }

    await db.create("interaction_log", {
      user: userId,
      action: event.kind,
      campaign_id: event.campaign_id,
      timestamp: event.timestamp || new Date().toISOString(),
      metadata: event.metadata,
      platform: "telegram",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
