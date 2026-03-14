import { NextRequest, NextResponse } from "next/server";
import { getDb, type NoteRecord } from "@/lib/mongodb";

// POST /api/notes — save note metadata after on-chain creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, adminAddress, blobId, encryptionId, resourceObjectId, accessLevel, txDigest } = body;

    if (!contactId || !adminAddress || !blobId || !encryptionId || !resourceObjectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    const note: NoteRecord = {
      contactId,
      adminAddress,
      blobId,
      encryptionId,
      resourceObjectId,
      accessLevel: accessLevel ?? 3,
      txDigest: txDigest ?? "",
      createdAt: new Date(),
    };

    const result = await db.collection<NoteRecord>("notes").insertOne(note);
    return NextResponse.json({ note: { ...note, _id: result.insertedId }, success: true }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
