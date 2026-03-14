import { NextRequest, NextResponse } from "next/server";
import { getDb, type FileRecord } from "@/lib/mongodb";
import CONTRACT_CONFIG from "@/lib/config/contracts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const db = await getDb();
    const raw = await db
      .collection<FileRecord>("files")
      .find({ contactId })
      .sort({ createdAt: -1 })
      .toArray();

    const files = raw.map((f) => ({
      id: f._id?.toString() ?? "",
      filename: f.filename,
      accessLevel: f.accessLevel,
      createdAt: f.createdAt.toISOString(),
      txDigest: f.txDigest,
      resource: {
        resource_id: f.resourceObjectId,
        profile_id: f.contactId,
        org_id: CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY,
        resource_type: "file" as const,
        blob_id: f.blobId,
        encryption_id: f.encryptionId,
        access_level: f.accessLevel,
        created_at: f.createdAt.toISOString(),
        created_by: f.adminAddress,
        walrus_url: "",
        sui_explorer_url: f.txDigest ? `https://suiscan.xyz/testnet/tx/${f.txDigest}` : "",
      },
    }));

    return NextResponse.json(files);
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
