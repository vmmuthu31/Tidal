"use client";

import { Settings, Building2, GripVertical, Info, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function OrganizationSettingsPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Organization Settings</h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          Customize your organization identity and configure global security preferences for your shared encrypted workspace.
        </p>
      </div>

      <div className="grid gap-8 items-start">
        <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative group">
          <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors">
            <GripVertical className="size-5" />
          </div>
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Building2 className="size-5" />
              </div>
              <CardTitle className="text-xl font-bold text-[#1a1a1a]">Identity</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-10">
            <div className="max-w-xl space-y-8">
              <div className="space-y-3">
                <Label htmlFor="org-name" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organization Name</Label>
                <div className="relative">
                  <Input
                    id="org-name"
                    placeholder="e.g. Acme Web3 Studio"
                    disabled
                    className="h-12 bg-slate-50 border-transparent rounded-xl focus:bg-white transition-all font-medium pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    <Info className="size-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold ml-1">Identity is verified on the SUI blockchain and remains immutable.</p>
              </div>

              <div className="pt-4 flex gap-4">
                <Button disabled className="h-12 px-8 rounded-xl font-bold bg-slate-100 text-slate-400 border-none">
                  Save Changes
                </Button>
                <Button variant="ghost" className="h-12 px-8 rounded-xl font-bold text-slate-400">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative group opacity-60">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-2">
              <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle className="text-xl font-bold text-[#1a1a1a]">Security & Encryption</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1a1a1a]">Seal Integration</p>
                <p className="text-xs text-slate-500">Enable threshold encryption for team-shared notes.</p>
              </div>
              <div className="size-10 rounded-xl bg-slate-200" />
            </div>
            <p className="mt-4 text-[10px] font-bold text-indigo-500 uppercase tracking-widest text-center">Coming Soon to SUI CRM</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
