"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import { useUser } from "@/hooks/useUser";
import { useSuiClient } from "@mysten/dapp-kit";
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
  const { user } = useUser();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();
  const suiClient = useSuiClient();

  const [name, setName] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const { resolvedAddress, suiName, resolving, inputError } = useSuiNSInput(walletInput);
  const [twitter, setTwitter] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const [profileRegistryId] = useState<string>(CONTRACT_CONFIG.SHARED_OBJECTS.PROFILE_REGISTRY || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Connect your wallet or sign in with ZK Login first");
      return;
    }
    if (!name.trim()) {
      setError("Contact name is required");
      return;
    }
    const finalAddress = resolvedAddress ?? walletInput.trim();
    if (!finalAddress) {
      setError("Wallet address or .sui name is required");
      return;
    }
    if (inputError) {
      setError(inputError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Generate a unique tag from name + timestamp
      const tag = `${name.trim().toUpperCase().replace(/\s+/g, "_")}_${Date.now().toString(36).toUpperCase()}`;
      const blobBytes = new TextEncoder().encode("mock_blob_123");
      const encBytes = new TextEncoder().encode("mock_enc_123");

      const tx = new Transaction();
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_AND_REGISTER_PROFILE,
        arguments: [
          tx.object(profileRegistryId.trim()),
          tx.pure.address(address),             // org ID = admin address for now
          tx.pure.address(finalAddress),
          tx.pure.string(tag),
          tx.pure.vector("u8", blobBytes),
          tx.pure.vector("u8", encBytes),
        ],
      });

      const res = await signAndExecuteTransaction({ transaction: tx });

      // Capture on-chain profile object ID (needed later for interactions)
      let onchainObjectId: string | undefined;
      try {
        const txResult = await suiClient.waitForTransaction({
          digest: res.digest,
          options: { showObjectChanges: true },
        });
        const created = txResult.objectChanges?.find(
          (c: any) => c.type === "created" && (c.objectType?.includes("Profile") || c.objectType?.includes("profile"))
        ) as any;
        onchainObjectId = created?.objectId;
      } catch { /* non-fatal */ }

      // Save contact to MongoDB for listing
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminAddress: address,
          orgName: user?.orgName ?? "",
          name: name.trim(),
          walletAddress: finalAddress,
          tag,
          twitter: twitter.trim() || undefined,
          email: email.trim() || undefined,
          company: company.trim() || undefined,
          onchainTxDigest: res.digest,
          onchainObjectId,
        }),
      });

      toast.success("Contact saved!", {
        description: `${name} added to your organization.`,
        action: {
          label: "View Tx",
          onClick: () => window.open(buildExplorerUrl(res.digest, "tx"), "_blank"),
        },
      });

      router.push("/contacts");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact-name">Full Name *</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alice Chen"
          required
          disabled={loading || !address}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-wallet">Wallet address or .sui name *</Label>
        <div className="relative">
          <Input
            id="contact-wallet"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x… or alice.sui"
            disabled={loading || !address}
            className={inputError ? "border-red-300 focus-visible:ring-red-200" : suiName ? "border-emerald-300 focus-visible:ring-emerald-100" : ""}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {resolving && <Loader2 className="size-4 text-slate-400 animate-spin" />}
            {!resolving && suiName && <CheckCircle2 className="size-4 text-emerald-500" />}
            {!resolving && inputError && <AlertCircle className="size-4 text-red-400" />}
          </div>
        </div>
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
        <Label htmlFor="contact-email">Email (optional)</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alice@example.com"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-company">Company (optional)</Label>
        <Input
          id="contact-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Acme Corp"
          disabled={loading}
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

      <Button type="submit" disabled={loading || !address || !name.trim()} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
        {loading ? (
          <><Loader2 className="size-4 mr-2 animate-spin" />Creating on-chain…</>
        ) : (
          "Create Contact"
        )}
      </Button>
    </form>
  );
}
