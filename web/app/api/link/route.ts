import { NextResponse } from "next/server";
import { getSurrealClient } from "@/lib/surreal";

export async function POST(req: Request) {
  try {
    const { code, platform, walletAddress } = await req.json();

    if (!code || !platform || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields (code, platform, walletAddress)" },
        { status: 400 },
      );
    }

    if (platform !== "discord" && platform !== "telegram") {
      return NextResponse.json(
        { error: "Invalid platform. Must be 'discord' or 'telegram'" },
        { status: 400 },
      );
    }

    const db = await getSurrealClient();

    const userId = `user:${platform}_${code}`;

    const userRecord = await db.select(userId).catch(() => null);

    if (!userRecord || (Array.isArray(userRecord) && userRecord.length === 0)) {
      return NextResponse.json(
        {
          error:
            "No shadow profile found for this code. Please interact with the bot first.",
        },
        { status: 404 },
      );
    }

    await db.merge(userId, {
      wallet_address: walletAddress,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Wallet linked successfully!",
    });
  } catch (error) {
    console.error("Link identity error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
