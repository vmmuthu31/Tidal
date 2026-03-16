"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Info,
  ShieldCheck,
  Zap,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Fuel,
  Copy,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function OrganizationSettingsPage() {
  const [sponsorEnabled, setSponsorEnabled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Check if the backend has ENOKI_SECRET_KEY configured
  useEffect(() => {
    fetch("/api/sponsor/status")
      .then((r) => r.json())
      .then((data) => {
        setSponsorEnabled(data.configured === true);
      })
      .catch(() => setSponsorEnabled(false))
      .finally(() => setChecking(false));
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Organization Settings</h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          Customize your organization identity and configure global security preferences for your shared encrypted workspace.
        </p>
      </div>

      <div className="grid gap-8 items-start">
        {/* Identity Card */}
        <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-[#1a1a1a]">Identity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-10">
            <div className="max-w-xl space-y-8">
              <div className="space-y-3">
                <Label htmlFor="org-name" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organization Name</Label>
                <div className="relative">
                  <Input
                    id="org-name"
                    placeholder="e.g. Acme Web3 Studio"
                    disabled
                    className="h-12 bg-slate-50 border-transparent rounded-xl focus:bg-white transition-all font-medium pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    <Info className="size-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold ml-1">Identity is verified on the SUI blockchain and remains immutable.</p>
              </div>

              <div className="pt-4 flex gap-4">
                <Button disabled className="h-12 px-8 rounded-xl font-bold bg-slate-100 text-slate-400 border-none">
                  Save Changes
                </Button>
                <Button variant="ghost" className="h-12 px-8 rounded-xl font-bold text-slate-400">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Gas Vault / Sponsored Transactions ─── */}
        <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fuel className="size-5 text-slate-500" />
                <div>
                  <CardTitle className="text-base font-semibold text-[#1a1a1a]">Gas Vault</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Sponsor gas fees for all team members via Enoki
                  </CardDescription>
                </div>
              </div>

              {/* Status badge */}
              {checking ? (
                <div className="h-7 w-20 bg-slate-100 rounded-full animate-pulse" />
              ) : sponsorEnabled ? (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 gap-1.5 px-3 py-1.5">
                  <CheckCircle2 className="size-3.5" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 border-slate-200 gap-1.5 px-3 py-1.5">
                  <XCircle className="size-3.5" />
                  Not Configured
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-8 pt-0 space-y-8">
            {/* How it works */}
            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500 shrink-0" />
                <p className="text-sm font-bold text-[#1a1a1a]">How it works</p>
              </div>
              <ol className="space-y-2">
                {[
                  "Manager funds the Enoki Gas Pool via the Enoki Developer Portal.",
                  "All team members can execute on-chain transactions with zero gas required.",
                  "The organization's gas budget covers every sponsored transaction.",
                  "Transactions are signed by each user's own zkLogin key — fully self-custodial.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-600">
                    <span className="size-5 rounded-full bg-amber-100 text-amber-600 font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Setup steps */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Setup Checklist</p>
              <div className="space-y-3">
                {[
                  {
                    done: true,
                    label: "ZK Login configured",
                    desc: "NEXT_PUBLIC_GOOGLE_CLIENT_ID is set",
                  },
                  {
                    done: sponsorEnabled ?? false,
                    label: "Enoki Secret Key added",
                    desc: "Set ENOKI_SECRET_KEY in your server environment",
                  },
                  {
                    done: sponsorEnabled ?? false,
                    label: "Gas pool funded",
                    desc: "Deposit SUI into your Enoki gas pool via the Enoki Portal",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    {item.done ? (
                      <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="size-5 rounded-full border-2 border-slate-200 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1a1a1a]">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Env var helper */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Required Environment Variable</p>
              <div className="group flex items-center justify-between bg-[#1a1a1a] rounded-2xl px-5 py-4">
                <code className="text-xs text-emerald-400 font-mono tracking-wide">
                  ENOKI_SECRET_KEY=your_enoki_secret_key_here
                </code>
                <button
                  onClick={() => handleCopy("ENOKI_SECRET_KEY=your_enoki_secret_key_here", "Env var")}
                  className="text-slate-500 hover:text-white transition-colors ml-4 shrink-0"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 ml-1">
                Never expose this key client-side. Add it only to your server / deployment environment.
              </p>
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <Button
                asChild
                className="h-12 px-6 bg-[#0f0f0f] hover:bg-black text-white rounded-2xl font-bold text-sm shadow-sm transition-all active:scale-[0.98] gap-2"
              >
                <a
                  href="https://portal.enoki.mystenlabs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Enoki Portal
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 px-6 rounded-2xl font-bold text-sm border-slate-100 text-slate-600 hover:bg-slate-50 transition-all gap-2"
              >
                <a
                  href="https://docs.enoki.mystenlabs.com/ts-sdk/sponsored-transactions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Docs
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security & Encryption */}
        <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden opacity-60">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-slate-500" />
              <CardTitle className="text-base font-semibold text-[#1a1a1a]">Security & Encryption</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1a1a1a]">Seal Integration</p>
                <p className="text-xs text-slate-500">Enable threshold encryption for team-shared notes.</p>
              </div>
              <div className="size-10 rounded-xl bg-slate-200" />
            </div>
            <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Coming Soon to Tidal</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
