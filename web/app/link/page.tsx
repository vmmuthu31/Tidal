"use client";

import { useState } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link, Wallet } from "lucide-react";

export default function LinkIdentityPage() {
  const account = useCurrentAccount();
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("discord");
  const [code, setCode] = useState("");

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account?.address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (!code.trim()) {
      toast.error("Please enter your unique connection code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          platform,
          walletAddress: account.address,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Identity linked successfully!");
        setCode("");
      } else {
        toast.error(data.error || "Failed to link identity.");
      }
    } catch (e) {
      toast.error(
        "An unexpected error occurred: " +
          ((e as Error).message || "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Link size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Link Identity
          </h1>
          <p className="text-muted-foreground text-sm">
            Merge your off-chain Discord or Telegram interactions with your Sui
            Web3 identity.
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Wallet Connection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                1
              </span>
              Connect Wallet
            </div>
            <div className="bg-muted/50 p-4 rounded-lg flex flex-col items-center justify-center gap-3 border border-border/50">
              {account ? (
                <div className="flex flex-col items-center text-center gap-1">
                  <Wallet className="text-green-500 mb-1" size={24} />
                  <span className="text-sm font-medium">Wallet Connected</span>
                  <span className="text-xs text-muted-foreground break-all">
                    {account.address}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center mb-1">
                    Connect your Sui wallet to establish your identity.
                  </p>
                  <ConnectButton />
                </>
              )}
            </div>
          </div>

          {/* Step 2: Link Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">
                2
              </span>
              Enter Bot Code
            </div>

            <form onSubmit={handleLink} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!account || loading}
                >
                  <option value="discord">Discord</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Verification Code
                </label>
                <Input
                  type="text"
                  placeholder="Paste your unique code here..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!account || loading}
                  className="bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  Get this code by tying{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">/link</code> in
                  our bot.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full py-6 text-base font-medium transition-all"
                disabled={!account || !code.trim() || loading}
              >
                {loading ? "Linking Identity..." : "Link Identity ->"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
