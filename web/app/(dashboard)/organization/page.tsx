"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Users, UserPlus, Mail, Clock, CheckCircle2,
  Send, Settings, ShieldCheck, Crown, User, RefreshCw,
  UserMinus, Loader2, AlertTriangle,
} from "lucide-react";
import { Transaction } from "@mysten/sui/transactions";
import { useUser } from "@/hooks/useUser";
import { useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import CONTRACT_CONFIG from "@/lib/config/contracts";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer (read-only)", onchainRole: 1 },
  { value: "member", label: "Manager (read + write)", onchainRole: 2 },
  { value: "manager", label: "Manager (read + write)", onchainRole: 2 },
  { value: "admin", label: "Admin (full control)", onchainRole: 3 },
] as const;

function roleToOnchain(role: string): number {
  return ROLE_OPTIONS.find((r) => r.value === role)?.onchainRole ?? 2;
}

function roleLabel(role: string): string {
  if (role === "viewer") return "Viewer";
  if (role === "admin") return "Admin";
  return "Manager";
}

export default function OrganizationPage() {
  const { user, loading } = useUser();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteeName, setInviteeName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [sending, setSending] = useState(false);
  const [registeringMember, setRegisteringMember] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

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
          role: inviteRole,
        }),
      });
      if (res.ok) {
        toast.success(`Invite sent to ${inviteeEmail}`);
        setInviteeName(""); setInviteeEmail(""); setInviteRole("member"); setShowInviteForm(false);
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

  const handleRegisterOnChain = async (invite: any) => {
    if (!user?.orgRegistryId || !invite.memberAddress) {
      toast.error("Missing org registry or member address");
      return;
    }
    setRegisteringMember(invite.token);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.ADD_ORG_MEMBER,
        arguments: [
          tx.object(user.orgRegistryId),
          tx.pure.address(invite.memberAddress),
          tx.pure.u8(roleToOnchain(invite.role || "member")),
        ],
      });
      await signAndExecuteTransaction({ transaction: tx });
      await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiAddress: invite.memberAddress, onchainRegistered: true }),
      });
      toast.success(`${invite.inviteeName} registered on-chain`);
      fetchInvites();
    } catch (err) {
      toast.error("On-chain registration failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRegisteringMember(null);
    }
  };

  const handleRemoveMember = async (invite: any) => {
    if (!user?.orgRegistryId || !invite.memberAddress) {
      toast.error("Missing org registry or member address");
      return;
    }
    setRemovingMember(invite.token);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.REMOVE_ORG_MEMBER,
        arguments: [
          tx.object(user.orgRegistryId),
          tx.pure.address(invite.memberAddress),
        ],
      });
      await signAndExecuteTransaction({ transaction: tx });
      await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suiAddress: invite.memberAddress,
          hasOrg: false,
          orgAdminAddress: "",
          orgRegistryId: "",
          onchainRegistered: false,
        }),
      });
      await fetch(`/api/invites/${invite.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "removed" }),
      });
      toast.success(`${invite.inviteeName} removed from organization`);
      fetchInvites();
    } catch (err) {
      toast.error("Failed to remove member", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setRemovingMember(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="size-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin block" />
      </div>
    );
  }

  if (!hasOrg) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-16">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#0f0f0f]">Organization</h1>
          <p className="text-sm text-slate-500">Set up your workspace to collaborate with your team.</p>
        </div>
        {isAdmin ? (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Building2 className="size-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0f0f0f]">Create Organization</h2>
                <p className="text-xs text-slate-500">Deploy your org on-chain and invite your team.</p>
              </div>
            </div>
            <CreateOrganizationForm onSuccess={() => window.location.reload()} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-2xl">
            <Building2 className="size-10 text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-[#0f0f0f]">No organization yet</p>
            <p className="text-xs text-slate-400 mt-1">Ask your admin to send you an invite link.</p>
          </div>
        )}
      </div>
    );
  }

  const members = invites.filter((i) => i.status === "accepted");
  const pending = invites.filter((i) => i.status === "pending");
  const needsRegistration = (invite: any) => invite.memberAddress && !invite.onchainRegistered;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">

      {/* Org header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0f0f0f]">{user?.orgName}</h1>
            <Badge className={isAdmin
              ? "bg-indigo-50 text-indigo-600 border-0 text-[10px] font-semibold uppercase tracking-wider"
              : "bg-purple-50 text-purple-600 border-0 text-[10px] font-semibold uppercase tracking-wider"
            }>
              {isAdmin ? "Admin" : "Member"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? `${members.length} active member${members.length !== 1 ? "s" : ""}${pending.length > 0 ? ` · ${pending.length} pending` : ""}`
              : `Member of ${user?.orgName}`
            }
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="outline" className="h-9 px-4 rounded-xl border-slate-200 font-semibold text-sm">
              <Link href="/organization/settings" className="flex items-center gap-2">
                <Settings className="size-4" /> Settings
              </Link>
            </Button>
            <Button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="h-9 px-4 bg-[#0f0f0f] hover:bg-black text-white rounded-xl font-semibold text-sm flex items-center gap-2"
            >
              <UserPlus className="size-4" /> Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Invite form */}
      {showInviteForm && isAdmin && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Mail className="size-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0f0f0f]">Send Invite</h2>
              <p className="text-xs text-slate-500">They&apos;ll receive an email with a sign-in link.</p>
            </div>
          </div>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text" placeholder="Alice Chen" value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)} required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0f0f0f] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  type="email" placeholder="alice@company.com" value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)} required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0f0f0f] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition-all"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit" disabled={sending || !inviteeName.trim() || !inviteeEmail.trim()}
                className="flex items-center gap-2 h-9 px-5 bg-[#0f0f0f] hover:bg-black text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending
                  ? <><span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending</>
                  : <><Send className="size-3.5" />Send Invite</>
                }
              </button>
              <button
                type="button" onClick={() => setShowInviteForm(false)}
                className="h-9 px-4 text-slate-400 hover:text-slate-700 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member view */}
      {!isAdmin && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="size-4 text-purple-500" />
            <h2 className="text-sm font-bold text-[#0f0f0f]">Your Membership</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Organization</p>
              <p className="text-sm font-bold text-[#0f0f0f]">{user?.orgName}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Role</p>
              <p className="text-sm font-bold text-purple-600">Member</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Address</p>
            <p className="text-[11px] font-mono text-slate-600 break-all">{user?.suiAddress}</p>
          </div>
        </div>
      )}

      {/* Active Members table */}
      {isAdmin && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-50">
            <h2 className="text-sm font-bold text-[#0f0f0f]">Members</h2>
            {members.length > 0 && (
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                {members.length}
              </span>
            )}
            <button
              onClick={fetchInvites} disabled={loadingInvites}
              className="ml-auto p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`size-3.5 ${loadingInvites ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {/* Admin row */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Crown className="size-3.5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0f0f0f]">{user?.name} <span className="text-[11px] text-slate-400 font-normal">(you)</span></p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px] font-semibold uppercase tracking-wider">Admin</Badge>
            </div>

            {loadingInvites && members.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <span className="size-5 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin block" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-8">
                <Users className="size-6 text-slate-200 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No members yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Invite your team using the button above.</p>
              </div>
            ) : (
              members.map((invite) => {
                const isRegistering = registeringMember === invite.token;
                const isRemoving = removingMember === invite.token;
                const unregistered = needsRegistration(invite);

                return (
                  <div key={invite.token} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${unregistered ? "bg-amber-50" : "bg-emerald-50"}`}>
                      {unregistered
                        ? <AlertTriangle className="size-3.5 text-amber-500" />
                        : <User className="size-3.5 text-emerald-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0f0f0f]">{invite.inviteeName}</p>
                      <p className="text-xs text-slate-400">{invite.inviteeEmail}</p>
                      {invite.memberAddress && (
                        <p className="text-[10px] font-mono text-slate-300 mt-0.5 truncate">
                          {invite.memberAddress.slice(0, 10)}…{invite.memberAddress.slice(-6)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {unregistered ? (
                        <button
                          onClick={() => handleRegisterOnChain(invite)}
                          disabled={isRegistering || !user?.orgRegistryId}
                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40"
                        >
                          {isRegistering ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
                          {isRegistering ? "Registering" : "Register"}
                        </button>
                      ) : (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> {roleLabel(invite.role || "member")}
                        </Badge>
                      )}
                      <button
                        onClick={() => handleRemoveMember(invite)}
                        disabled={isRemoving || !invite.memberAddress}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                        title="Remove member"
                      >
                        {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <UserMinus className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {isAdmin && pending.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-50">
            <h2 className="text-sm font-bold text-[#0f0f0f]">Pending Invites</h2>
            <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md">{pending.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {pending.map((invite) => (
              <div key={invite.token} className="flex items-center gap-4 px-6 py-4">
                <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Mail className="size-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f0f0f]">{invite.inviteeName}</p>
                  <p className="text-xs text-slate-400">{invite.inviteeEmail}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className="bg-amber-50 text-amber-600 border-amber-100 border text-[10px] font-semibold flex items-center gap-1">
                    <Clock className="size-3" /> Pending
                  </Badge>
                  <p className="text-[10px] text-slate-300 mt-1">
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
