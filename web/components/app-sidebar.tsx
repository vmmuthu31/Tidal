"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  UserPlus,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Menu,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const mainItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    badge: "Live",
  },
  { title: "Contacts", href: "/contacts", icon: Users },
  { title: "Organization", href: "/organization", icon: Building2 },
];

const orgItems = [
  { title: "Team Access", href: "/organization/team", icon: UserPlus },
  { title: "Security", href: "/organization/settings", icon: ShieldCheck },
];

const footerItems = [
  { title: "Documentation", href: "/docs", icon: Zap, external: true },
  { title: "Upgrade Plan", href: "/upgrade", icon: Sparkles },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-slate-100 bg-white/80 backdrop-blur-xl">
      <SidebarHeader className="p-6 pb-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="size-11 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-black/20 group-hover:scale-105 transition-transform duration-500">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-tight text-[#1a1a1a] leading-none mb-1">
              SUI CRM
            </span>
            <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
              <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
              On-chain Secure
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-4 gap-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu className="gap-2">
            {mainItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className={`h-12 px-4 rounded-xl transition-all duration-300 ${
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10 hover:bg-[#1a1a1a] hover:text-white"
                      : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Link
                    href={item.href}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={`size-5 ${pathname === item.href ? "stroke-[2.5px]" : "stroke-[1.5px]"}`}
                      />
                      <span className="font-bold text-sm">{item.title}</span>
                    </div>
                    {item.badge && pathname !== item.href && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black px-1.5 py-0.5 uppercase tracking-tighter ring-1 ring-emerald-500/20">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">
            Workspace
          </SidebarGroupLabel>
          <SidebarMenu className="gap-2">
            {orgItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className={`h-12 px-4 rounded-xl transition-all duration-300 ${
                    pathname === item.href
                      ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10 hover:bg-[#1a1a1a] hover:text-white"
                      : "hover:bg-slate-50 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Link
                    href={item.href}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={`size-5 ${pathname === item.href ? "stroke-[2.5px]" : "stroke-[1.5px]"}`}
                      />
                      <span className="font-bold text-sm">{item.title}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 mt-auto">
        <SidebarMenu className="mb-6 gap-2">
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                className="h-11 px-4 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all font-bold text-xs"
              >
                <Link
                  href={item.href}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-4 stroke-[1.5px]" />
                    <span>{item.title}</span>
                  </div>
                  {item.external && (
                    <ExternalLink className="size-3 text-slate-300" />
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator className="mb-6 opacity-30" />

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group/user">
          <Avatar className="size-10 border-2 border-white ring-1 ring-slate-100 shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="font-black text-xs">KB</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[11px] font-black text-[#1a1a1a] truncate">
              Kaushik
            </span>
            <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">
              Developer
            </span>
          </div>
          <ChevronRight className="size-4 text-slate-300 group-hover/user:text-indigo-500 transition-colors" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
