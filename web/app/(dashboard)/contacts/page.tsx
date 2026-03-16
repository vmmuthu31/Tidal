"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Search, Building2, Mail, Twitter, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";

interface Contact {
  _id: string;
  name: string;
  walletAddress: string;
  email?: string;
  company?: string;
  twitter?: string;
  tag: string;
  onchainTxDigest?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const { user, loading: userLoading } = useUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [search, setSearch] = useState("");

  const queryAddress = user?.role === "member" && user?.orgAdminAddress
    ? user.orgAdminAddress
    : user?.suiAddress;

  async function loadContacts(address: string): Promise<void> {
    setLoadingContacts(true);
    try {
      const response = await fetch(`/api/contacts?adminAddress=${address}`);
      const data = (await response.json()) as { contacts?: Contact[] };
      setContacts(data.contacts ?? []);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }

  useEffect(() => {
    if (!queryAddress) return;
    void loadContacts(queryAddress);
  }, [queryAddress]);

  const loading = userLoading || loadingContacts;

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.walletAddress.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#0f0f0f]">Contacts</h1>
          <p className="text-sm text-slate-500">
            {contacts.length > 0 ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}` : "Manage your on-chain contact network."}
          </p>
        </div>
        <Button asChild className="h-9 bg-[#0f0f0f] hover:bg-black text-white rounded-xl font-semibold text-sm shadow-sm">
          <Link href="/contacts/new" className="flex items-center gap-2">
            <Plus className="size-4" /> Add Contact
          </Link>
        </Button>
      </div>

      {/* Search + list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-8 h-8 bg-slate-50 border-transparent rounded-lg text-xs font-medium focus:bg-white transition-all"
            />
          </div>
          {!loading && contacts.length > 0 && (
            <span className="text-[11px] text-slate-400 font-medium ml-auto">
              {filtered.length} of {contacts.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="size-6 rounded-full border-2 border-slate-200 border-t-slate-600 animate-spin block" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <Users className="size-6" />
            </div>
            <p className="text-sm font-semibold text-[#0f0f0f]">
              {search ? "No contacts match your search" : "No contacts yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? "Try a different search term." : "Add your first contact to get started."}
            </p>
            {!search && (
              <Button asChild className="mt-5 h-9 bg-[#0f0f0f] hover:bg-black text-white rounded-xl font-semibold text-sm">
                <Link href="/contacts/new">Add contact</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((contact) => (
              <Link
                key={contact._id}
                href={`/contacts/${contact._id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group"
              >
                <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <span className="text-xs font-bold">{contact.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f0f0f] truncate">{contact.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {contact.company && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <Building2 className="size-3 shrink-0" />{contact.company}
                      </span>
                    )}
                    {contact.email && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="size-3 shrink-0" />{contact.email}
                      </span>
                    )}
                    {contact.twitter && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Twitter className="size-3 shrink-0" />{contact.twitter}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] font-mono text-slate-300">
                    {contact.walletAddress.slice(0, 8)}…{contact.walletAddress.slice(-6)}
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="size-4 text-slate-200 group-hover:text-slate-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
