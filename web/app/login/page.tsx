"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ZkLoginService } from "@/lib/zklogin/zklogin";
import { SessionManager } from "@/lib/zklogin/session";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ShieldCheck, Zap, UserPlus } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "";

export default function LoginPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (account) router.push("/dashboard");
  }, [account, router]);

  useEffect(() => {
    if (SessionManager.getProof()) router.replace("/dashboard");
  }, [router]);

  const handleZkLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google Client ID is not configured.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const { nonce } = await ZkLoginService.initializeSession();
      // Store name if provided (new users). Returning users' names come from DB.
      const savedSession = SessionManager.getSession();
      if (savedSession && name.trim()) {
        SessionManager.saveSession({ ...savedSession, pendingUserName: name.trim() });
      }
      window.location.href = ZkLoginService.getOAuthUrl(nonce, GOOGLE_CLIENT_ID, REDIRECT_URI);
    } catch (err: any) {
      setError(err.message || "Failed to initialize ZK Login session.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* Brand */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-[#1a1a1a] shadow-2xl shadow-black/20 mx-auto">
            <ShieldCheck className="size-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a]">Tidal</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Encrypted, on-chain customer relations
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-slate-100 p-10 space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">Sign in</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Returning users just click Google below. New here? Add your name first.
            </p>
          </div>

          {/* Optional name field — only needed for first-time signup */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Your Name
              </label>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                New users only
              </span>
            </div>
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Leave blank if you've signed in before"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleZkLogin()}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>

          {/* Google ZK Login — always enabled */}
          <button
            onClick={handleZkLogin}
            disabled={isLoading || !GOOGLE_CLIENT_ID}
            className="w-full flex items-center justify-center gap-3 h-14 px-6 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-[#1a1a1a] rounded-2xl font-bold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <span className="size-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                <span>Connecting to Google…</span>
              </>
            ) : (
              <>
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {!GOOGLE_CLIENT_ID && (
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-medium">
              <strong>Setup required:</strong> Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your environment.
            </p>
          )}

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 font-medium">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-slate-50 space-y-3">
            {[
              { icon: ShieldCheck, label: "Self-custodial", desc: "Your keys, your wallet — no intermediary" },
              { icon: Zap, label: "Gas Sponsored", desc: "Transactions are paid for by the organization" },
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

        <p className="text-center text-[11px] text-slate-400">
          Powered by <span className="font-bold text-slate-600">Sui Network</span>
          {" "}· Self-custodial authentication
        </p>
      </div>
    </div>
  );
}
