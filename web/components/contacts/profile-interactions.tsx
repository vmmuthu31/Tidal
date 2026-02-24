"use client";

import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import CONTRACT_CONFIG from "@/lib/config/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileInteractionsProps {
  profileId: string;
}

const interactionTypes = [
  { value: "message", label: "Message" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

// Placeholder list; replace with API /api/profiles/:id/interactions
const mockInteractions: { type: string; message: string; createdAt: string }[] =
  [];

export function ProfileInteractions({ profileId }: ProfileInteractionsProps) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [type, setType] = useState("message");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Connect your wallet first");
      return;
    }
    if (!message.trim()) {
      setError("Message is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tx = new Transaction();
      const timestamp = Math.floor(Date.now() / 1000);
      const action = `${type}: ${message}`;
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.INTERACTION.LOG_INTERACTION,
        arguments: [
          tx.object(profileId),
          tx.pure.string(action),
          tx.pure.u64(timestamp),
        ],
      });
      await signAndExecuteTransaction({ transaction: tx });
      setMessage("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to log interaction",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactions</CardTitle>
        <CardDescription>
          Manual logs and onchain activity (unified timeline from indexer).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleLog} className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interactionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interaction-message">Message</Label>
            <Input
              id="interaction-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Sent DM about token launch"
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || !account}>
            {loading ? "Logging…" : "Log Interaction"}
          </Button>
        </form>
        {mockInteractions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No interactions yet. Onchain activity will appear here when indexer
            is wired.
          </p>
        ) : (
          <ul className="space-y-2">
            {mockInteractions.map((i, idx) => (
              <li key={idx} className="rounded-md border p-3 text-sm">
                <span className="font-medium capitalize">{i.type}</span>
                <p className="text-muted-foreground">{i.message}</p>
                <p className="text-xs text-muted-foreground">{i.createdAt}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
