import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, toHex } from "@mysten/sui/utils";
import crypto from "crypto";
import {
  suiClient,
  botKeypair,
  botAddress,
  PACKAGE_ID,
  ORG_REGISTRY_ID,
  PROFILE_REGISTRY_ID,
} from "./suiClient.js";
import { uploadBlob, downloadBlob } from "./walrusService.js";

// ---------------------------------------------------------------------------
// Seal key servers (same 4 used by the web frontend)
// ---------------------------------------------------------------------------

const SERVER_OBJECT_IDS = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
  "0x6068c0acb197dddbacd4746a9de7f025b2ed5a5b6c1b1ab44dade4426d141da2",
  "0x5466b7df5c15b508678d51496ada8afab0d6f70a01c10613123382b1b8131007",
];

const sealClient = new SealClient({
  suiClient: suiClient as any,
  serverConfigs: SERVER_OBJECT_IDS.map((id) => ({ objectId: id, weight: 1 })),
  verifyKeyServers: false,
});

const TTL_MIN = 10;

// ---------------------------------------------------------------------------
// Encrypt data and upload to Walrus
// ---------------------------------------------------------------------------

export interface EncryptResult {
  blobId: string;
  encryptionId: string;
  suiRef: string;
}

export async function encryptAndUpload(
  data: Uint8Array,
  orgRegistryId: string = ORG_REGISTRY_ID,
): Promise<EncryptResult> {
  // 1. Generate encryption ID = orgRegistryId bytes + 5-byte nonce
  const nonce = crypto.getRandomValues(new Uint8Array(5));
  const policyBytes = fromHex(orgRegistryId);
  const encryptionId = toHex(new Uint8Array([...policyBytes, ...nonce]));

  // 2. Encrypt with Seal (threshold 2-of-4)
  const { encryptedObject: encryptedBytes } = await sealClient.encrypt({
    threshold: 2,
    packageId: PACKAGE_ID,
    id: encryptionId,
    data,
  });

  // 3. Upload to Walrus
  const { blobId, suiRef } = await uploadBlob(encryptedBytes);

  return { blobId, encryptionId, suiRef };
}

// ---------------------------------------------------------------------------
// Download from Walrus and decrypt with Seal
// ---------------------------------------------------------------------------

export async function downloadAndDecrypt(
  blobId: string,
  resourceId: string,
  orgRegistryId: string = ORG_REGISTRY_ID,
): Promise<Uint8Array> {
  // 1. Download encrypted blob
  const encryptedBytes = await downloadBlob(blobId);

  // 2. Create a server-side session key using the bot's keypair
  const sessionKey = await SessionKey.create({
    address: botAddress,
    packageId: PACKAGE_ID,
    ttlMin: TTL_MIN,
    suiClient: suiClient as any,
  });

  // Sign the personal message with the bot's keypair (server-side equivalent of wallet signing)
  const personalMessage = sessionKey.getPersonalMessage();
  const { signature } = await botKeypair.signPersonalMessage(personalMessage);
  await sessionKey.setPersonalMessageSignature(signature);

  // 3. Parse the encryption ID from the encrypted object
  let fullId = EncryptedObject.parse(encryptedBytes).id;
  if (!fullId.startsWith("0x")) fullId = "0x" + fullId;

  // 4. Build a PTB calling seal_approve
  const tx = new Transaction();
  const idHex = fullId.startsWith("0x") ? fullId.slice(2) : fullId;
  tx.moveCall({
    target: `${PACKAGE_ID}::crm_access_control::seal_approve`,
    arguments: [
      tx.pure.vector("u8", fromHex(idHex)),
      tx.object(resourceId),
      tx.object(orgRegistryId),
      tx.object(PROFILE_REGISTRY_ID),
    ],
  });
  const txBytes = await tx.build({
    client: suiClient,
    onlyTransactionKind: true,
  });

  // 5. Decrypt with retry logic (Seal FN propagation delay)
  let decryptedData: Uint8Array | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      decryptedData = await sealClient.decrypt({
        data: encryptedBytes,
        sessionKey,
        txBytes,
      });
      break;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("newly created object") || msg.includes("InvalidParameter")) {
        console.warn(`⏳ Seal retry ${attempt + 1}/3 — FN sync delay`);
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }

  if (!decryptedData) {
    throw lastError ?? new Error("Decryption failed after retries");
  }

  return decryptedData;
}

// ---------------------------------------------------------------------------
// Check if Seal/Walrus integration is available
// ---------------------------------------------------------------------------

export function isConfigured(): boolean {
  return !!(
    process.env.SUI_PRIVATE_KEY &&
    process.env.PACKAGE_ID &&
    process.env.ORG_REGISTRY_ID &&
    process.env.PROFILE_REGISTRY_ID
  );
}
