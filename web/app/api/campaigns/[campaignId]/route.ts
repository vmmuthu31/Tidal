import { NextRequest, NextResponse } from "next/server";
import { getSurrealClient } from "@/lib/surreal";

interface CampaignRecord {
  id?: string | { tb?: string; id?: string };
  name?: string;
  description?: string | null;
  status?: "active" | "paused" | "completed";
  created_by?: string | null;
  guild_id?: string | null;
  channel_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

function toCampaignId(id: CampaignRecord["id"]): string {
  if (!id) return "";
  if (typeof id === "string") {
    return id.includes(":") ? id.split(":")[1] : id;
  }
  if (id.id) return id.id;
  return "";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const { campaignId } = await context.params;
    const db = await getSurrealClient();
    const record = (await db.select(
      `campaign:${campaignId}`,
    )) as CampaignRecord | CampaignRecord[] | null;

    const campaign = Array.isArray(record) ? record[0] : record;
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: toCampaignId(campaign.id),
      name: campaign.name,
      description: campaign.description || undefined,
      status: campaign.status || "active",
      created_by: campaign.created_by || undefined,
      guild_id: campaign.guild_id || undefined,
      channel_id: campaign.channel_id || undefined,
      start_date: campaign.start_date || undefined,
      end_date: campaign.end_date || undefined,
      created_at: campaign.created_at || new Date().toISOString(),
      updated_at: campaign.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error("Campaign fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 },
    );
  }
}
