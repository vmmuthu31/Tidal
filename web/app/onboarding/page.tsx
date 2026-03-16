"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import { SessionManager } from "@/lib/zklogin/session";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import {
  Building2,
  Copy,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  Wallet,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

const MIST_PER_SUI = 1_000_000_000;
const FAUCET_URL = "https://faucet.sui.io/?network=testnet";

function formatSui(mist: string) {
  return (Number(mist) / MIST_PER_SUI).toFixed(4);
}

export default function OnboardingPage() {
  const router = useRouter();
  const { address } = useUnifiedAccount();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();

  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  // Resolve the active address — ZK proof is sync, wallet is async
  const proof = typeof window !== "undefined" ? SessionManager.getProof() : null;
  const activeAddress = address || proof?.address || null;

  // Fetch SUI balance
  const { data: balanceData, refetch: refetchBalance, isLoading: balanceLoading } =
    useSuiClientQuery(
      "getBalance",
      { owner: activeAddress! },
      { enabled: !!activeAddress, refetchInterval: false }
    );

  const suiBalance = balanceData ? Number(balanceData.totalBalance) / MIST_PER_SUI : 0;
  const hasFunds = suiBalance > 0.005; // need at least ~0.005 SUI for gas

  useEffect(() => {
    if (!proof && !address) {
      router.replace("/login");
      return;
    }
    const addr = proof?.address || address;
    if (addr) {
      fetch(`/api/users?address=${addr}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.user?.name) setUserName(data.user.name);
          if (data.user?.hasOrg) router.replace("/dashboard");
        })
        .catch(() => {});
    }
  }, [address, proof, router]);

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Organization name is required.");
      return;
    }
    if (!activeAddress) {
      setError("No wallet address found. Please log in again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_ORG_AND_REGISTRY,
        arguments: [tx.pure.string(orgName)],
      });
      const res = await signAndExecuteTransaction({ transaction: tx });

      await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiAddress: activeAddress, hasOrg: true, orgName }),
      });

      toast.success("Organization created!", {
        description: `"${orgName}" is now live on-chain.`,
        action: {
          label: "View on Explorer",
          onClick: () => window.open(buildExplorerUrl(res.digest, "tx"), "_blank"),
        },
      });
      router.replace("/dashboard");
    } catch (err: any) {
      const msg: string = err.message || "Failed to create organization.";
      console.error("[CreateOrg] error:", msg, err);
      setError(msg);
      // Only auto-redirect on confirmed epoch expiry
      if (msg.includes("ZK Login session expired")) {
        setTimeout(() => router.replace("/login"), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center justify-center size-8 rounded-full text-xs font-black transition-all ${
                step === s
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : step > s
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-400"
              }`}>
                {step > s ? <CheckCircle2 className="size-4" /> : s}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${
                step === s ? "text-indigo-600" : step > s ? "text-emerald-500" : "text-slate-400"
              }`}>
                {s === 1 ? "Fund Wallet" : "Create Org"}
              </span>
              {s < 2 && <div className="w-8 h-px bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Your wallet address + faucet ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-indigo-600 shadow-2xl shadow-indigo-200 mx-auto">
                <Wallet className="size-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#1a1a1a]">
                {userName ? `Welcome, ${userName}!` : "Welcome!"}
              </h1>
              <p className="text-sm text-slate-500">
                Your Sui wallet has been created. Fund it with testnet SUI before setting up your org.
              </p>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-slate-100 p-8 space-y-6">

              {/* Address box */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Your Sui Address</p>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[11px] font-mono text-slate-700 break-all leading-relaxed select-all">
                    {activeAddress ?? "Loading…"}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {copied
                      ? <><CheckCircle2 className="size-3.5 text-emerald-500" /> Copied!</>
                      : <><Copy className="size-3.5" /> Copy address</>
                    }
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This is your ZK-derived wallet address. It&apos;s unique to your Google account and lives on-chain.
                </p>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</p>
                  {balanceLoading ? (
                    <p className="text-sm font-black text-slate-400 animate-pulse">Checking…</p>
                  ) : (
                    <p className={`text-lg font-black tabular-nums ${hasFunds ? "text-emerald-600" : "text-slate-700"}`}>
                      {formatSui(balanceData?.totalBalance ?? "0")} <span className="text-sm font-bold text-slate-400">SUI</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => refetchBalance()}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-white border border-slate-200 rounded-xl px-3 py-2"
                >
                  <RefreshCw className="size-3" />
                  Refresh
                </button>
              </div>

              {/* Faucet CTA */}
              {!hasFunds && (
                <a
                  href={FAUCET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 h-13 px-6 py-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-2xl font-bold text-sm transition-all"
                >
                  <ExternalLink className="size-4" />
                  Get free testnet SUI from faucet
                </a>
              )}

              {/* Continue */}
              <button
                onClick={() => setStep(2)}
                disabled={!activeAddress}
                className={`w-full flex items-center justify-center gap-3 h-14 px-6 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 ${
                  hasFunds
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {hasFunds ? (
                  <>Wallet funded — Create Organization <ArrowRight className="size-4 ml-auto" /></>
                ) : (
                  <>Continue anyway — fund later <ArrowRight className="size-4 ml-auto" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Create org ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-indigo-600 shadow-2xl shadow-indigo-200 mx-auto">
                <Building2 className="size-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Create your organization</h1>
              <p className="text-sm text-slate-500">
                Your org is deployed on-chain. You&apos;ll need ~0.01 SUI for gas.
              </p>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-slate-100 p-8 space-y-6">

              {/* Balance reminder if low */}
              {!hasFunds && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <span className="text-amber-600 text-lg">⚠️</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700">Low balance ({formatSui(balanceData?.totalBalance ?? "0")} SUI)</p>
                    <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] text-amber-600 underline font-medium">
                      Get free testnet SUI first →
                    </a>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Web3 Studio"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all disabled:opacity-50"
                  />
                </div>

                {error && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !orgName.trim()}
                  className="w-full flex items-center justify-center gap-3 h-14 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <span className="size-5 rounded-full border-2 border-indigo-300 border-t-white animate-spin" />
                      Creating on-chain…
                    </>
                  ) : (
                    <>
                      <Building2 className="size-4" />
                      Create Organization
                      <ArrowRight className="size-4 ml-auto" />
                    </>
                  )}
                </button>
              </form>

              {/* Features */}
              <div className="pt-2 border-t border-slate-50 space-y-3">
                {[
                  { icon: ShieldCheck, label: "On-chain identity", desc: "Deployed as a smart contract object on Sui" },
                  { icon: Users, label: "Team access control", desc: "Invite members with role-based permissions" },
                  { icon: Zap, label: "Gas sponsored", desc: "Member transactions covered by your org vault" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="size-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1a1a1a]">{label}</p>
                      <p className="text-[11px] text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => router.replace("/dashboard")}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors underline underline-offset-2"
              >
                Skip — create org later
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
