"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileOverview } from "@/components/contacts/profile-overview";
import { ProfileNotes } from "@/components/contacts/profile-notes";
import { ProfileFiles } from "@/components/contacts/profile-files";
import { ProfileInteractions } from "@/components/contacts/profile-interactions";
import { ProfileOnchain } from "@/components/contacts/profile-onchain";

export default function ContactProfilePage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to contacts</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact profile</h1>
          <p className="font-mono text-sm text-muted-foreground">{id}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="onchain">Onchain</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <ProfileOverview profileId={id} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <ProfileNotes profileId={id} />
        </TabsContent>
        <TabsContent value="files" className="mt-4">
          <ProfileFiles profileId={id} />
        </TabsContent>
        <TabsContent value="interactions" className="mt-4">
          <ProfileInteractions profileId={id} />
        </TabsContent>
        <TabsContent value="onchain" className="mt-4">
          <ProfileOnchain profileId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
