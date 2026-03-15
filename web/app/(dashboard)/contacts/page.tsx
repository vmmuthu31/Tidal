"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Search, Building2, ExternalLink, Mail, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Members should see their admin's contacts
  const queryAddress = user?.role === "member" && user?.orgAdminAddress
    ? user.orgAdminAddress
    : user?.suiAddress;

  useEffect(() => {
    if (!queryAddress) return;
    setLoadingContacts(true);
    fetch(`/api/contacts?adminAddress=${queryAddress}`)
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [queryAddress]);

  const loading = userLoading || loadingContacts;

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.walletAddress.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">Contact Relations</h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Manage your network on-chain. Securely stored and encrypted interactions.
          </p>
        </div>
        <Button asChild className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100">
          <Link href="/contacts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold text-[#1a1a1a]">
              All Contacts {!loading && contacts.length > 0 && (
                <span className="text-sm font-normal text-slate-400 ml-2">({contacts.length})</span>
              )}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, wallet, email..."
                className="pl-9 h-9 bg-slate-50 border-transparent rounded-lg text-xs font-medium focus:bg-white transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="size-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin block" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 py-20 text-center bg-slate-50/50">
              <div className="size-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <Users className="size-8" />
              </div>
              <h3 className="font-bold text-[#1a1a1a]">
                {search ? "No contacts match your search" : "No contacts yet"}
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-[200px]">
                {search ? "Try a different search term." : "Start building your network by adding your first contact."}
              </p>
              {!search && (
                <Button asChild className="mt-6 bg-[#1a1a1a] hover:bg-slate-800 text-white rounded-xl font-bold h-11 px-8">
                  <Link href="/contacts/new">Add contact</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((contact) => (
                <Link
                  key={contact._id}
                  href={`/contacts/${contact._id}`}
                  className="group block bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:shadow-black/5 p-5 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                      <span className="text-sm font-black">{contact.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1a1a1a] truncate">{contact.name}</p>
                      {contact.company && (
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="size-3" />{contact.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      {contact.walletAddress.slice(0, 10)}…{contact.walletAddress.slice(-8)}
                    </p>
                    {contact.email && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                        <Mail className="size-3 shrink-0" />{contact.email}
                      </p>
                    )}
                    {contact.twitter && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Twitter className="size-3 shrink-0" />{contact.twitter}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </span>
                    {contact.onchainTxDigest && (
                      <ExternalLink className="size-3 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
