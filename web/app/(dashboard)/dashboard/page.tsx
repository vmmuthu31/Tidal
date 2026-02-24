"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Plus,
  MoreVertical,
  TrendingUp,
  ShieldCheck,
  Zap,
  ChevronRight,
  GripVertical,
  Activity,
  ArrowUpRight,
  UserPlus,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type WidgetId = 'org' | 'contacts' | 'quickstart';

export default function DashboardPage() {
  const [order, setOrder] = useState<WidgetId[]>(['org', 'contacts', 'quickstart']);
  const [dragging, setDragging] = useState<WidgetId | null>(null);

  const handleDragStart = (id: WidgetId) => {
    setDragging(id);
  };

  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    if (dragging && dragging !== id) {
      const newOrder = [...order];
      const dragIdx = newOrder.indexOf(dragging);
      const dropIdx = newOrder.indexOf(id);
      newOrder.splice(dragIdx, 1);
      newOrder.splice(dropIdx, 0, dragging);
      setOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-24 px-4 sm:px-6 lg:px-8">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/60 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Status: Active</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-[#1a1a1a] leading-none">
            Welcome back.
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-xl">
            Your encrypted workspace is secure. Here's what's happening in your organization today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="h-14 px-8 bg-[#1a1a1a] hover:bg-black text-white rounded-2xl font-black shadow-2xl shadow-indigo-200/20 transition-all hover:scale-[1.02] active:scale-95">
            <Activity className="size-5 mr-2" />
            Live Activity
          </Button>
        </div>
      </div>

      {/* Stats Grid - Ultra Sleek */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Network", value: "128", sub: "Verified Contacts", icon: Users, color: "indigo", bg: "bg-indigo-50", text: "text-indigo-600", trend: "+12%" },
          { title: "Spaces", value: "12", sub: "Active Organizations", icon: Building2, color: "emerald", bg: "bg-emerald-50", text: "text-emerald-600", trend: "Stable" },
          { title: "Vault", value: "342", sub: "Encrypted Files", icon: ShieldCheck, color: "purple", bg: "bg-purple-50", text: "text-purple-600", trend: "+24" },
          { title: "Protocol", value: "Fast", sub: "SUI Network Speed", icon: Zap, color: "amber", bg: "bg-amber-50", text: "text-amber-600", trend: "1.2s" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-md p-7 rounded-[32px] border border-white shadow-lg shadow-black/5 hover:shadow-xl hover:translate-y-[-2px] transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between">
              <div className={`size-12 rounded-2xl ${stat.bg} ${stat.text} flex items-center justify-center shadow-sm`}>
                <stat.icon className="size-6" />
              </div>
              <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                {stat.trend}
              </div>
            </div>
            <div className="mt-6 space-y-1">
              <div className="text-4xl font-black text-[#1a1a1a] tracking-tight">{stat.value}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.title}</div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">{stat.sub}</span>
              <ArrowUpRight className="size-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {/* Draggable Layout Area */}
      <div className="grid gap-10 lg:grid-cols-2">
        {order.map((id) => {
          if (id === 'org') return (
            <div
              key="org"
              draggable
              onDragStart={() => handleDragStart('org')}
              onDragOver={(e) => handleDragOver(e, 'org')}
              onDragEnd={handleDragEnd}
              className={`transition-all duration-300 ${dragging === 'org' ? 'opacity-40 scale-95' : 'opacity-100'}`}
            >
              <Card className="border-none shadow-2xl shadow-indigo-900/5 bg-white rounded-[40px] overflow-hidden group relative h-full">
                {/* Sleek Top Accent Bar - Non Overlapping */}
                <div className="h-3 w-full flex">
                  <div className="h-full flex-1 bg-indigo-500 rounded-bl-full" />
                  <div className="h-full flex-1 bg-purple-500" />
                  <div className="h-full flex-1 bg-pink-500 rounded-br-full" />
                </div>

                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                        <Building2 className="size-8 stroke-[1.5]" />
                      </div>
                      <div>
                        <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest mb-1.5">Enterprise</Badge>
                        <CardTitle className="text-3xl font-black text-[#1a1a1a] tracking-tight leading-tight">Organization</CardTitle>
                      </div>
                    </div>
                    <div className="cursor-grab active:cursor-grabbing p-3 rounded-2xl hover:bg-slate-50 text-slate-300 hover:text-slate-500 transition-all">
                      <GripVertical className="size-7" />
                    </div>
                  </div>

                  <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
                    Centralized control for your team's onchain presence. Manage permissions, roles, and encrypted storage keys in one place.
                  </p>

                  <div className="grid gap-4 pt-4">
                    <Button asChild className="h-16 bg-[#1a1a1a] hover:bg-black text-white rounded-3xl font-black text-lg shadow-xl shadow-black/10 group-hover:translate-y-[-2px] transition-all">
                      <Link href="/organization" className="flex items-center justify-center gap-3">
                        Enter Workspace
                        <ArrowUpRight className="size-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </Link>
                    </Button>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex justify-between">
                    {[
                      { l: "Groups", v: "03" },
                      { l: "Engineers", v: "12" },
                      { l: "Admins", v: "04" }
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className="text-xl font-black text-[#1a1a1a]">{s.v}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          );

          if (id === 'contacts') return (
            <div
              key="contacts"
              draggable
              onDragStart={() => handleDragStart('contacts')}
              onDragOver={(e) => handleDragOver(e, 'contacts')}
              onDragEnd={handleDragEnd}
              className={`transition-all duration-300 ${dragging === 'contacts' ? 'opacity-40 scale-95' : 'opacity-100'}`}
            >
              <Card className="border-none shadow-2xl shadow-emerald-900/5 bg-white rounded-[40px] overflow-hidden group relative h-full">
                {/* Sleek Top Accent Bar */}
                <div className="h-3 w-full flex">
                  <div className="h-full flex-1 bg-emerald-400 rounded-bl-full" />
                  <div className="h-full flex-1 bg-teal-500" />
                  <div className="h-full flex-1 bg-indigo-500 rounded-br-full" />
                </div>

                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-16 rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
                        <Users className="size-8 stroke-[1.5]" />
                      </div>
                      <div>
                        <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest mb-1.5">Secure Hub</Badge>
                        <CardTitle className="text-3xl font-black text-[#1a1a1a] tracking-tight leading-tight">Relations</CardTitle>
                      </div>
                    </div>
                    <div className="cursor-grab active:cursor-grabbing p-3 rounded-2xl hover:bg-slate-50 text-slate-300 hover:text-slate-500 transition-all">
                      <GripVertical className="size-7" />
                    </div>
                  </div>

                  <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
                    Seamlessly connect with decentralized profiles. Monitor onchain activity and store private interactions with threshold protection.
                  </p>

                  <div className="flex gap-4 pt-4">
                    <Button asChild variant="outline" className="flex-1 h-16 border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-[#1a1a1a] rounded-3xl font-black text-lg transition-all">
                      <Link href="/contacts">All Profiles</Link>
                    </Button>
                    <Button asChild className="flex-1 h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:translate-y-[-2px] transition-all">
                      <Link href="/contacts/new" className="flex items-center justify-center gap-3">
                        <UserPlus className="size-5" />
                        Add New
                      </Link>
                    </Button>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex -space-x-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Avatar key={i} className="size-12 border-4 border-white shadow-lg transition-transform hover:translate-y-[-4px] hover:z-10 ring-1 ring-slate-100">
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${i + 30}`} />
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-[#1a1a1a]">+124</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Global Contacts</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          );

          if (id === 'quickstart') return (
            <div
              key="quickstart"
              className="lg:col-span-2"
              draggable
              onDragStart={() => handleDragStart('quickstart')}
              onDragOver={(e) => handleDragOver(e, 'quickstart')}
              onDragEnd={handleDragEnd}
            >
              <Card className="border-none shadow-2xl shadow-amber-900/5 bg-white rounded-[50px] overflow-hidden group relative">
                {/* Sleek Top Accent Bar */}
                <div className="h-3 w-full flex">
                  <div className="h-full flex-1 bg-amber-400 rounded-bl-full" />
                  <div className="h-full flex-1 bg-orange-500" />
                  <div className="h-full flex-1 bg-rose-500 rounded-br-full" />
                </div>

                <div className="p-12 space-y-12">
                  <div className="flex items-center justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                          <Zap className="size-8 text-amber-500 fill-amber-500" />
                        </div>
                        <h2 className="text-4xl font-black text-[#1a1a1a] tracking-tight">Quickstart Protocol</h2>
                      </div>
                      <p className="text-slate-500 text-xl font-medium max-w-3xl leading-relaxed">
                        Follow the automated CRM lifecycle to initialize your workspace and maximize team performance.
                      </p>
                    </div>
                    <div className="cursor-grab active:cursor-grabbing p-4 rounded-[24px] hover:bg-slate-50 text-slate-200 hover:text-slate-400 transition-all">
                      <GripVertical className="size-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: "Organization", icon: Building2 },
                      { label: "Invite Team", icon: UserPlus },
                      { label: "Add Contacts", icon: Users },
                      { label: "Secure Notes", icon: FileText },
                      { label: "Logs", icon: Activity },
                      { label: "Network", icon: TrendingUp }
                    ].map((step, i) => (
                      <div key={i} className="group/item relative flex flex-col items-center gap-4 p-6 bg-slate-50/50 rounded-[32px] border border-transparent hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer">
                        <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover/item:text-amber-500 group-hover/item:shadow-md transition-all">
                          <step.icon className="size-6" />
                        </div>
                        <span className="text-xs font-black text-slate-500 group-hover/item:text-[#1a1a1a] text-center uppercase tracking-wider">{step.label}</span>
                        {i < 5 && (
                          <div className="absolute top-1/2 -right-2 -translate-y-1/2 hidden lg:block opacity-20">
                            <ChevronRight className="size-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          );
          return null;
        })}
      </div>
    </div>
  );
}
