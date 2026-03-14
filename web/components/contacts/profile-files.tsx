"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileUp, Upload, FileText, Download, Loader2, ShieldCheck } from "lucide-react";
import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useUnifiedAccount, useUnifiedTransaction } from "@/hooks/useUnifiedAuth";
import { useSuiClient } from "@mysten/dapp-kit";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ACCESS_LEVEL_OPTIONS, type OrgRole } from "@/lib/types/crm";
import CONTRACT_CONFIG from "@/lib/config/contracts";
import { crmDecryptionService, type ResourceMetadata } from "@/lib/services/decryptionService";

interface ProfileFilesProps {
  profileId: string;
  onchainObjectId?: string;
}

interface FileMeta {
  id: string;
  filename: string;
  accessLevel: number;
  createdAt: string;
  resource?: ResourceMetadata;
}

export function ProfileFiles({ profileId, onchainObjectId }: ProfileFilesProps) {
  const { address } = useUnifiedAccount();
  const { execute: signAndExecuteTransaction } = useUnifiedTransaction();
  const suiClient = useSuiClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [file, setFile] = useState<File | null>(null);
  const [accessLevel, setAccessLevel] = useState<OrgRole>(2);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const orgRegistryId = CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY;

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/files`);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [profileId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !address) {
      toast.error("Connect your wallet or sign in with Google first");
      return;
    }
    setUploading(true);
    try {
      const { crmEncryptionService } = await import("@/lib/services/encryptionService");
      const MOCK_ORG_ID = CONTRACT_CONFIG.SHARED_OBJECTS.EXAMPLE_ORG_REGISTRY;

      const result = await crmEncryptionService.encryptAndUploadResource(
        file,
        profileId,
        MOCK_ORG_ID,
        MOCK_ORG_ID,
        "file",
        accessLevel,
        address
      );

      if (!result.success || !result.encryptionId || !result.blobId) {
        throw new Error(result.error ?? "Encryption/upload failed");
      }

      // Register on-chain with CREATE_ENCRYPTED_RESOURCE
      const tx = new Transaction();
      const cleanEncId = result.encryptionId.startsWith("0x")
        ? result.encryptionId.slice(2)
        : result.encryptionId;
      tx.moveCall({
        target: CONTRACT_CONFIG.FUNCTIONS.ACCESS_CONTROL.CREATE_ENCRYPTED_RESOURCE,
        arguments: [
          tx.pure.address(address),
          tx.pure.address(address),
          tx.pure.u8(CONTRACT_CONFIG.RESOURCE_TYPES.FILE),
          tx.pure.vector("u8", new TextEncoder().encode(result.blobId)),
          tx.pure.vector("u8", new TextEncoder().encode(cleanEncId)),
          tx.pure.u8(accessLevel),
          tx.pure.u64(Date.now()),
        ],
      });

      const res = await signAndExecuteTransaction({ transaction: tx });

      // Get resource object ID from tx
      let resourceObjectId = "";
      try {
        const txResult = await suiClient.waitForTransaction({
          digest: res.digest,
          options: { showObjectChanges: true },
        });
        const created = txResult.objectChanges?.find(
          (c: any) => c.type === "created" && c.objectType?.includes("EncryptedResource")
        ) as any;
        resourceObjectId = created?.objectId ?? "";
      } catch { /* non-fatal */ }

      // Save to MongoDB
      await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: profileId,
          adminAddress: address,
          filename: file.name,
          blobId: result.blobId,
          encryptionId: result.encryptionId,
          resourceObjectId,
          accessLevel,
          txDigest: res.digest,
        }),
      });

      setFile(null);
      fetchFiles();
      toast.success("File uploaded", {
        description: "Encrypted and stored on Walrus. Minted on Sui.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (meta: FileMeta) => {
    if (!meta.resource || !address) {
      toast.error("Sign in to download.");
      return;
    }
    setDownloadId(meta.id);
    try {
      const sessionKey = await crmDecryptionService.createSessionKey(address);
      const sig = await signPersonalMessage({ message: sessionKey.getPersonalMessage() });
      await sessionKey.setPersonalMessageSignature(sig.signature);

      const result = await crmDecryptionService.downloadAndDecryptResources(
        [meta.resource], orgRegistryId, sessionKey
      );

      if (result.success && result.decryptedFileUrls?.length) {
        const a = document.createElement("a");
        a.href = result.decryptedFileUrls[0];
        a.download = meta.filename || "download";
        a.click();
        URL.revokeObjectURL(result.decryptedFileUrls[0]);
        toast.success("Download started");
      } else {
        toast.error("Download failed", { description: result.error ?? "Could not decrypt file" });
      }
    } catch (err) {
      toast.error("Download failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setDownloadId(null);
    }
  };

  return (
    <Card className="border-none shadow-xl shadow-emerald-900/5 bg-white rounded-[32px] overflow-hidden">
      <div className="h-1.5 w-full flex">
        <div className="h-full flex-1 bg-emerald-400 rounded-bl-full" />
        <div className="h-full flex-1 bg-teal-500" />
        <div className="h-full flex-1 bg-emerald-500 rounded-br-full" />
      </div>
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
            <FileUp className="size-7 stroke-[1.5]" />
          </div>
          <div>
            <Badge className="bg-emerald-50 text-emerald-600 border-none px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-widest mb-1.5">
              Seal + Walrus
            </Badge>
            <CardTitle className="text-2xl font-black text-[#1a1a1a] tracking-tight">Files</CardTitle>
            <CardDescription className="text-slate-500 font-medium mt-0.5">
              Encrypted attachments. Set access level for decryption.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-2 space-y-8">
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-all ${
              dragActive ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          >
            <input
              ref={inputRef} type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={uploading}
            />
            <div className="p-10 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                <Upload className="size-7" />
              </div>
              <p className="text-sm font-bold text-[#1a1a1a]">
                {file ? file.name : "Drop file or click to upload"}
              </p>
              <p className="text-xs text-slate-400">PDF, documents, images. Encrypted with Seal.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[200px]">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Access level</Label>
              <Select value={String(accessLevel)} onValueChange={(v) => setAccessLevel(Number(v) as OrgRole)} disabled={uploading}>
                <SelectTrigger className="rounded-xl border-slate-200 bg-white h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit" disabled={uploading || !file || !address}
              className="h-12 px-6 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {uploading ? <><Loader2 className="size-5 animate-spin" />Uploading…</> : <><ShieldCheck className="size-4" />Upload</>}
            </Button>
          </div>
        </form>

        {loadingFiles ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin text-emerald-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 py-14 text-center">
            <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 mb-3">
              <FileText className="size-7" />
            </div>
            <h3 className="font-bold text-[#1a1a1a]">No files yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-[240px]">
              Upload a file above. It will be encrypted with Seal and stored on Walrus.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[#1a1a1a] truncate">{f.filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 text-[10px] font-bold uppercase tracking-wider">
                        {ACCESS_LEVEL_OPTIONS.find((o) => o.value === f.accessLevel)?.label ?? `Level ${f.accessLevel}`}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="rounded-xl font-bold border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 gap-2 shrink-0"
                  onClick={() => handleDownload(f)}
                  disabled={!address || downloadId === f.id}
                >
                  {downloadId === f.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Download
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!address && (
          <Alert className="rounded-xl bg-amber-50 border-amber-200 text-amber-800">
            <AlertDescription>Sign in with Google or connect a wallet to upload or download files.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
