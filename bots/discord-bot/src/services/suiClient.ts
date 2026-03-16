import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

// ---------------------------------------------------------------------------
// Sui client & bot keypair — initialised from environment variables
// ---------------------------------------------------------------------------

const NETWORK = (process.env.SUI_NETWORK as "testnet" | "mainnet" | "devnet" | "localnet") || "testnet";

export const suiClient = new SuiJsonRpcClient({
  network: NETWORK,
  url: getJsonRpcFullnodeUrl(NETWORK),
});

/**
 * Derive the bot's Ed25519 keypair from `SUI_PRIVATE_KEY`.
 * Accepts the Bech32-encoded secret key format produced by `sui keytool`.
 */
function loadKeypair(): Ed25519Keypair {
  const raw = process.env.SUI_PRIVATE_KEY;
  if (!raw) throw new Error("SUI_PRIVATE_KEY env var is required for Seal/Walrus integration");

  // Bech32 `suiprivkey1…` format
  const { scheme, secretKey } = decodeSuiPrivateKey(raw);
  if (scheme !== "ED25519") throw new Error(`Unsupported key scheme: ${scheme}. Only ED25519 is supported.`);
  return Ed25519Keypair.fromSecretKey(secretKey);
}

export const botKeypair = loadKeypair();
export const botAddress = botKeypair.toSuiAddress();

// Contract configuration from environment
export const PACKAGE_ID = process.env.PACKAGE_ID!;
export const ORG_REGISTRY_ID = process.env.ORG_REGISTRY_ID!;
export const PROFILE_REGISTRY_ID = process.env.PROFILE_REGISTRY_ID!;

export function assertConfigured(): void {
  const missing: string[] = [];
  if (!process.env.PACKAGE_ID) missing.push("PACKAGE_ID");
  if (!process.env.ORG_REGISTRY_ID) missing.push("ORG_REGISTRY_ID");
  if (!process.env.PROFILE_REGISTRY_ID) missing.push("PROFILE_REGISTRY_ID");
  if (!process.env.SUI_PRIVATE_KEY) missing.push("SUI_PRIVATE_KEY");
  if (missing.length) {
    console.warn(`⚠️  Seal/Walrus integration disabled — missing env: ${missing.join(", ")}`);
  } else {
    console.log(`🔑 Bot address: ${botAddress}`);
  }
}
