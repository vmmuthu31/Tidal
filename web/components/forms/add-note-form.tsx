"use client";

import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import CONTRACT_CONFIG, { buildExplorerUrl } from "@/lib/config/contracts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddNoteForm() {
    const { address } = useUnifiedAccount();
    const { execute: signAndExecuteTransaction } = useUnifiedTransaction();

    // Reference Fields
    const [profileId, setProfileId] = useState("");
    const [orgId, setOrgId] = useState("");

    // Note Content
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address) {
            setError("Connect your wallet or sign in with ZK Login first");
            return;
        }
        if (!profileId.trim() || !orgId.trim()) {
            setError("Profile ID and Organization ID are required to attach this note.");
            return;
        }
        if (!noteContent.trim()) {
            setError("Note content cannot be empty.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // -------------------------------------------------------------
            // Phase 3 placeholder: SEAL ENCRYPTION & WALRUS STORAGE
            // In production, `noteContent` will be encrypted by the Seal SDK
            // and uploaded to Walrus. Walrus would return a `blobId`. 
            // -------------------------------------------------------------
            const tx = new Transaction();

            const mockedWalrusBlobId = new TextEncoder().encode("mock_note_blob_123");
            const mockedSealEncryptionId = new TextEncoder().encode("mock_note_enc_123");

            tx.moveCall({
                target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_ENCRYPTED_RESOURCE,
                arguments: [
                    tx.pure.address(profileId.trim()),       // profile_id
                    tx.pure.address(orgId.trim()),           // org_id
                    tx.pure.u8(CONTRACT_CONFIG.RESOURCE_TYPES.NOTE), // resource_type = 1
                    tx.pure.vector('u8', mockedWalrusBlobId),        // walrus_blob_id
                    tx.pure.vector('u8', mockedSealEncryptionId),    // encryption_id
                    tx.pure.u8(CONTRACT_CONFIG.ROLES.VIEWER),        // access_level needed to read
                    tx.pure.u64(Date.now()),                         // created_at
                ],
            });

            const res = await signAndExecuteTransaction({ transaction: tx });

            toast.success("Secure Note Added!", {
                description: `Note encrypted and anchored to the CRM.`,
                action: {
                    label: "View Tx",
                    onClick: () => window.open(buildExplorerUrl(res.digest, "tx"), "_blank"),
                },
            });

            // Reset the form details
            setNoteTitle("");
            setNoteContent("");
            setProfileId("");
            setOrgId("");

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create note");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="org-id">Organization ID</Label>
                <Input
                    id="org-id"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="0x…"
                    disabled={loading || !address}
                />
                <p className="text-xs text-muted-foreground">The Org this note belongs to.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="profile-id">Contact Profile ID</Label>
                <Input
                    id="profile-id"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    placeholder="0x…"
                    disabled={loading || !address}
                />
                <p className="text-xs text-muted-foreground">The specific Profile to attach this note to.</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                    <Label htmlFor="note-title">Note Title (Optional)</Label>
                    <Input
                        id="note-title"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="e.g. Q3 Sales Call Review"
                        disabled={loading || !address}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="note-content">Private Note Content</Label>
                    <Textarea
                        id="note-content"
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Write your private, encrypted note here..."
                        className="min-h-[120px]"
                        disabled={loading || !address}
                    />
                    <p className="text-xs text-muted-foreground">
                        This content will be encrypted by Seal before uploading to Walrus.
                    </p>
                </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !address} className="w-full">
                {loading ? "Encrypting & Saving…" : "Save Secure Note"}
            </Button>
        </form>
    );
}
