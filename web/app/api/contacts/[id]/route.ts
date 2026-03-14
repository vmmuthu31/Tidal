import { NextRequest, NextResponse } from "next/server";
import { getDb, type ContactRecord } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/contacts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = await getDb();
    let contact: ContactRecord | null = null;

    // Try ObjectId lookup first, fallback to string match
    try {
      contact = await db.collection<ContactRecord>("contacts").findOne({ _id: new ObjectId(id) as any });
    } catch {
      contact = await db.collection<ContactRecord>("contacts").findOne({ _id: id as any });
    }

    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (err: any) {
    console.error("[GET /api/contacts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
