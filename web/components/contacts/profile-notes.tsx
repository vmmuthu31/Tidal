"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { useUnifiedAccount } from "@/hooks/useUnifiedAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NoteEditorForm } from "@/components/contacts/note-editor-form";
import { ACCESS_LEVEL_OPTIONS } from "@/lib/types/crm";
import CONTRACT_CONFIG from "@/lib/config/contracts";
import {
  crmDecryptionService,
  type ResourceMetadata,
} from "@/lib/services/decryptionService";

interface ProfileNotesProps {
  profileId: string;
}

type DecryptStep = "idle" | "session" | "sign" | "decrypt" | "done" | "error";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export function ProfileNotes({ profileId }: ProfileNotesProps) {
  const [openAdd, setOpenAdd] = useState(false);
  const [notes, setNotes] = useState<ResourceMetadata[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [decryptDialogOpen, setDecryptDialogOpen] = useState(false);
  const [decryptTarget, setDecryptTarget] = useState<ResourceMetadata | null>(null);
  const [decryptStep, setDecryptStep] = useState<DecryptStep>("idle");
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [devBlobId, setDevBlobId] = useState("");
  const [devEncId, setDevEncId] = useState("");
  const [devResId, setDevResId] = useState("");

  const { address: currentAddress } = useUnifiedAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const orgRegistryId = CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY;

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/notes`);
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Could not load notes", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const resetDecryptDialog = useCallback(() => {
    setDecryptStep("idle");
    setDecryptedContent(null);
    setDecryptError(null);
    setDecryptTarget(null);
  }, []);

  const runDecrypt = useCallback(
    async (resource: ResourceMetadata) => {
      if (!currentAddress) {
        toast.error("Sign in with Google or connect your wallet to decrypt.");
        return;
      }
      setDecryptTarget(resource);
      setDecryptDialogOpen(true);
      setDecryptStep("session");
      setDecryptError(null);
      setDecryptedContent(null);

      try {
        const sessionKey = await crmDecryptionService.createSessionKey(
          currentAddress
        );
        setDecryptStep("sign");

        const signatureResponse = await signPersonalMessage({
          message: sessionKey.getPersonalMessage(),
        });
        await sessionKey.setPersonalMessageSignature(signatureResponse.signature);

        setDecryptStep("decrypt");
        const result = await crmDecryptionService.downloadAndDecryptResources(
          [resource],
          orgRegistryId,
          sessionKey
        );

        if (result.success && result.decryptedFileUrls?.length) {
          const response = await fetch(result.decryptedFileUrls[0]);
          const text = await response.text();
          setDecryptedContent(text);
          setDecryptStep("done");
          toast.success("Note decrypted");
        } else {
          setDecryptError(result.error ?? "Decryption failed");
          setDecryptStep("error");
          toast.error("Decryption failed", { description: result.error });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setDecryptError(msg);
        setDecryptStep("error");
        toast.error("Decryption failed", { description: msg });
      }
    },
    [
      currentAddress,
      signPersonalMessage,
      orgRegistryId,
    ]
  );

  const handleCopy = useCallback(() => {
    if (!decryptedContent) return;
    navigator.clipboard.writeText(decryptedContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [decryptedContent]);

  const handleCloseDecryptDialog = useCallback(() => {
    setDecryptDialogOpen(false);
    setTimeout(resetDecryptDialog, 200);
  }, [resetDecryptDialog]);

  const runDevDecrypt = useCallback(async () => {
    if (!devBlobId.trim() || !devEncId.trim() || !devResId.trim()) {
      toast.error("Enter Blob ID, Encryption ID, and Resource Object ID");
      return;
    }
    const mockResource: ResourceMetadata = {
      resource_id: devResId.trim(),
      profile_id: profileId,
      org_id: orgRegistryId,
      resource_type: "note",
      blob_id: devBlobId.trim(),
      encryption_id: devEncId.trim(),
      access_level: 0,
      created_at: new Date().toISOString(),
      created_by: currentAddress ?? "",
      walrus_url: "",
      sui_explorer_url: "",
    };
    await runDecrypt(mockResource);
  }, [profileId, orgRegistryId, devBlobId, devEncId, devResId, currentAddress, runDecrypt]);

  return (
    <>
      <Card className="border-none shadow-xl shadow-indigo-900/5 bg-white rounded-[32px] overflow-hidden">
        <div className="h-1.5 w-full flex">
          <div className="h-full flex-1 bg-indigo-500 rounded-bl-full" />
          <div className="h-full flex-1 bg-purple-500" />
          <div className="h-full flex-1 bg-indigo-400 rounded-br-full" />
        </div>
        <CardHeader className="p-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <FileText className="size-7 stroke-[1.5]" />
              </div>
              <div>
                <Badge className="bg-indigo-50 text-indigo-600 border-none px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-widest mb-1.5">
                  Seal + Walrus
                </Badge>
                <CardTitle className="text-2xl font-black text-[#1a1a1a] tracking-tight">
                  Notes
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium mt-0.5">
                  Encrypted notes. Access level controls who can decrypt.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                <DialogTrigger asChild>
                  <Button className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 gap-2">
                    <Plus className="size-5" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg rounded-3xl border-0 shadow-2xl p-8">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-black text-[#1a1a1a]">
                      Add note
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Content is encrypted with Seal, stored on Walrus, and
                      access recorded on Sui.
                    </DialogDescription>
                  </DialogHeader>
                  <NoteEditorForm
                    profileId={profileId}
                    accessLevelOptions={ACCESS_LEVEL_OPTIONS}
                    onSuccess={() => {
                      setOpenAdd(false);
                      fetchNotes();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardAction>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          {loadingNotes ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-indigo-500" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
              <div className="size-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <Lock className="size-8" />
              </div>
              <h3 className="font-bold text-[#1a1a1a] text-lg">No notes yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-[260px]">
                Add a note to store encrypted content. Only users with the right
                access level can decrypt.
              </p>
              <Button
                className="mt-6 h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold"
                onClick={() => setOpenAdd(true)}
              >
                <Plus className="size-5 mr-2" />
                Add Note
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => {
                const accessLabel =
                  ACCESS_LEVEL_OPTIONS.find((o) => o.value === note.access_level)
                    ?.label ?? `Level ${note.access_level}`;
                return (
                  <li
                    key={note.resource_id}
                    className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="size-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-600 border-0 text-[10px] font-bold uppercase tracking-wider"
                        >
                          {accessLabel}
                        </Badge>
                        <p className="text-xs text-slate-400 mt-1 font-medium">
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-bold border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 gap-2 shrink-0"
                      onClick={() => runDecrypt(note)}
                      disabled={!currentAddress}
                    >
                      <ShieldCheck className="size-4" />
                      Decrypt & View
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Decrypt result / progress dialog */}
          <Dialog open={decryptDialogOpen} onOpenChange={handleCloseDecryptDialog}>
            <DialogContent
              className="sm:max-w-md rounded-3xl border-0 shadow-2xl p-8"
              onPointerDownOutside={(e) => {
                if (decryptStep === "decrypt" || decryptStep === "sign" || decryptStep === "session") e.preventDefault();
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-[#1a1a1a] flex items-center gap-2">
                  {decryptStep === "done" ? (
                    "Decrypted note"
                  ) : decryptStep === "error" ? (
                    "Decryption failed"
                  ) : (
                    <>
                      <Loader2 className="size-5 animate-spin shrink-0" />
                      {decryptStep === "session" && "Preparing session…"}
                      {decryptStep === "sign" && "Sign in your wallet to authorize."}
                      {decryptStep === "decrypt" && "Decrypting…"}
                    </>
                  )}
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  {decryptStep === "done" &&
                    "Content is shown below. Copy to clipboard if needed."}
                  {decryptStep === "error" && decryptError}
                </DialogDescription>
              </DialogHeader>
              {decryptStep === "done" && decryptedContent !== null && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-[#1a1a1a] whitespace-pre-wrap max-h-64 overflow-y-auto font-medium">
                    {decryptedContent}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold gap-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "Copied" : "Copy to clipboard"}
                  </Button>
                </div>
              )}
              {decryptStep === "error" && decryptError && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{decryptError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter className="sm:justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={handleCloseDecryptDialog}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Developer: manual IDs (collapsible) */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              onClick={() => setDevOpen((o) => !o)}
            >
              {devOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              Developer: decrypt with IDs
            </button>
            {devOpen && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <p className="text-xs text-slate-500">
                  Paste Blob ID, Encryption ID, and Resource Object ID from
                  console logs to test decryption.
                </p>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Blob ID
                    </Label>
                    <Input
                      placeholder="Blob ID"
                      value={devBlobId}
                      onChange={(e) => setDevBlobId(e.target.value)}
                      className="rounded-xl bg-white border-slate-200 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Encryption ID
                    </Label>
                    <Input
                      placeholder="Encryption ID"
                      value={devEncId}
                      onChange={(e) => setDevEncId(e.target.value)}
                      className="rounded-xl bg-white border-slate-200 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Resource Object ID
                    </Label>
                    <Input
                      placeholder="Resource Object ID"
                      value={devResId}
                      onChange={(e) => setDevResId(e.target.value)}
                      className="rounded-xl bg-white border-slate-200 font-mono text-sm"
                    />
                  </div>
                </div>
                {!currentAddress ? (
                  <Alert className="rounded-xl bg-amber-50 border-amber-200 text-amber-800">
                    <AlertDescription>
                      Sign in with Google or connect your wallet to test decryption.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl font-bold"
                    onClick={runDevDecrypt}
                  >
                    Decrypt with Wallet
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
