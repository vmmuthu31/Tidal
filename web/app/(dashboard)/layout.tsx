"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@mysten/dapp-kit";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  ChevronRight,
  Folder,
  LayoutGrid,
  Share2,
  Plus,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
              {mounted && (
                <>
                  <div className="mx-2 h-6 w-[1px] bg-slate-100" />
                  <ConnectButton className="!h-10 !text-[10px] !font-black !uppercase !tracking-widest !rounded-xl !bg-indigo-50 !border-indigo-100 !text-indigo-600 hover:!bg-indigo-100 transition-all shadow-sm" />
                </>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-auto p-10">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

