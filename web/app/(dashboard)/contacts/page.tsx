"use client";

import Link from "next/link";
import { Plus, Users, GripVertical, MoreVertical, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mockContacts: { id: string; name: string; role: string; email: string }[] = [];

export default function ContactsPage() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Contact Relations</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Manage your network on-chain. Securely stored and encrypted interactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 rounded-xl font-bold border-slate-200">
            <Filter className="size-4 mr-2" />
            Filter
          </Button>
          <Button asChild className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">
            <Link href="/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden relative">
        <div className="absolute top-4 right-4 text-slate-200">
          <GripVertical className="size-5" />
        </div>
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-[#1a1a1a]">All Contacts</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Search name, wallet..."
                className="pl-9 h-9 bg-slate-50 border-transparent rounded-lg text-xs font-medium focus:bg-white transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          {mockContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 py-20 text-center bg-slate-50/50">
              <div className="size-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <Users className="size-8" />
              </div>
              <h3 className="font-bold text-[#1a1a1a]">No contacts found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[200px]">Start building your network by adding your first contact.</p>
              <Button asChild className="mt-6 bg-[#1a1a1a] hover:bg-slate-800 text-white rounded-xl font-bold h-11 px-8">
                <Link href="/contacts/new">Add contact</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Mapping mockContacts would go here */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
