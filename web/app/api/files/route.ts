import { NextRequest, NextResponse } from "next/server";
import { getDb, type FileRecord } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, adminAddress, filename, blobId, encryptionId, resourceObjectId, accessLevel, txDigest } = body;
    if (!contactId || !adminAddress || !blobId || !encryptionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const db = await getDb();
    const record: FileRecord = {
      contactId, adminAddress,
      filename: filename || "untitled",
      blobId, encryptionId,
      resourceObjectId: resourceObjectId ?? "",
      accessLevel: accessLevel ?? 2,
      txDigest: txDigest ?? "",
      createdAt: new Date(),
    };
    const result = await db.collection<FileRecord>("files").insertOne(record);
    return NextResponse.json({ file: { ...record, _id: result.insertedId }, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
