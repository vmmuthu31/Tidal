"use client";

import Link from "next/link";
import { Plus, Users, GripVertical, UserPlus, ShieldCheck } from "lucide-react";
import { AddMemberForm } from "@/components/forms/add-member-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { type OrgMember } from "@/lib/types/crm";

// Placeholder data; replace with API/context
const mockMembers: OrgMember[] = [];

export default function TeamPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Team Access</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Invite members and assign roles. Manage who can view or manage encrypted data on-chain.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl border-none shadow-2xl overflow-hidden p-0">
            <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 w-full" />
            <div className="p-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#1a1a1a]">Add team member</DialogTitle>
                <DialogDescription className="text-slate-500 mt-2">
                  Enter wallet address and select role. You must be an admin to add members.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-8">
                <AddMemberForm />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative group">
        <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors">
          <GripVertical className="size-5" />
        </div>
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-indigo-500" />
            <CardTitle className="text-xl font-bold text-[#1a1a1a]">Current Members</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          {mockMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 py-20 text-center bg-slate-50/50">
              <Users className="size-12 text-slate-300 mb-4" />
              <h3 className="font-bold text-[#1a1a1a]">No members yet</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[200px]">Start building your organization by inviting your first team member.</p>
              <Button onClick={() => document.querySelector('[data-state="closed"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))} variant="outline" className="mt-6 rounded-xl font-bold border-slate-200 hover:bg-white transition-all text-[#1a1a1a]">
                Invite someone
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {mockMembers.map((m) => (
                <li
                  key={m.address}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-5 hover:bg-slate-50 transition-all group/item shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover/item:bg-indigo-50 group-hover/item:text-indigo-600 transition-colors">
                      <Users className="size-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-slate-600 truncate max-w-[200px]">{m.address}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Joined May 2024</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none px-4 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider">{m.roleLabel}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
