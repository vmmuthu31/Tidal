import { NextResponse } from "next/server";
import { getSurrealClient } from "@/lib/surreal";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "active";

    const db = await getSurrealClient();

    const campaigns = await db.select("campaign:*");

    const filtered = campaigns
      .filter((c: any) => !status || c.status === status)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        created_by: c.created_by,
        guild_id: c.guild_id,
        channel_id: c.channel_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

    return NextResponse.json({
      campaigns: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Campaigns list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const db = await getSurrealClient();

    if (!data.name) {
      return NextResponse.json({ error: "Campaign name required" }, { status: 400 });
    }

    const campaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description || null,
      status: data.status || "active",
      created_by: data.created_by || null,
      guild_id: data.guild_id || null,
      channel_id: data.channel_id || null,
      start_date: data.start_date || new Date().toISOString(),
      end_date: data.end_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await db.create("campaign", campaign);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Campaign creation error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
