"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { useUnifiedAccount } from "@/hooks/useUnifiedAuth";
import { toast } from "sonner";
import {
  User,
  Mail,
  Wallet,
  Building2,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Save,
} from "lucide-react";

export default function ProfilePage() {
  const { user, loading } = useUser();
  const { address } = useUnifiedAccount();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-fill name input once user loads
  if (user && name === "") setName(user.name);

  const handleSave = async () => {
    if (!address || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiAddress: address, name: name.trim() }),
      });
      if (res.ok) {
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="size-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin block" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Profile</h1>
        <p className="text-sm text-slate-500">Your account details and on-chain identity.</p>
      </div>

      {/* Avatar + role badge */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 p-8 flex items-center gap-6">
        <div className={`size-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-lg ${
          user?.role === "admin"
            ? "bg-indigo-100 text-indigo-600 shadow-indigo-100"
            : "bg-purple-100 text-purple-600 shadow-purple-100"
        }`}>
          {user ? (user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)) : "?"}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-black text-[#1a1a1a]">{user?.name ?? "—"}</p>
          <p className="text-sm text-slate-500">{user?.email ?? "—"}</p>
          <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
            user?.role === "admin"
              ? "bg-indigo-50 text-indigo-600"
              : "bg-purple-50 text-purple-600"
          }`}>
            {user?.role === "admin" ? "Admin" : "Member"}
          </span>
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-black/5 p-8 space-y-6">
        <h2 className="text-lg font-black text-[#1a1a1a]">Account Details</h2>

        {/* Name */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <User className="size-3.5" /> Display Name
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || name === user?.name}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="size-4" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* Email (read-only from Google) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <Mail className="size-3.5" /> Email
          </label>
          <div className="flex items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-sm font-medium text-slate-600">{user?.email ?? "—"}</span>
            <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Google</span>
          </div>
        </div>

        {/* Sui address */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <Wallet className="size-3.5" /> Sui Address
          </label>
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="flex-1 text-[11px] font-mono text-slate-600 break-all select-all">
              {address ?? "—"}
            </span>
            <button onClick={handleCopy} className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0">
              {copied ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <Building2 className="size-3.5" /> Organization
          </label>
          <div className="flex items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-sm font-medium text-slate-600">
              {user?.orgName ?? (user?.role === "admin" ? "Not created yet" : "—")}
            </span>
            {user?.role === "admin" && (
              <span className="ml-auto text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">Admin</span>
            )}
            {user?.role === "member" && (
              <span className="ml-auto text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-md">Member</span>
            )}
          </div>
        </div>

        {/* Auth method */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
            <ShieldCheck className="size-3.5" /> Authentication
          </label>
          <div className="flex items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-sm font-medium text-slate-600">ZK Login via Google</span>
            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
