import { NextRequest, NextResponse } from "next/server";
import { getDb, type ContactRecord } from "@/lib/mongodb";

// GET /api/contacts?adminAddress=0x...
export async function GET(req: NextRequest) {
  try {
    const adminAddress = req.nextUrl.searchParams.get("adminAddress");
    if (!adminAddress) return NextResponse.json({ error: "Missing adminAddress" }, { status: 400 });

    const db = await getDb();
    const contacts = await db
      .collection<ContactRecord>("contacts")
      .find({ adminAddress })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ contacts });
  } catch (err: any) {
    console.error("[GET /api/contacts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/contacts — save a contact after on-chain creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminAddress, orgName, name, walletAddress, tag, twitter, email, company, notes, onchainTxDigest, onchainObjectId } = body;

    if (!adminAddress || !name || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    const contacts = db.collection<ContactRecord>("contacts");

    const contact: ContactRecord = {
      adminAddress,
      orgName: orgName ?? "",
      name,
      walletAddress,
      tag: tag ?? "",
      twitter,
      email,
      company,
      notes,
      onchainTxDigest,
      onchainObjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await contacts.insertOne(contact);
    return NextResponse.json({ contact: { ...contact, _id: result.insertedId }, success: true }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/contacts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
