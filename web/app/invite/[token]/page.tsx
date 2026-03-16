"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ZkLoginService } from "@/lib/zklogin/zklogin";
import { SessionManager } from "@/lib/zklogin/session";
import { ShieldCheck, Building2, UserCheck, AlertCircle } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const REDIRECT_URI =
  typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";

interface InviteDetails {
  adminName: string;
  orgName: string;
  inviteeName: string;
  inviteeEmail: string;
}

export default function InvitePage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid" | "accepting">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If already logged in, go to dashboard
    if (SessionManager.getProof()) {
      router.replace("/dashboard");
      return;
    }

    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStatus("invalid");
        } else {
          setInvite(data.invite);
          setStatus("ready");
        }
      })
      .catch(() => {
        setErrorMsg("Could not load invite. Please try again.");
        setStatus("invalid");
      });
  }, [token, router]);

  const handleAccept = async () => {
    if (!GOOGLE_CLIENT_ID) return;
    setStatus("accepting");
    try {
      const { nonce } = await ZkLoginService.initializeSession();
      const savedSession = SessionManager.getSession();
      if (savedSession) {
        SessionManager.saveSession({
          ...savedSession,
          inviteToken: token,
          pendingUserName: invite?.inviteeName,
        });
      }
      window.location.href = ZkLoginService.getOAuthUrl(nonce, GOOGLE_CLIENT_ID, REDIRECT_URI);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start login.");
      setStatus("ready");
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center size-16 rounded-3xl bg-[#1a1a1a] shadow-2xl shadow-black/20 mx-auto">
            <ShieldCheck className="size-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Tidal</h1>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-slate-100 p-10 space-y-6">

          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <span className="size-10 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin block" />
              <p className="text-sm text-slate-500 font-medium">Loading your invitation…</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="size-16 rounded-3xl bg-red-50 flex items-center justify-center mx-auto">
                <AlertCircle className="size-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-[#1a1a1a]">Invite unavailable</h2>
              <p className="text-sm text-slate-500">{errorMsg}</p>
              <button
                onClick={() => router.replace("/login")}
                className="w-full h-12 bg-[#1a1a1a] hover:bg-black text-white rounded-2xl font-bold text-sm transition-all"
              >
                Go to Login
              </button>
            </div>
          )}

          {(status === "ready" || status === "accepting") && invite && (
            <>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">
                  You&apos;re invited!
                </h2>
                <p className="text-sm text-slate-500">
                  Accept to join your team on Tidal.
                </p>
              </div>

              {/* Invite details card */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Building2 className="size-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Organization</p>
                    <p className="text-sm font-black text-indigo-900">{invite.orgName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <UserCheck className="size-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Invited by</p>
                    <p className="text-sm font-black text-indigo-900">{invite.adminName}</p>
                  </div>
                </div>
              </div>

              {/* Hi, name */}
              <p className="text-sm text-slate-600 leading-relaxed">
                Hi <strong>{invite.inviteeName}</strong>, sign in with your Google account to create
                your on-chain identity and join the team. No password required.
              </p>

              {/* Accept button */}
              <button
                onClick={handleAccept}
                disabled={status === "accepting" || !GOOGLE_CLIENT_ID}
                className="w-full flex items-center justify-center gap-3 h-14 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {status === "accepting" ? (
                  <>
                    <span className="size-5 rounded-full border-2 border-indigo-300 border-t-white animate-spin" />
                    Connecting to Google…
                  </>
                ) : (
                  <>
                    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Accept & Sign in with Google
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-slate-400">
                This invite expires in 7 days · Your data is self-custodial
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
