"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Plus, GripVertical, Settings, Users, ChevronRight } from "lucide-react";
import { CreateOrganizationForm } from "@/components/forms/create-organization-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const hasOrg = false;

export default function OrganizationPage() {
  const [showCreateForm, setShowCreateForm] = useState(!hasOrg);

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Organization Management</h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          Setup and manage your workspace. Control access, permissions, and team members.
        </p>
      </div>

      {hasOrg ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative group">
            <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-400 cursor-grab active:cursor-grabbing">
              <GripVertical className="size-5" />
            </div>
            <CardHeader className="p-8 pb-4">
              <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4 transition-transform group-hover:scale-110">
                <Building2 className="size-6" />
              </div>
              <CardTitle className="text-xl font-bold text-[#1a1a1a]">Your Organization</CardTitle>
              <CardDescription className="text-slate-400">Manage your core organization settings and details.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 flex flex-col gap-4">
              <Button asChild className="h-12 bg-[#1a1a1a] hover:bg-slate-800 text-white rounded-xl font-bold border-none transition-all">
                <Link href="/organization/settings" className="flex items-center justify-center gap-2">
                  <Settings className="size-4" />
                  General Settings
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative group">
            <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-400 cursor-grab active:cursor-grabbing">
              <GripVertical className="size-5" />
            </div>
            <CardHeader className="p-8 pb-4">
              <div className="size-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 mb-4 transition-transform group-hover:scale-110">
                <Users className="size-6" />
              </div>
              <CardTitle className="text-xl font-bold text-[#1a1a1a]">Team Access</CardTitle>
              <CardDescription className="text-slate-400">Invite and manage roles for your team members.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 flex flex-col gap-4">
              <Button asChild variant="outline" className="h-12 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-[#1a1a1a]">
                <Link href="/organization/team" className="flex items-center justify-center gap-2">
                  <Plus className="size-4" />
                  Invite Members
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative max-w-2xl mx-auto py-4">
          <div className="absolute top-4 right-4 text-slate-200 group-hover:text-slate-400 cursor-grab active:cursor-grabbing">
            <GripVertical className="size-5" />
          </div>
          <CardHeader className="p-10 pb-4 text-center">
            <div className="size-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 mx-auto mb-6 transition-transform group-hover:scale-110">
              <Building2 className="size-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#1a1a1a]">Create Organization</CardTitle>
            <CardDescription className="text-slate-500 text-base max-w-md mx-auto mt-2">
              Get started by creating your organization profile. This will allow you to collaborate with your team securely using your SUI wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-4">
            {showCreateForm ? (
              <CreateOrganizationForm onSuccess={() => setShowCreateForm(false)} />
            ) : (
              <Button onClick={() => setShowCreateForm(true)} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all">
                Get Started
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
