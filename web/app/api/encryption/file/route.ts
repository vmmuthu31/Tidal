import { NextResponse } from "next/server";

// Stub endpoint called by encryptionService.storeEncryptionMetadata().
// Actual file metadata is saved by profile-files.tsx via /api/files after the tx.
export async function POST() {
  return NextResponse.json({ ok: true });
}
