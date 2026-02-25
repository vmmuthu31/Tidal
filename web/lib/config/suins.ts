/**
 * SuiNS Integration for Sui CRM
 *
 * Provides:
 *  - resolveName(name)    → Forward lookup: "alice.sui" → Sui address + metadata
 *  - getName(address)     → Reverse lookup: "0x..." → "alice.sui" (default name)
 *  - getSuinsClient()     → Singleton SuinsClient for reuse
 *
 * Uses the official @mysten/suins SDK.
 * Docs: https://docs.suins.io/developer/sdk
 */

import { SuinsClient } from "@mysten/suins";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

export type NetworkType = "mainnet" | "testnet";

const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK as NetworkType) === "mainnet"
  ? "mainnet"
  : "testnet";

const RPC_URL =
  process.env.NEXT_PUBLIC_SUI_RPC_URL ||
  `https://fullnode.${NETWORK}.sui.io:443`;


// ── Singleton instances ──────────────────────────────────────────────────────

let _suiClient: SuiJsonRpcClient | null = null;
let _suinsClient: SuinsClient | null = null;

export function getSuiClient(): SuiJsonRpcClient {
  if (!_suiClient) {
    _suiClient = new SuiJsonRpcClient({ url: RPC_URL, network: NETWORK });
  }
  return _suiClient;
}

export function getSuinsClient(): SuinsClient {
  if (!_suinsClient) {
    _suinsClient = new SuinsClient({
      client: getSuiClient() as any,
      network: NETWORK,
    });
  }
  return _suinsClient;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface SuiNSNameRecord {
  name: string;
  address: string | null;
  expirationMs: number;
  avatar?: string;
  contentHash?: string;
  walrusSiteId?: string;
  isExpired: boolean;
}

// ── Forward lookup: .sui name → address + metadata ──────────────────────────

/**
 * Resolve a SuiNS name to its target Sui address and metadata.
 * Returns null if the name doesn't exist or has no target address.
 *
 * @example
 *   const record = await resolveName("alice.sui");
 *   // { name: "alice.sui", address: "0x...", avatar: "...", isExpired: false }
 */
export async function resolveName(name: string): Promise<SuiNSNameRecord | null> {
  try {
    const client = getSuinsClient();
    const record = await client.getNameRecord(name);
    if (!record) return null;

    const now = Date.now();
    return {
      name: record.name,
      address: record.targetAddress || null,
      expirationMs: record.expirationTimestampMs,
      avatar: record.avatar,
      contentHash: record.contentHash,
      walrusSiteId: record.walrusSiteId,
      isExpired: now > record.expirationTimestampMs,
    };
  } catch {
    return null;
  }
}

// ── Reverse lookup: address → default .sui name ──────────────────────────────

/**
 * Look up the SuiNS name(s) registered for a Sui address.
 * Uses the native RPC method `suix_resolveNameServiceNames`.
 * Returns the first name, or null if none.
 *
 * @example
 *   const name = await getName("0xabc...");
 *   // "alice.sui" or null
 */
export async function getName(address: string): Promise<string | null> {
  try {
    const client = getSuiClient();
    console.log("[SuiNS] resolveNameServiceNames →", address, "network:", NETWORK);

    const result = await client.resolveNameServiceNames({ address, limit: 5 });
    console.log("[SuiNS] resolveNameServiceNames result:", JSON.stringify(result));

    return result?.data?.[0] ?? null;
  } catch (err) {
    console.error("[SuiNS] resolveNameServiceNames error:", err);
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the string looks like a SuiNS name (ends with .sui) */
export function isSuiNSName(value: string): boolean {
  return /^[a-zA-Z0-9-]+\.sui$/.test(value.trim());
}

/** Shortens a Sui address for display: "0x1234…5678" */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}
