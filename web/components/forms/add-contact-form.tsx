"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddContactForm() {
  const router = useRouter();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [walletAddress, setWalletAddress] = useState("");
  const [twitter, setTwitter] = useState("");

  // Organization state fields
  const [orgId, setOrgId] = useState("");
  const [profileRegistryId, setProfileRegistryId] = useState<string>(CONTRACT_CONFIG.SHARED_OBJECTS.PROFILE_REGISTRY || "");
  const [uniqueTag, setUniqueTag] = useState("CONTACT_001");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Connect your wallet first");
      return;
    }
    if (!walletAddress.trim() || !orgId.trim()) {
      setError("Organization ID and Wallet address are required");
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
          tx.pure.address(walletAddress.trim()),
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

      console.log("Add contact successful", { walletAddress, twitter });
      // Clear out the form to prevent double submits 
      setWalletAddress("");
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
          disabled={loading || !account}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-id">Organization ID</Label>
        <Input
          id="org-id"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="0x…"
          disabled={loading || !account}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-wallet">Wallet address</Label>
        <Input
          id="contact-wallet"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="0x…"
          disabled={loading || !account}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unique-tag">Unique Tag</Label>
        <Input
          id="unique-tag"
          value={uniqueTag}
          onChange={(e) => setUniqueTag(e.target.value)}
          placeholder="e.g. CONTACT_001"
          disabled={loading || !account}
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
      <Button type="submit" disabled={loading || !account}>
        {loading ? "Creating…" : "Create Contact"}
      </Button>
    </form>
  );
}
