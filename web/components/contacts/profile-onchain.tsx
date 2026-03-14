"use client";

import { Activity, Database } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProfileOnchainProps {
  profileId: string;
  contact?: { onchainObjectId?: string; onchainTxDigest?: string; walletAddress?: string } | null;
}

export function ProfileOnchain({ profileId, contact }: ProfileOnchainProps) {
  return (
    <Card className="border-none shadow-xl shadow-amber-900/5 bg-white rounded-[32px] overflow-hidden">
      <div className="h-1.5 w-full flex">
        <div className="h-full flex-1 bg-amber-400 rounded-bl-full" />
        <div className="h-full flex-1 bg-orange-500" />
        <div className="h-full flex-1 bg-amber-500 rounded-br-full" />
      </div>
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
            <Activity className="size-7 stroke-[1.5]" />
          </div>
          <div>
            <Badge className="bg-amber-50 text-amber-600 border-none px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-widest mb-1.5">
              Indexer
            </Badge>
            <CardTitle className="text-2xl font-black text-[#1a1a1a] tracking-tight">
              Onchain activity
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium mt-0.5">
              Token holdings, NFTs, DeFi positions from indexer API.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-2">
        <div className="space-y-4">
          {contact?.onchainObjectId && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Profile Object (Sui)</p>
              <a href={`https://suiscan.xyz/testnet/object/${contact.onchainObjectId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium font-mono">
                {contact.onchainObjectId}
                <Activity className="size-3" />
              </a>
            </div>
          )}
          {contact?.onchainTxDigest && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Creation Transaction</p>
              <a href={`https://suiscan.xyz/testnet/tx/${contact.onchainTxDigest}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium font-mono">
                {contact.onchainTxDigest}
                <Activity className="size-3" />
              </a>
            </div>
          )}
          {contact?.walletAddress && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact Wallet</p>
              <a href={`https://suiscan.xyz/testnet/account/${contact.walletAddress}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium font-mono">
                {contact.walletAddress}
                <Activity className="size-3" />
              </a>
            </div>
          )}
          {!contact?.onchainObjectId && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 py-16 text-center">
              <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <Database className="size-7" />
              </div>
              <h3 className="font-bold text-[#1a1a1a]">No on-chain data yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-[280px]">
                On-chain profile object ID not captured. Create this contact again to get explorer links.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
