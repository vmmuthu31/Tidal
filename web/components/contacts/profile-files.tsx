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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACCESS_LEVEL_OPTIONS, type OrgRole } from "@/lib/types/crm";

interface ProfileFilesProps {
  profileId: string;
}

// Placeholder list
const mockFiles: { id: string; filename: string; accessLevel: number }[] = [];

export function ProfileFiles({ profileId }: ProfileFilesProps) {
  const [file, setFile] = useState<File | null>(null);
  const [accessLevel, setAccessLevel] = useState<OrgRole>(2);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      // Flow: read file → Seal encrypt → Walrus upload → create_encrypted_resource(resource_type: 2)
      console.log("Upload placeholder", {
        profileId,
        file: file.name,
        accessLevel,
      });
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Files</CardTitle>
        <CardDescription>
          Encrypted file attachments (Walrus). Set access level for decryption.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleUpload}
          className="space-y-4 rounded-lg border p-4"
        >
          <div className="space-y-2">
            <Label>Upload file</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Access level</Label>
            <Select
              value={String(accessLevel)}
              onValueChange={(v) => setAccessLevel(Number(v) as OrgRole)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_LEVEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading || !file}>
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </form>
        {mockFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files yet.</p>
        ) : (
          <ul className="space-y-2">
            {mockFiles.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <span>{f.filename}</span>
                <Button variant="ghost" size="sm">
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
