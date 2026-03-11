"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SessionManager } from "@/lib/zklogin/session";

export default function Home() {
  const router = useRouter();
  const walletAccount = useCurrentAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const zkProof = SessionManager.getProof();
    const isAuthenticated = !!walletAccount || !!zkProof;

    if (isAuthenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [mounted, walletAccount, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafbfc]">
      <span className="size-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin block" />
    </div>
  );
}
