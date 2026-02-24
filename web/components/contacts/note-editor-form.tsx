"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrgRole } from "@/lib/types/crm";

interface NoteEditorFormProps {
  profileId: string;
  accessLevelOptions: { value: OrgRole; label: string }[];
  onSuccess?: () => void;
}

export function NoteEditorForm({
  profileId,
  accessLevelOptions,
  onSuccess,
}: NoteEditorFormProps) {
  const [content, setContent] = useState("");
  const [accessLevel, setAccessLevel] = useState<OrgRole>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Flow: 1) Seal encrypt → 2) Walrus upload → 3) Sui create_encrypted_resource
      // Placeholder until Seal/Walrus SDK and org_id are wired
      console.log("Note save placeholder", { profileId, content, accessLevel });
      setContent("");
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Strategy: They want to invest $50K"
          rows={4}
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
            {accessLevelOptions.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading || !content.trim()}>
        {loading ? "Saving…" : "Save Note"}
      </Button>
    </form>
  );
}
