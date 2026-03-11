"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedSignAndExecuteTransaction } from "@/hooks/useUnifiedAuth";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuiNSInput } from "@/hooks/useSuiNS";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export function AddContactForm() {
  const router = useRouter();
  const { address } = useUnifiedAccount();
  const { signAndExecuteTransaction } = useUnifiedSignAndExecuteTransaction();

  // Raw input (can be "0x…" address or "alice.sui" name)
  const [walletInput, setWalletInput] = useState("");
  const { resolvedAddress, suiName, resolving, inputError } = useSuiNSInput(walletInput);
  const [twitter, setTwitter] = useState("");

  // Organization state fields
  const [orgId, setOrgId] = useState("");
  const [profileRegistryId, setProfileRegistryId] = useState<string>(CONTRACT_CONFIG.SHARED_OBJECTS.PROFILE_REGISTRY || "");
  const [uniqueTag, setUniqueTag] = useState("CONTACT_001");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Connect your wallet or sign in with ZK Login first");
      return;
    }
    const finalAddress = resolvedAddress ?? walletInput.trim();
    if (!finalAddress || !orgId.trim()) {
      setError("Organization ID and Wallet address are required");
      return;
    }
    if (inputError) {
      setError(inputError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Phase 3 placeholder: hardcoded for blob_id and encryption_id.
      // Evolving logic here to actually hook into "Walrus" & "Seal" will replace these buffers.
      const tx = new Transaction();

      const blobBytes = new TextEncoder().encode("mock_blob_123");
      const encBytes = new TextEncoder().encode("mock_enc_123");

      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_AND_REGISTER_PROFILE,
        arguments: [
          tx.object(profileRegistryId.trim()),
          tx.pure.address(orgId.trim()),       // Org ID
          tx.pure.address(finalAddress),
          tx.pure.string(uniqueTag.trim()),
          tx.pure.vector('u8', blobBytes),     // blob_id as vector
          tx.pure.vector('u8', encBytes),      // encryption_id as vector
        ],
      });

      const res = await signAndExecuteTransaction({ transaction: tx });

      toast.success("Contact Saved!", {
        description: `Profile ${uniqueTag} created securely.`,
        action: {
          label: "View Tx",
          onClick: () => window.open(buildExplorerUrl(res.digest, "tx"), "_blank"),
        },
      });

      console.log("Add contact successful", { address: finalAddress, suiName, twitter });
      // Clear out the form to prevent double submits 
      setWalletInput("");
      setTwitter("");
      setOrgId("");
      setUniqueTag("CONTACT_001");

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="registry-id">Profile Registry ID</Label>
        <Input
          id="registry-id"
          value={profileRegistryId}
          onChange={(e) => setProfileRegistryId(e.target.value)}
          placeholder="0x..."
          disabled={loading || !address}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-id">Organization ID</Label>
        <Input
          id="org-id"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="0x…"
          disabled={loading || !address}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-wallet">Wallet address or .sui name</Label>
        <div className="relative">
          <Input
            id="contact-wallet"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x… or alice.sui"
            disabled={loading || !address}
            className={inputError ? "border-red-300 focus-visible:ring-red-200" : suiName ? "border-emerald-300 focus-visible:ring-emerald-100" : ""}
          />
          {/* Resolution status indicator */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {resolving && <Loader2 className="size-4 text-slate-400 animate-spin" />}
            {!resolving && suiName && <CheckCircle2 className="size-4 text-emerald-500" />}
            {!resolving && inputError && <AlertCircle className="size-4 text-red-400" />}
          </div>
        </div>
        {/* Show resolved address when a .sui name is typed */}
        {suiName && resolvedAddress && (
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="size-3.5" />
            Resolved <span className="font-bold">{suiName}</span> →{" "}
            <span className="font-mono">{resolvedAddress.slice(0, 8)}…{resolvedAddress.slice(-6)}</span>
          </p>
        )}
        {inputError && (
          <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
            <AlertCircle className="size-3.5" />
            {inputError}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="unique-tag">Unique Tag</Label>
        <Input
          id="unique-tag"
          value={uniqueTag}
          onChange={(e) => setUniqueTag(e.target.value)}
          placeholder="e.g. CONTACT_001"
          disabled={loading || !address}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-twitter">Twitter (optional)</Label>
        <Input
          id="contact-twitter"
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="@cryptowhale"
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || !address}>
        {loading ? "Creating…" : "Create Contact"}
      </Button>
    </form>
  );
}
