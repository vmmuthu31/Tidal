"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Search,
  ChevronRight,
  LayoutGrid,
  Share2,
  Plus,
  ArrowLeft,
  LogOut,
  Wallet,
  ShieldCheck,
  Copy,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionManager, type CachedProofData } from "@/lib/zklogin/session";
import { useSuiNSName } from "@/hooks/useSuiNS";
import { shortenAddress } from "@/lib/config/suins";
import { toast } from "sonner";
import {
  useCurrentAccount,
  useDisconnectWallet,
  ConnectModal,
} from "@mysten/dapp-kit";

/**
 * Header wallet area — supports two auth modes:
 *   • Wallet extension (dapp-kit): useCurrentAccount() is non-null
 *   • ZK Login:                   SessionManager.getProof() is non-null
 *
 * SuiNS reverse lookup works for wallet users who have set a default name.
 * For ZK login users it shows nothing unless they own the SuiNS NFT themselves.
 */
function WalletArea() {
  const router = useRouter();

  // Wallet extension (dapp-kit)
  const dappAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  // ZK login
  const [zkProof, setZkProof] = useState<CachedProofData | null>(null);
  useEffect(() => {
    setZkProof(SessionManager.getProof());
  }, []);

  const [copied, setCopied] = useState(false);

  // Wallet extension takes priority over ZK login
  const activeAddress = dappAccount?.address ?? zkProof?.address ?? null;
  const authMode = dappAccount ? "wallet" : zkProof ? "zk" : null;

  const { suiName } = useSuiNSName(activeAddress);

  // ── Not connected: show both connect options ─────────────────────────────
  if (!activeAddress) {
    return (
      <div className="flex items-center gap-2">
        <ConnectModal
          trigger={
            <button className="h-10 gap-2 flex items-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 shadow-sm transition-all active:scale-95">
              <Wallet className="size-3.5" />
              Wallet
            </button>
          }
        />
        <Button
          onClick={() => router.push("/login")}
          className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-5 shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          <ShieldCheck className="size-3.5" />
          ZK Login
        </Button>
      </div>
    );
  }

  // ── Connected: show dropdown chip ────────────────────────────────────────
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet";
  const shortAddress = shortenAddress(activeAddress, 4);
  const explorerUrl = `https://suiscan.xyz/${network}/account/${activeAddress}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    toast.success("Address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    if (authMode === "wallet") {
      disconnectWallet();
    } else {
      SessionManager.clearAll();
      setZkProof(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 h-10 pl-3 pr-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
          <Wallet className="size-3.5 text-indigo-500 shrink-0" />
          <div className="flex flex-col leading-tight text-left">
            {suiName ? (
              <>
                <span className="text-[11px] font-black text-indigo-600">{suiName}</span>
                <span className="text-[9px] font-mono text-indigo-400">{shortAddress}</span>
              </>
            ) : (
              <span className="text-[10px] font-black text-indigo-600 tracking-widest font-mono">
                {shortAddress}
              </span>
            )}
          </div>
          <ChevronDown className="size-3 text-indigo-400 ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2 shadow-2xl shadow-black/10 border border-slate-100">
        {/* Header: SuiNS name + auth badge + full address */}
        <div className="px-3 py-3 space-y-1.5">
          {suiName && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span className="text-sm font-black text-[#1a1a1a]">{suiName}</span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-bold ml-auto">SuiNS</span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
            <Wallet className="size-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] font-mono text-slate-600 break-all select-all flex-1">
              {activeAddress}
            </span>
          </div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[9px] text-slate-400 font-medium">
              Click the address above to select all, then copy.
            </p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${authMode === "wallet" ? "bg-blue-50 text-blue-500" : "bg-purple-50 text-purple-500"}`}>
              {authMode === "wallet" ? "Wallet" : "ZK Login"}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" />

        {/* Copy address */}
        <DropdownMenuItem
          onClick={handleCopy}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer"
        >
          {copied
            ? <CheckCircle2 className="size-4 text-emerald-500" />
            : <Copy className="size-4 text-slate-400" />
          }
          <span className="text-sm font-bold text-[#1a1a1a]">
            {copied ? "Copied!" : "Copy address"}
          </span>
        </DropdownMenuItem>

        {/* View on explorer */}
        <DropdownMenuItem asChild className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer">
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4 text-slate-400" />
            <span className="text-sm font-bold text-[#1a1a1a]">View on Sui Explorer</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* Disconnect / Sign out */}
        <DropdownMenuItem
          onClick={handleDisconnect}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="size-4" />
          <span className="text-sm font-bold">
            {authMode === "wallet" ? "Disconnect wallet" : "Sign out"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#fafbfc]">
        <AppSidebar />
        <SidebarInset className="bg-transparent">
          <header className="flex h-20 shrink-0 items-center justify-between px-8 bg-white/40 backdrop-blur-xl sticky top-0 z-20 border-b border-white/60 shadow-sm">
            <div className="flex items-center gap-6">
              <Button variant="outline" size="icon" className="size-10 text-slate-400 border-slate-100 rounded-xl hover:bg-white hover:text-slate-900 transition-all shadow-sm">
                <ArrowLeft className="size-5" />
              </Button>
              <nav className="hidden md:flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <span>CRM</span>
                <ChevronRight className="size-3.5 mx-3 opacity-30" />
                <span className="text-[#1a1a1a]">Workspace</span>
              </nav>
            </div>

            <div className="flex-1 max-w-xl mx-12">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  placeholder="Universal Search (⌘+K)"
                  className="w-full pl-11 h-11 bg-slate-100/50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all rounded-2xl text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-10 gap-2 text-[10px] font-black uppercase tracking-widest px-4 rounded-xl border-slate-100 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-all">
                <LayoutGrid className="size-3.5" />
                Manage
              </Button>
              <Button variant="outline" size="sm" className="h-10 gap-2 text-[10px] font-black uppercase tracking-widest px-4 rounded-xl border-slate-100 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-all">
                <Share2 className="size-3.5" />
                Share
              </Button>
              <div className="mx-2 h-6 w-[1px] bg-slate-100" />
              <Button size="sm" className="h-10 gap-2 bg-[#1a1a1a] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl px-6 shadow-xl shadow-black/10 transition-all active:scale-95">
                <Plus className="size-4" />
                Add Entry
              </Button>
              <div className="mx-1" />
              {/* Renders after hydration to avoid localStorage SSR mismatch */}
              {mounted && <WalletArea />}
            </div>
          </header>
          <div className="flex-1 overflow-auto p-10">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
