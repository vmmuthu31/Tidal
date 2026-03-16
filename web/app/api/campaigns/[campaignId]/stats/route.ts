import { NextResponse } from "next/server";
import { getSurrealClient } from "@/lib/surreal";

export async function GET(
  req: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params;
    const db = await getSurrealClient();

    const interactions = await db.query(
      `SELECT 
        COUNT() as total,
        kind,
        user
      FROM interaction_log 
      WHERE campaign_id = $campaignId 
      GROUP BY kind`,
      { campaignId }
    );

    const participantStats = await db.query(
      `SELECT 
        user,
        COUNT() as interaction_count
      FROM interaction_log 
      WHERE campaign_id = $campaignId 
      GROUP BY user
      ORDER BY interaction_count DESC
      LIMIT 10`,
      { campaignId }
    );

    const totalInteractions = await db.query(
      `SELECT COUNT() as total FROM interaction_log WHERE campaign_id = $campaignId`,
      { campaignId }
    );

    const uniqueParticipants = await db.query(
      `SELECT COUNT(DISTINCT user) as count FROM interaction_log WHERE campaign_id = $campaignId`,
      { campaignId }
    );

    const interactionsByKind = interactions.reduce(
      (acc: Record<string, number>, result: any) => {
        if (Array.isArray(result)) {
          result.forEach((item: any) => {
            acc[item.kind] = item.total;
          });
        }
        return acc;
      },
      {}
    );

    const topParticipants = participantStats
      .flat()
      .map((item: any) => ({
        user_id: item.user,
        interaction_count: item.interaction_count,
      }));

    const total = totalInteractions.flat()[0]?.total || 0;
    const participants = uniqueParticipants.flat()[0]?.count || 0;

    return NextResponse.json({
      campaign_id: campaignId,
      total_interactions: total,
      total_participants: participants,
      interactions_by_kind: interactionsByKind,
      top_participants: topParticipants,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Campaign stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign stats" },
      { status: 500 }
    );
  }
}
