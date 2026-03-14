"use client";

import { useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateOrganizationFormProps {
  onSuccess?: () => void;
}

export function CreateOrganizationForm({
  onSuccess,
}: CreateOrganizationFormProps) {
  const { address } = useUnifiedAccount();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();
  const suiClient = useSuiClient();
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      setError("Please connect your wallet or sign in with ZK Login first");
      return;
    }
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_ORG_AND_REGISTRY,
        arguments: [tx.pure.string(orgName)],
      });
      const res = await signAndExecuteTransaction({ transaction: tx });

      // Capture the OrgAccessRegistry object ID so it can be used for Seal encryption
      let orgRegistryId = "";
      try {
        const txResult = await suiClient.waitForTransaction({
          digest: res.digest,
          options: { showObjectChanges: true },
        });
        const created = txResult.objectChanges?.find(
          (c: any) => c.type === "created" && c.objectType?.includes("OrgAccessRegistry")
        ) as any;
        orgRegistryId = created?.objectId ?? "";
        if (orgRegistryId && address) {
          await fetch("/api/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ suiAddress: address, hasOrg: true, orgName, orgRegistryId }),
          });
        }
      } catch { /* non-fatal — org was still created */ }

      toast.success("Organization Created!", {
        description: "Your organization and registry were successfully generated.",
        action: {
          label: "View on Explorer",
          onClick: () => window.open(buildExplorerUrl(res.digest, "tx"), "_blank"),
        },
      });

      setOrgName("");
      onSuccess?.();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="e.g. Acme Web3 Studio"
          disabled={loading || !address}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={loading || !address || !orgName.trim()}
      >
        {loading ? "Creating…" : "Create Organization"}
      </Button>
    </form>
  );
}
