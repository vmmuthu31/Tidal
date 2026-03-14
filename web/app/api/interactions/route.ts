import { NextRequest, NextResponse } from "next/server";
import { getDb, type InteractionRecord } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, adminAddress, type, message, txDigest } = body;
    if (!contactId || !adminAddress || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const db = await getDb();
    const record: InteractionRecord = {
      contactId, adminAddress, type, message,
      txDigest: txDigest ?? "",
      createdAt: new Date(),
    };
    const result = await db.collection<InteractionRecord>("interactions").insertOne(record);
    return NextResponse.json({ interaction: { ...record, _id: result.insertedId }, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
