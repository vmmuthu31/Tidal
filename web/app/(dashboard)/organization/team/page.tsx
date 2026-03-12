"use client";

import { useState, useEffect } from "react";
import {
  UserPlus, Users, ShieldCheck, Mail, Clock, CheckCircle2,
  XCircle, Send, Building2,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

type InviteStatus = "pending" | "accepted" | "expired";

const statusConfig: Record<InviteStatus, { label: string; color: string; icon: any }> = {
  pending:  { label: "Pending",  color: "text-amber-600 bg-amber-50 border-amber-200",  icon: Clock },
  accepted: { label: "Accepted", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  expired:  { label: "Expired",  color: "text-slate-500 bg-slate-50 border-slate-200",  icon: XCircle },
};

export default function TeamPage() {
  const { user } = useUser();
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviteeName, setInviteeName] = useState("");
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchInvites = () => {
    if (!user?.suiAddress) return;
    setLoadingInvites(true);
    fetch(`/api/invites?adminAddress=${user.suiAddress}`)
      .then((r) => r.json())
      .then((data) => setInvites(data.invites ?? []))
      .catch(() => setInvites([]))
      .finally(() => setLoadingInvites(false));
  };

  useEffect(() => { fetchInvites(); }, [user?.suiAddress]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteeName.trim() || !inviteeEmail.trim()) return;
    if (!user.orgName) {
      toast.error("Create an organization first before inviting members.");
      return;
    }
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
        toast.success(`Invite sent to ${inviteeEmail}!`, {
          description: `${inviteeName} will receive an email with a sign-up link.`,
        });
        setInviteeName(""); setInviteeEmail(""); setShowForm(false);
        fetchInvites();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send invite");
      }
    } catch {
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Team Access</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Invite members by email. They will receive a link to sign in with Google and join your org.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all">
            <UserPlus className="size-4" /> Invite Member
          </button>
        )}
      </div>

      {isAdmin && !user?.orgName && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
          <Building2 className="size-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Create an organization first</p>
            <p className="text-xs text-amber-600">You need an org before you can invite team members.</p>
          </div>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Mail className="size-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#1a1a1a]">Send Invite</h2>
              <p className="text-xs text-slate-500">They will get an email with a one-click sign-in link.</p>
            </div>
          </div>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                <input type="text" placeholder="e.g. Alice Chen" value={inviteeName}
                  onChange={(e) => setInviteeName(e.target.value)} required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <input type="email" placeholder="alice@company.com" value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)} required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={sending || !inviteeName.trim() || !inviteeEmail.trim()}
                className="flex items-center gap-2 h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? <><span className="size-4 rounded-full border-2 border-indigo-300 border-t-white animate-spin" />Sending…</> : <><Send className="size-4" />Send Invite</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="h-11 px-5 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 overflow-hidden">
        <div className="flex items-center gap-3 px-8 py-6 border-b border-slate-50">
          <ShieldCheck className="size-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-[#1a1a1a]">Sent Invites</h2>
          {invites.length > 0 && (
            <span className="ml-auto text-[10px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              {invites.length} total
            </span>
          )}
        </div>
        {loadingInvites ? (
          <div className="flex items-center justify-center py-20">
            <span className="size-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin block" />
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <Users className="size-12 text-slate-300 mb-4" />
            <h3 className="font-bold text-[#1a1a1a]">No invites sent yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              {isAdmin ? "Invite your first team member using the button above." : "Your admin has not sent any invites yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {invites.map((invite) => {
              const cfg = statusConfig[invite.status as InviteStatus] ?? statusConfig.expired;
              const StatusIcon = cfg.icon;
              return (
                <li key={invite.token} className="flex items-center gap-4 px-8 py-5 hover:bg-slate-50/50 transition-colors">
                  <div className="size-10 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1a1a1a]">{invite.inviteeName}</p>
                    <p className="text-xs text-slate-400">{invite.inviteeEmail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${cfg.color}`}>
                      <StatusIcon className="size-3" />{cfg.label}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
