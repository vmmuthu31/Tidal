"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  Building2, Users, UserPlus, FileText, Activity, ArrowRight, ShieldCheck, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user } = useUser();
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.suiAddress) return;
    fetch(`/api/invites?adminAddress=${user.suiAddress}`)
      .then((r) => r.json())
      .then((data) => {
        const accepted = (data.invites ?? []).filter((i: any) => i.status === "accepted").length;
        setMemberCount(accepted);
      })
      .catch(() => setMemberCount(null));
  }, [user?.suiAddress]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Workspace Active</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f0f0f]">
          {user?.name ? `Welcome, ${user.name.split(" ")[0]}.` : "Dashboard"}
        </h1>
        <p className="text-sm text-slate-500">
          {user?.orgName ?? "Your encrypted workspace on Sui."}
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Organization",
            value: user?.orgName ?? "—",
            sub: user?.hasOrg ? "Active" : "Not set up",
            icon: Building2,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Your Role",
            value: user?.role === "admin" ? "Admin" : user?.role === "member" ? "Member" : "—",
            sub: "Access level",
            icon: ShieldCheck,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Team",
            value: memberCount !== null ? String(memberCount) : "—",
            sub: "Active members",
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Network",
            value: "Testnet",
            sub: "Sui blockchain",
            icon: Zap,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
          >
            <div className={`size-9 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
              <stat.icon className={`size-4 ${stat.color}`} />
            </div>
            <div className="text-xl font-bold text-[#0f0f0f] truncate">{stat.value}</div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</div>
            <div className="text-[11px] text-slate-400 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Two main cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization card */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Building2 className="size-5 text-indigo-600" />
            </div>
            <div>
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 bg-slate-100 text-slate-500 border-0">
                Organization
              </Badge>
              <h2 className="text-base font-bold text-[#0f0f0f] leading-none mt-0.5">
                {user?.orgName ?? "Not configured"}
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Manage your team&apos;s permissions, roles, and encrypted access keys from your organization workspace.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <div className="flex gap-6">
              <div>
                <div className="text-base font-bold text-[#0f0f0f]">{memberCount ?? "—"}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Members</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#0f0f0f]">{user?.role === "admin" ? "Admin" : "Member"}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Your Role</div>
              </div>
              <div>
                <div className="text-base font-bold text-[#0f0f0f]">{user?.hasOrg ? "Active" : "—"}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status</div>
              </div>
            </div>
          </div>
          <Button asChild className="w-full h-9 bg-[#0f0f0f] hover:bg-black text-white rounded-xl font-semibold text-sm">
            <Link href="/organization" className="flex items-center justify-center gap-2">
              Open Workspace <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Contacts card */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users className="size-5 text-emerald-600" />
            </div>
            <div>
              <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 bg-slate-100 text-slate-500 border-0">
                Contacts
              </Badge>
              <h2 className="text-base font-bold text-[#0f0f0f] leading-none mt-0.5">Relations</h2>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Manage on-chain contact profiles. Store encrypted notes, files, and interaction history with threshold encryption.
          </p>
          <div className="flex gap-3 pt-2 border-t border-slate-50">
            <Button asChild variant="outline" className="flex-1 h-9 rounded-xl border-slate-200 font-semibold text-sm text-[#0f0f0f]">
              <Link href="/contacts">View All</Link>
            </Button>
            <Button asChild className="flex-1 h-9 bg-[#0f0f0f] hover:bg-black text-white rounded-xl font-semibold text-sm">
              <Link href="/contacts/new" className="flex items-center justify-center gap-2">
                <UserPlus className="size-4" /> Add Contact
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-semibold text-[#0f0f0f] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Add Contact", href: "/contacts/new", icon: UserPlus },
            { label: "View Contacts", href: "/contacts", icon: Users },
            { label: "Organization", href: "/organization", icon: Building2 },
            { label: "Team Access", href: "/organization/team", icon: Activity },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <div className="size-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-[#0f0f0f] transition-colors">
                <action.icon className="size-4" />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 group-hover:text-[#0f0f0f] text-center transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Encryption info */}
      <div className="bg-[#0f0f0f] rounded-2xl p-6 flex items-center gap-4">
        <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="size-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">End-to-End Encrypted</p>
          <p className="text-[11px] text-white/50 mt-0.5">Notes and files are encrypted with Seal + Walrus before being stored on-chain. Only authorized members can decrypt.</p>
        </div>
        <FileText className="size-4 text-white/20 shrink-0" />
      </div>
    </div>
  );
}
