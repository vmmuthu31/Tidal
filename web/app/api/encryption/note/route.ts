import { NextResponse } from "next/server";

// Stub endpoint called by encryptionService.storeEncryptionMetadata().
// Actual note metadata is saved by note-editor-form.tsx via /api/notes after the tx.
export async function POST() {
  return NextResponse.json({ ok: true });
}
