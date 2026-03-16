"use client";

import { useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import { useUser } from "@/hooks/useUser";
import CONTRACT_CONFIG, { buildExplorerUrl, getCurrentPackageId } from "@/lib/config/contracts";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
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
  const { address } = useUnifiedAccount();
  const client = useSuiClient();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();
  const { user } = useUser();
  const orgRegistryId =
    user?.orgRegistryId ?? CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY;

  const [content, setContent] = useState("");
  const [accessLevel, setAccessLevel] = useState<OrgRole>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Please connect your wallet or sign in with ZK Login first");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { crmEncryptionService } = await import("@/lib/services/encryptionService");

      const result = await crmEncryptionService.encryptAndUploadResource(
        content,
        profileId,
        orgRegistryId,
        orgRegistryId,
        "note",
        accessLevel,
        address!
      );

      if (!result.success || !result.encryptionId || !result.blobId) {
        throw new Error(result.error || "Failed to encrypt and upload to Walrus");
      }

      const tx = new Transaction();
      const cleanEncId = result.encryptionId.startsWith("0x")
        ? result.encryptionId.slice(2)
        : result.encryptionId;
      const walrusBlobIdBytes = new TextEncoder().encode(result.blobId);
      const sealEncryptionIdBytes = new TextEncoder().encode(cleanEncId);

      const [resourceObj] = tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_ENCRYPTED_RESOURCE,
        arguments: [
          tx.pure.address(profileId),
          tx.pure.address(orgRegistryId),
          tx.pure.u8(CONTRACT_CONFIG.RESOURCE_TYPES.NOTE),
          tx.pure.vector("u8", walrusBlobIdBytes),
          tx.pure.vector("u8", sealEncryptionIdBytes),
          tx.pure.u8(accessLevel),
          tx.pure.u64(Date.now()),
        ],
      });
      // Freeze the resource so ANY org member can reference it in seal_approve.
      // transferObjects makes it owned (only admin can use) → members get 403.
      tx.moveCall({
        target: '0x2::transfer::public_freeze_object',
        typeArguments: [`${getCurrentPackageId()}::crm_access_control::EncryptedResource`],
        arguments: [resourceObj],
      });

      const res = await signAndExecuteTransaction({ transaction: tx });
      const txResult = await client.waitForTransaction({
        digest: res.digest,
        options: { showObjectChanges: true },
      });

      const createdObj = txResult.objectChanges?.find(
        (change: { type: string; objectType?: string }) =>
          change.type === "created" && change.objectType?.includes("EncryptedResource")
      );
      const resourceObjectId = createdObj
        ? (createdObj as { objectId: string }).objectId
        : null;

      // Save note metadata to MongoDB so it can be listed without a chain indexer
      if (resourceObjectId) {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: profileId,
            adminAddress: address,
            blobId: result.blobId,
            encryptionId: result.encryptionId,
            resourceObjectId,
            accessLevel,
            txDigest: res.digest,
          }),
        });
      }

      setContent("");
      onSuccess?.();

      toast.success("Note saved", {
        description: "Encrypted and stored on Walrus. Minted on Sui.",
        action: resourceObjectId
          ? {
              label: "View on Explorer",
              onClick: () =>
                window.open(
                  buildExplorerUrl(resourceObjectId, "object"),
                  "_blank"
                ),
            }
          : undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save note";
      setError(msg);
      toast.error("Could not save note", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="note-content"
          className="text-[11px] font-bold uppercase tracking-wider text-slate-500"
        >
          Content
        </Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g. Strategy: They want to invest $50K"
          rows={4}
          disabled={loading}
          className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white resize-none text-[#1a1a1a] placeholder:text-slate-400"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Access level
        </Label>
        <Select
          value={String(accessLevel)}
          onValueChange={(v) => setAccessLevel(Number(v) as OrgRole)}
          disabled={loading}
        >
          <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white h-11">
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
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        disabled={loading || !content.trim()}
        className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Encrypting & minting…
          </>
        ) : (
          "Save note"
        )}
      </Button>
    </form>
  );
}
