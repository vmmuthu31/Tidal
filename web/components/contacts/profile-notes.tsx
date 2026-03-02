"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NoteEditorForm } from "@/components/contacts/note-editor-form";
import { ACCESS_LEVEL_OPTIONS } from "@/lib/types/crm";

interface ProfileNotesProps {
  profileId: string;
}

// Placeholder list; replace with API/onchain resources
const mockNotes: { id: string; accessLevel: number; createdAt: string }[] = [];

import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { crmDecryptionService, ResourceMetadata } from "@/lib/services/decryptionService";

export function ProfileNotes({ profileId }: ProfileNotesProps) {
  const [open, setOpen] = useState(false);

  // Wallet Integration
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Encrypted notes (Seal + Walrus). Access level controls who can
            decrypt.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add note</DialogTitle>
              <DialogDescription>
                Content is encrypted with Seal, stored on Walrus, and access
                recorded on Sui.
              </DialogDescription>
            </DialogHeader>
            <NoteEditorForm
              profileId={profileId}
              accessLevelOptions={ACCESS_LEVEL_OPTIONS}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {mockNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes yet. Add a note to store encrypted content.
          </p>
        ) : (
          <ul className="space-y-2 mb-6">
            {mockNotes.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="text-muted-foreground">
                  Access:{" "}
                  {ACCESS_LEVEL_OPTIONS.find((o) => o.value === n.accessLevel)
                    ?.label ?? n.accessLevel}
                </span>
                <span className="text-muted-foreground">{n.createdAt}</span>
              </li>
            ))}
          </ul>
        )}

        {/* --- DECRYPTION TEST UI --- */}
        <div className="mt-8 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-2">Test Decryption Flow (Requires Wallet)</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Enter the Blob ID and Encryption ID from your console logs to simulate fetching a note from Walrus and decrypting it with Seal using your active wallet session.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Blob ID"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                id="test-blob-id"
              />
              <input
                type="text"
                placeholder="Encryption ID"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                id="test-encryption-id"
              />
              <input
                type="text"
                placeholder="Resource Object ID"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                id="test-resource-id"
              />
            </div>

            {!currentAccount ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 border border-amber-200 rounded-md">
                Please connect your Sui wallet out side to test real decryption.
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const blobId = (document.getElementById("test-blob-id") as HTMLInputElement).value;
                  const encId = (document.getElementById("test-encryption-id") as HTMLInputElement).value;
                  const resId = (document.getElementById("test-resource-id") as HTMLInputElement).value;
                  if (!blobId || !encId || !resId) return alert("Enter all 3 IDs");

                  const outputEl = document.getElementById("test-output");
                  if (outputEl) outputEl.innerText = "Generating Ephemeral Session Key...";

                  try {
                    // 1. Create a session key for the user
                    const sessionKey = await crmDecryptionService.createSessionKey(currentAccount.address);

                    if (outputEl) outputEl.innerText = "Please sign the personal message in your wallet to authorize Seal...";

                    // 2. Sign the session key's personal message
                    const signatureResponse = await signPersonalMessage({
                      message: sessionKey.getPersonalMessage(),
                    });

                    // 3. Complete the session key setup
                    await sessionKey.setPersonalMessageSignature(signatureResponse.signature);

                    if (outputEl) outputEl.innerText = "Wallet authorized! Fetching and decrypting from Walrus...";

                    // 4. MOCK ORG METADATA (Replace later)
                    const MOCK_ORG_REGISTRY_ID = "0x0000000000000000000000000000000000000000000000000000000000000456";

                    // 5. Structure the resource for the decryption service
                    const mockResource: ResourceMetadata = {
                      resource_id: resId, // object ID of the actual resource on-chain
                      profile_id: profileId,
                      org_id: MOCK_ORG_REGISTRY_ID,
                      resource_type: 'note',
                      blob_id: blobId,
                      encryption_id: encId,
                      access_level: 0,
                      created_at: new Date().toISOString(),
                      created_by: currentAccount.address,
                      walrus_url: '',
                      sui_explorer_url: ''
                    };

                    // 6. Decrypt
                    const result = await crmDecryptionService.downloadAndDecryptResources(
                      [mockResource],
                      MOCK_ORG_REGISTRY_ID,
                      sessionKey,
                      (progress) => { if (outputEl) outputEl.innerText += `\n${progress}` }
                    );

                    if (outputEl) {
                      if (result.success && result.decryptedFileUrls && result.decryptedFileUrls.length > 0) {
                        // Fetch the blob URL to display the text directly
                        const response = await fetch(result.decryptedFileUrls[0]);
                        const text = await response.text();

                        outputEl.innerText = text;
                        outputEl.className = "mt-4 p-4 bg-green-50 text-green-800 text-sm rounded-md border border-green-200 break-all";
                      } else {
                        outputEl.innerText = "Error: " + result.error;
                        outputEl.className = "mt-4 p-4 bg-red-50 text-red-800 text-sm rounded-md border border-red-200 break-all";
                      }
                    }
                  } catch (err) {
                    if (outputEl) {
                      outputEl.innerText = String(err);
                      outputEl.className = "mt-4 p-4 bg-red-50 text-red-800 text-sm rounded-md border border-red-200 break-all";
                    }
                  }
                }}
              >
                Decrypt with Wallet
              </Button>
            )}
            <div id="test-output" className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
