import { NextRequest, NextResponse } from "next/server";
import { getDb, type InteractionRecord } from "@/lib/mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const db = await getDb();
    const interactions = await db
      .collection<InteractionRecord>("interactions")
      .find({ contactId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(interactions.map((i) => ({
      ...i,
      _id: i._id?.toString(),
      createdAt: i.createdAt.toISOString(),
    })));
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
