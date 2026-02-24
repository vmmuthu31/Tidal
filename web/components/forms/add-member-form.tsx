"use client";

import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, type OrgRole } from "@/lib/types/crm";

export function AddMemberForm() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [registryId, setRegistryId] = useState<string>(CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY || "");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<OrgRole>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Connect your wallet first");
      return;
    }
    if (!registryId.trim()) {
      setError("Organization Registry ID is required");
      return;
    }
    if (!address.trim()) {
      setError("Wallet address is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.ADD_ORG_MEMBER,
        arguments: [
          tx.object(registryId.trim()),
          tx.pure.address(address.trim()),
          tx.pure.u8(role),
        ],
      });
      const res = await signAndExecuteTransaction({ transaction: tx });

      toast.success("Member Added Successfully", {
        description: `Wallet address has been granted role access.`,
        action: {
          label: "Explorer",
          onClick: () => window.open(buildExplorerUrl(res.digest, "tx"), "_blank"),
        },
      });

      setAddress("");
      setRole(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="registry-id">Organization Registry ID</Label>
        <Input
          id="registry-id"
          value={registryId}
          onChange={(e) => setRegistryId(e.target.value)}
          placeholder="0x..."
          disabled={loading || !account}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="member-address">Wallet address</Label>
        <Input
          id="member-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x…"
          disabled={loading || !account}
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={String(role)}
          onValueChange={(v) => setRole(Number(v) as OrgRole)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(ROLE_LABELS) as [string, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || !account}>
        {loading ? "Adding…" : "Add Member"}
      </Button>
    </form>
  );
}
