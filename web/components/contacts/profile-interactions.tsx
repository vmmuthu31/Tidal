"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Phone, Calendar, MoreHorizontal, Loader2, Send } from "lucide-react";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import { toast } from "sonner";
import CONTRACT_CONFIG from "@/lib/config/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ProfileInteractionsProps {
  profileId: string;         // MongoDB contact _id — for persistence
  onchainObjectId?: string;  // Sui profile object ID — for on-chain log
}

const interactionTypes = [
  { value: "message",  label: "Message",  icon: MessageSquare },
  { value: "call",     label: "Call",      icon: Phone },
  { value: "meeting",  label: "Meeting",   icon: Calendar },
  { value: "other",    label: "Other",     icon: MoreHorizontal },
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

export function ProfileInteractions({ profileId, onchainObjectId }: ProfileInteractionsProps) {
  const { address } = useUnifiedAccount();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();

  const [type, setType] = useState("message");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchInteractions = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/interactions`);
      const data = await res.json();
      setInteractions(Array.isArray(data) ? data : []);
    } catch { setInteractions([]); }
    finally { setLoadingList(false); }
  }, [profileId]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) { setError("Sign in with Google or connect a wallet first"); return; }
    if (!message.trim()) { setError("Message is required"); return; }

    setLoading(true);
    setError(null);
    let txDigest = "";

    try {
      // Only attempt on-chain log if we have a real Sui profile object ID
      if (onchainObjectId) {
        try {
          const tx = new Transaction();
          const action = `${type}: ${message.trim()}`;
          tx.moveCall({
            target: CONTRACT_CONFIG.FUNCTIONS.INTERACTION.LOG_INTERACTION,
            arguments: [
              tx.object(onchainObjectId),
              tx.pure.string(action),
              tx.pure.u64(Math.floor(Date.now() / 1000)),
            ],
          });
          const res = await signAndExecuteTransaction({ transaction: tx });
          txDigest = res.digest;
        } catch (chainErr: any) {
          // Log on-chain failure but still save to MongoDB
          console.warn("[Interactions] on-chain log failed:", chainErr.message);
          toast("On-chain log skipped", { description: "Saved to database only." });
        }
      }

      // Always persist to MongoDB
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: profileId,
          adminAddress: address,
          type,
          message: message.trim(),
          txDigest,
        }),
      });

      setMessage("");
      fetchInteractions();
      toast.success("Interaction logged", {
        description: txDigest ? "Recorded on-chain and saved." : "Saved to database.",
      });
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Failed to log interaction";
      setError(msg);
      toast.error("Could not log interaction", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const TypeIcon = interactionTypes.find((t) => t.value === type)?.icon ?? MessageSquare;

  return (
    <Card className="border-none shadow-xl shadow-slate-900/5 bg-white rounded-[32px] overflow-hidden">
      <div className="h-1.5 w-full flex">
        <div className="h-full flex-1 bg-slate-400 rounded-bl-full" />
        <div className="h-full flex-1 bg-slate-500" />
        <div className="h-full flex-1 bg-slate-600 rounded-br-full" />
      </div>
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
            <MessageSquare className="size-7 stroke-[1.5]" />
          </div>
          <div>
            <Badge className="bg-slate-100 text-slate-600 border-none px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-widest mb-1.5">
              {onchainObjectId ? "On-chain + DB" : "Database"}
            </Badge>
            <CardTitle className="text-2xl font-black text-[#1a1a1a] tracking-tight">Interactions</CardTitle>
            <CardDescription className="text-slate-500 font-medium mt-0.5">
              Log touchpoints. {onchainObjectId ? "Recorded on-chain and stored in DB." : "Stored in DB (contact not yet on-chain)."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-2 space-y-8">
        <form onSubmit={handleLog} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Type</Label>
              <Select value={type} onValueChange={setType} disabled={loading}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white h-11">
                  <span className="flex items-center gap-2">
                    <TypeIcon className="size-4 text-slate-500" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {interactionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2"><t.icon className="size-4" />{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interaction-message" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Message
              </Label>
              <Input
                id="interaction-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Sent DM about token launch"
                disabled={loading}
                className="rounded-xl border-slate-200 bg-white h-11"
              />
            </div>
          </div>
          {error && <Alert variant="destructive" className="rounded-xl"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button
            type="submit" disabled={loading || !address}
            className="h-12 px-6 rounded-xl font-bold bg-[#1a1a1a] hover:bg-black text-white gap-2"
          >
            {loading
              ? <><Loader2 className="size-5 animate-spin" />Logging…</>
              : <><Send className="size-4" />Log interaction</>
            }
          </Button>
        </form>

        {loadingList ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : interactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 py-14 text-center">
            <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-3">
              <Calendar className="size-7" />
            </div>
            <h3 className="font-bold text-[#1a1a1a]">No interactions yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-[260px]">Log a touchpoint above to start your timeline.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {interactions.map((i, idx) => {
              const meta = interactionTypes.find((t) => t.value === i.type);
              const Icon = meta?.icon ?? MoreHorizontal;
              return (
                <li key={i._id ?? idx} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 text-[10px] font-bold uppercase tracking-wider capitalize">
                        {i.type}
                      </Badge>
                      {i.txDigest && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">on-chain</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-[#1a1a1a]">{i.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(i.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
