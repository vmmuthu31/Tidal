"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Users, UserPlus, Mail, Clock, CheckCircle2,
  Send, Settings, ShieldCheck, Crown, User, RefreshCw,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";


export default function OrganizationPage() {
  const { user, loading } = useUser();
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteeName, setInviteeName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [sending, setSending] = useState(false);

  const isAdmin = user?.role === "admin";
  const hasOrg = user?.hasOrg;

  const fetchInvites = () => {
    if (!user?.suiAddress || !isAdmin) return;
    setLoadingInvites(true);
    fetch(`/api/invites?adminAddress=${user.suiAddress}`)
      .then((r) => r.json())
      .then((data) => setInvites(data.invites ?? []))
      .catch(() => setInvites([]))
      .finally(() => setLoadingInvites(false));
  };

  useEffect(() => {
    if (user?.suiAddress && isAdmin && hasOrg) fetchInvites();
  }, [user?.suiAddress, isAdmin, hasOrg]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteeName.trim() || !inviteeEmail.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminAddress: user.suiAddress,
          adminName: user.name,
          orgName: user.orgName,
          inviteeName: inviteeName.trim(),
          inviteeEmail: inviteeEmail.trim(),
        }),
      });
      if (res.ok) {
        toast.success(`Invite sent to ${inviteeEmail}!`);
        setInviteeName(""); setInviteeEmail(""); setShowInviteForm(false);
        fetchInvites();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to send invite");
      }
    } catch {
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="size-10 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin block" />
      </div>
    );
  }

  // ── No Org → show create form (admin only) or info (member edge case) ───
  if (!hasOrg) {
    return (
      <div className="max-w-[1200px] mx-auto space-y-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Organization</h1>
          <p className="text-sm text-slate-500">Setup your workspace to collaborate with your team.</p>
        </div>
        {isAdmin ? (
          <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden max-w-2xl mx-auto">
            <CardHeader className="p-10 pb-4 text-center">
              <div className="size-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 mx-auto mb-6">
                <Building2 className="size-8" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#1a1a1a]">Create Organization</CardTitle>
              <CardDescription className="text-slate-500 text-base max-w-md mx-auto mt-2">
                Get started by creating your organization on-chain. You can then invite your team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-4">
              <CreateOrganizationForm onSuccess={() => window.location.reload()} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="size-12 text-slate-300 mb-4" />
            <h3 className="font-bold text-[#1a1a1a]">No organization yet</h3>
            <p className="text-sm text-slate-400 mt-1">Ask your admin to send you an invite link.</p>
          </div>
        )}
      </div>
    );
  }

  // ── Has Org ──────────────────────────────────────────────────────────────
  const members = invites.filter((i) => i.status === "accepted");
  const pending = invites.filter((i) => i.status === "pending");

  return (
    <div className="max-w-[1200px] mx-auto space-y-8">

      {/* Org header */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-black/5 p-8 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="size-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
          <Building2 className="size-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black tracking-tight text-[#1a1a1a] truncate">{user?.orgName}</h1>
            <Badge className={isAdmin
              ? "bg-indigo-50 text-indigo-600 border-none font-black text-[10px] uppercase tracking-wider"
              : "bg-purple-50 text-purple-600 border-none font-black text-[10px] uppercase tracking-wider"
            }>
              {isAdmin ? <><Crown className="size-3 mr-1" />Admin</> : <><User className="size-3 mr-1" />Member</>}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? `${members.length} active member${members.length !== 1 ? "s" : ""} · ${pending.length} pending invite${pending.length !== 1 ? "s" : ""}`
              : `Member of ${user?.orgName}`
            }
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3 shrink-0">
            <Button asChild variant="outline" className="h-11 px-5 rounded-xl border-slate-200 font-bold text-sm">
              <Link href="/organization/settings" className="flex items-center gap-2">
                <Settings className="size-4" /> Settings
              </Link>
            </Button>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2 h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all"
            >
              <UserPlus className="size-4" /> Invite Member
            </button>
          </div>
        )}
      </div>

      {/* Invite form (admin only) */}
      {showInviteForm && isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Mail className="size-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1a1a1a]">Send Invite</h2>
              <p className="text-xs text-slate-500">They'll receive an email with a one-click sign-in link.</p>
            </div>
          </div>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                <input
                  type="text" placeholder="e.g. Alice Chen" value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)} required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <input
                  type="email" placeholder="alice@company.com" value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)} required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit" disabled={sending || !inviteeName.trim() || !inviteeEmail.trim()}
                className="flex items-center gap-2 h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending
                  ? <><span className="size-4 rounded-full border-2 border-indigo-300 border-t-white animate-spin" />Sending…</>
                  : <><Send className="size-4" />Send Invite</>
                }
              </button>
              <button
                type="button" onClick={() => setShowInviteForm(false)}
                className="h-11 px-5 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member: show their membership info */}
      {!isAdmin && (
        <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-[#1a1a1a]">Your Membership</CardTitle>
                <CardDescription className="text-slate-400">You are an active member of this workspace.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Organization</p>
                <p className="text-sm font-black text-[#1a1a1a]">{user?.orgName}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Role</p>
                <p className="text-sm font-black text-purple-600">Member</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Address</p>
              <p className="text-[11px] font-mono text-slate-600 break-all">{user?.suiAddress}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: Active Members */}
      {isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 overflow-hidden">
          <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-50">
            <Users className="size-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-[#1a1a1a]">Active Members</h2>
            {members.length > 0 && (
              <span className="ml-auto text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100">
                {members.length} active
              </span>
            )}
            <button
              onClick={fetchInvites} disabled={loadingInvites}
              className="ml-2 p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`size-4 ${loadingInvites ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Admin row (always shown) */}
          <ul className="divide-y divide-slate-50">
            <li className="flex items-center gap-4 px-8 py-5">
              <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Crown className="size-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1a1a1a]">{user?.name} <span className="text-[10px] text-slate-400 font-normal ml-1">(you)</span></p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border text-indigo-600 bg-indigo-50 border-indigo-100">
                <Crown className="size-3" /> Admin
              </span>
            </li>

            {loadingInvites && members.length === 0 ? (
              <li className="flex items-center justify-center py-10">
                <span className="size-6 rounded-full border-3 border-slate-200 border-t-indigo-500 animate-spin block" />
              </li>
            ) : members.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-12 text-center px-8">
                <Users className="size-8 text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">No members yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Invite your team using the button above.</p>
              </li>
            ) : (
              members.map((invite) => (
                <li key={invite.token} className="flex items-center gap-4 px-8 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="size-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <User className="size-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1a1a1a]">{invite.inviteeName}</p>
                    <p className="text-xs text-slate-400">{invite.inviteeEmail}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border text-emerald-600 bg-emerald-50 border-emerald-100">
                    <CheckCircle2 className="size-3" /> Member
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Admin: Pending Invites */}
      {isAdmin && pending.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 overflow-hidden">
          <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-50">
            <Clock className="size-5 text-amber-500" />
            <h2 className="text-lg font-bold text-[#1a1a1a]">Pending Invites</h2>
            <span className="ml-auto text-[10px] font-black bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg border border-amber-100">
              {pending.length} pending
            </span>
          </div>
          <ul className="divide-y divide-slate-50">
            {pending.map((invite) => (
              <li key={invite.token} className="flex items-center gap-4 px-8 py-5 hover:bg-slate-50/50 transition-colors">
                <div className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Mail className="size-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a1a1a]">{invite.inviteeName}</p>
                  <p className="text-xs text-slate-400">{invite.inviteeEmail}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border text-amber-600 bg-amber-50 border-amber-200">
                    <Clock className="size-3" /> Pending
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sent {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
