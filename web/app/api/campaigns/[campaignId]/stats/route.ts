import { NextRequest, NextResponse } from "next/server";
import { getSurrealClient } from "@/lib/surreal";

type InteractionRow = {
  user?: string;
  action?: string;
  metadata?: {
    username?: string;
    [key: string]: unknown;
  };
};

function extractRows(result: unknown): InteractionRow[] {
  if (!Array.isArray(result)) return [];
  if (result.length > 0 && typeof result[0] === "object" && result[0] && "result" in (result[0] as Record<string, unknown>)) {
    const first = result[0] as { result?: unknown };
    return Array.isArray(first.result) ? (first.result as InteractionRow[]) : [];
  }
  return result as InteractionRow[];
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const params = await context.params;
    const { campaignId } = params;
    const db = await getSurrealClient();

    const rawResult = await db.query(
      `SELECT user, action, metadata
       FROM interaction_log
       WHERE campaign_id = $campaignId`,
      { campaignId },
    );

    const rows = extractRows(rawResult);
    const total = rows.length;
    const byKind = new Map<string, number>();
    const users = new Map<string, { count: number; username?: string }>();

    for (const row of rows) {
      const kind = row.action || "campaign_interaction";
      byKind.set(kind, (byKind.get(kind) || 0) + 1);

      const userId = row.user || "unknown";
      const current = users.get(userId);
      users.set(userId, {
        count: (current?.count || 0) + 1,
        username: row.metadata?.username || current?.username,
      });
    }

    const topParticipants = Array.from(users.entries())
      .map(([user_id, value]) => ({
        user_id,
        username: value.username,
        interaction_count: value.count,
      }))
      .sort((a, b) => b.interaction_count - a.interaction_count)
      .slice(0, 10);

    const interactionsByKind: Record<string, number> = {};
    for (const [kind, count] of byKind.entries()) {
      interactionsByKind[kind] = count;
    }

    return NextResponse.json({
      campaign_id: campaignId,
      total_interactions: total,
      total_participants: users.size,
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
