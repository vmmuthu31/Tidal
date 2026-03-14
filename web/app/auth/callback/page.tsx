"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ZkLoginService } from "@/lib/zklogin/zklogin";
import { SessionManager } from "@/lib/zklogin/session";
import { jwtDecode } from "jwt-decode";
import { type DecodedJWT } from "@/lib/zklogin/zklogin";
import { ShieldCheck } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [statusText, setStatusText] = useState("Generating zero-knowledge proof…");
  const [errorMsg, setErrorMsg] = useState("");
  const processingRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || processingRef.current) return;
    processingRef.current = true;

    const urlParams = new URLSearchParams(hash.substring(1));
    const jwtToken = urlParams.get("id_token");

    if (!jwtToken) {
      setStatus("error");
      setErrorMsg("No JWT token found in the redirect URL. Please try logging in again.");
      return;
    }

    const finalize = async () => {
      try {
        // 1. Retrieve ephemeral session
        const session = SessionManager.getSession();
        if (!session) {
          throw new Error("No active zkLogin session found. Please start the login process again.");
        }

        // 2. Determine user salt
        const decodedJWT = jwtDecode<DecodedJWT>(jwtToken);
        let salt = session.userSalt;
        if (!salt) {
          const encoder = new TextEncoder();
          const encoded = encoder.encode(decodedJWT.sub);
          const hashVal = Array.from(encoded).reduce(
            (acc, val) => (acc << 5) - acc + val,
            0
          );
          salt = Math.abs(hashVal).toString();
        }

        // 3. Generate ZK proof via Enoki
        const ephemeralKeyPair = ZkLoginService.recreateKeyPair(session.ephemeralPrivateKey);
        const zkProof = await ZkLoginService.fetchZkProof({
          jwtToken,
          ephemeralKeyPair,
          randomness: session.randomness,
          maxEpoch: parseInt(session.maxEpoch),
          userSalt: salt,
        });

        // 4. Compute Sui address — use Enoki's addressSeed if present
        const address = ZkLoginService.getZkLoginAddress(
          jwtToken,
          salt,
          zkProof.addressSeed // Enoki's addressSeed (proof is cryptographically tied to it)
        );

        // 5. Persist proof
        console.log("[ZkCallback] proof source: Enoki ZKP", { hasAddressSeed: !!zkProof.addressSeed });
        console.log("[ZkCallback] derived address:", address);
        SessionManager.saveProof({
          zkProof,
          jwtToken,
          address,
          userSalt: salt,
          maxEpoch: parseInt(session.maxEpoch),
          randomness: session.randomness,
          ephemeralPrivateKey: session.ephemeralPrivateKey,
        });

        // 6. Save user to MongoDB (non-fatal — ZK proof is already saved)
        setStatusText("Saving your profile…");
        const userName = session.pendingUserName || decodedJWT.name || "User";
        const userEmail = decodedJWT.email || "";
        const inviteToken = session.inviteToken;

        let isNewUser = true;
        let hasOrg = false;
        let role: "admin" | "member" = "admin";
        let orgAdminAddress: string | undefined;

        // --- Employee invite path ---
        if (inviteToken) {
          try {
            // Validate invite and get org details
            const inviteRes = await fetch(`/api/invites/${inviteToken}`);
            if (inviteRes.ok) {
              const { invite } = await inviteRes.json();
              role = "member";
              orgAdminAddress = invite.adminAddress;

              // Create member user
              const userRes = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  suiAddress: address,
                  googleSub: decodedJWT.sub,
                  name: userName,
                  email: userEmail,
                  role: "member",
                  orgAdminAddress: invite.adminAddress,
                }),
              });
              if (userRes.ok) {
                const data = await userRes.json();
                isNewUser = data.isNewUser ?? true;
                // Stamp org membership onto member record
                await fetch("/api/users", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    suiAddress: address,
                    hasOrg: true,
                    orgName: invite.orgName,
                  }),
                });
              }

              // Mark invite as accepted
              await fetch(`/api/invites/${inviteToken}`, { method: "PATCH" });
            }
          } catch {
            console.warn("Could not process invite; continuing as member.");
          }
        } else {
          // --- Admin / direct signup path ---
          try {
            const res = await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                suiAddress: address,
                googleSub: decodedJWT.sub,
                name: userName,
                email: userEmail,
                role: "admin",
              }),
            });
            if (res.ok) {
              const data = await res.json();
              isNewUser = data.isNewUser ?? true;
              hasOrg = data.user?.hasOrg ?? false;
            }
          } catch {
            console.warn("Could not save user to DB; continuing with onboarding.");
          }
        }

        // 7. Clean up ephemeral session
        SessionManager.clearSession();
        window.history.replaceState(null, "", window.location.pathname + window.location.search);

        setStatus("success");

        // Members go straight to dashboard (no org creation needed)
        // New admins go to onboarding; returning admins with org go to dashboard
        let destination = "/dashboard";
        if (role === "admin" && (isNewUser || !hasOrg)) {
          destination = "/onboarding";
        }
        setTimeout(() => router.replace(destination), 1200);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Failed to finalize zkLogin. Please try again.");
      }
    };

    finalize();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-slate-100 p-12 max-w-md w-full text-center space-y-6">

        {status === "processing" && (
          <>
            <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-indigo-50 mx-auto">
              <span className="size-10 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin block" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">Setting up your account</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{statusText}</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4">
              <ShieldCheck className="size-5 text-indigo-500 shrink-0" />
              <p className="text-xs text-slate-500 text-left font-medium">
                Your credentials are never stored. Only a cryptographic proof is saved locally.
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-emerald-50 mx-auto">
              <svg className="size-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">You're in!</h2>
              <p className="text-sm text-slate-500">Account ready. Taking you to your workspace…</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-red-50 mx-auto">
              <svg className="size-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">Login Failed</h2>
              <p className="text-sm text-red-500 leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={() => router.replace("/login")}
              className="w-full h-12 bg-[#1a1a1a] hover:bg-black text-white rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
