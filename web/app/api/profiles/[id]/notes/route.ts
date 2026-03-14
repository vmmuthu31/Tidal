import { NextRequest, NextResponse } from "next/server";
import { getDb, type NoteRecord } from "@/lib/mongodb";
import CONTRACT_CONFIG from "@/lib/config/contracts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params;
    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
    }

    const db = await getDb();
    const rawNotes = await db
      .collection<NoteRecord>("notes")
      .find({ contactId: profileId })
      .sort({ createdAt: -1 })
      .toArray();

    // Map to ResourceMetadata shape expected by ProfileNotes component
    const notes = rawNotes.map((n) => ({
      resource_id: n.resourceObjectId,
      profile_id: n.contactId,
      org_id: CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY,
      resource_type: "note" as const,
      blob_id: n.blobId,
      encryption_id: n.encryptionId,
      access_level: n.accessLevel,
      created_at: n.createdAt.toISOString(),
      created_by: n.adminAddress,
      walrus_url: "",
      sui_explorer_url: n.txDigest
        ? `https://suiscan.xyz/testnet/tx/${n.txDigest}`
        : "",
    }));

    return NextResponse.json(notes);
  } catch (err: unknown) {
    console.error("[/api/profiles/[id]/notes] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch notes" },
      { status: 500 }
    );
  }
}
