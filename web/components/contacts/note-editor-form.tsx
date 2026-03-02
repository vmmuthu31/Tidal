"use client";

import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgRole } from "@/lib/types/crm";

interface NoteEditorFormProps {
  profileId: string;
  accessLevelOptions: { value: OrgRole; label: string }[];
  onSuccess?: () => void;
}

export function NoteEditorForm({
  profileId,
  accessLevelOptions,
  onSuccess,
}: NoteEditorFormProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [content, setContent] = useState("");
  const [accessLevel, setAccessLevel] = useState<OrgRole>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1) Direct Walrus upload (Phase 1)
      // 2) Seal encrypt + Walrus upload (Phase 2)
      console.log("Encrypting and uploading note...", { profileId, content, accessLevel });
      const { crmEncryptionService } = await import("@/lib/services/encryptionService");

      // MOCK DATA for now until we have full auth context
      const MOCK_ORG_ID = CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY; // org acts as its own registry
      const MOCK_ORG_REGISTRY_ID = CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY;

      const result = await crmEncryptionService.encryptAndUploadResource(
        content,
        profileId,
        MOCK_ORG_ID,
        MOCK_ORG_REGISTRY_ID,
        'note',
        accessLevel,
        account.address
      );

      if (!result.success || !result.encryptionId || !result.blobId) {
        throw new Error(result.error || "Failed to encrypt and upload to Walrus");
      }
      console.log("Uploaded successfully! Encryption ID:", result.encryptionId, "Blob ID:", result.blobId);

      // 3) Create the EncryptedResource object on Sui (Phase 3)
      console.log("Minting EncryptedResource on Sui...");
      const tx = new Transaction();

      // Ensure encryptionId does not have 0x prefix for the vector<u8> argument
      const cleanEncId = result.encryptionId.startsWith('0x') ? result.encryptionId.slice(2) : result.encryptionId;

      const walrusBlobIdBytes = new TextEncoder().encode(result.blobId);
      const sealEncryptionIdBytes = new TextEncoder().encode(cleanEncId);

      // We use the connected wallet's address dynamically as a valid 32-byte hex string
      // so the SUI SDK validation passes. In production, these will be the real Object IDs.
      const MOCK_VALID_ADDRESS = account.address;

      const [resourceObj] = tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_ENCRYPTED_RESOURCE,
        arguments: [
          tx.pure.address(MOCK_VALID_ADDRESS), // Mocking profile_id with wallet address
          tx.pure.address(MOCK_VALID_ADDRESS), // Mocking org_id with wallet address
          tx.pure.u8(CONTRACT_CONFIG.RESOURCE_TYPES.NOTE),
          tx.pure.vector('u8', walrusBlobIdBytes),
          tx.pure.vector('u8', sealEncryptionIdBytes),
          tx.pure.u8(accessLevel),
          tx.pure.u64(Date.now()),
        ],
      });
      tx.transferObjects([resourceObj], tx.pure.address(account.address));

      const res = await signAndExecuteTransaction({
        transaction: tx
      });

      console.log("Transaction Submitted:", res.digest);
      const txResult = await client.waitForTransaction({
        digest: res.digest,
        options: { showObjectChanges: true }
      });

      // Find the created object ID
      const createdObj = txResult.objectChanges?.find((change: any) => change.type === 'created' && change.objectType.includes('EncryptedResource'));
      const resourceObjectId = createdObj ? (createdObj as any).objectId : "Unknown";

      console.log(" Resource Object ID created:", resourceObjectId);
      alert(`Note saved! SUI Object ID required for test decryption: ${resourceObjectId}`);

      setContent("");
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Strategy: They want to invest $50K"
          rows={4}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label>Access level</Label>
        <Select
          value={String(accessLevel)}
          onValueChange={(v) => setAccessLevel(Number(v) as OrgRole)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accessLevelOptions.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || !content.trim()}>
        {loading ? "Saving…" : "Save Note"}
      </Button>
    </form>
  );
}
