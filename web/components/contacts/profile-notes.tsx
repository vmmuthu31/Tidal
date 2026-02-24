"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { NoteEditorForm } from "@/components/contacts/note-editor-form";
import { ACCESS_LEVEL_OPTIONS } from "@/lib/types/crm";

interface ProfileNotesProps {
  profileId: string;
}

// Placeholder list; replace with API/onchain resources
const mockNotes: { id: string; accessLevel: number; createdAt: string }[] = [];

export function ProfileNotes({ profileId }: ProfileNotesProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Encrypted notes (Seal + Walrus). Access level controls who can
            decrypt.
          </CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add note</DialogTitle>
              <DialogDescription>
                Content is encrypted with Seal, stored on Walrus, and access
                recorded on Sui.
              </DialogDescription>
            </DialogHeader>
            <NoteEditorForm
              profileId={profileId}
              accessLevelOptions={ACCESS_LEVEL_OPTIONS}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {mockNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notes yet. Add a note to store encrypted content.
          </p>
        ) : (
          <ul className="space-y-2">
            {mockNotes.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span className="text-muted-foreground">
                  Access:{" "}
                  {ACCESS_LEVEL_OPTIONS.find((o) => o.value === n.accessLevel)
                    ?.label ?? n.accessLevel}
                </span>
                <span className="text-muted-foreground">{n.createdAt}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
