"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SessionManager } from "@/lib/zklogin/session";
import { ZkLoginService } from "@/lib/zklogin/zklogin";
import { getSuiClient } from "@/lib/config/sui";
import { useSponsoredTransaction } from "@/hooks/useSponsoredTransaction";
import { CRM_SPONSORED_TARGETS } from "@/lib/config/contracts";

export type AuthMode = "wallet" | "zk" | null;

export interface UnifiedAccount {
  address: string | null;
  authMode: AuthMode;
}

/**
 * Returns the currently active account from either provider:
 * - Wallet (dapp-kit): when user has connected their Sui wallet
 * - ZK Login: when user has signed in with Google and SessionManager has proof
 */
export function useUnifiedAccount(): UnifiedAccount {
  const dappAccount = useCurrentAccount();
  const [zkProof, setZkProof] = useState<ReturnType<typeof SessionManager.getProof>>(null);

  useEffect(() => {
    setZkProof(SessionManager.getProof());
  }, []);

  const address = dappAccount?.address ?? zkProof?.address ?? null;
  const authMode: AuthMode = dappAccount ? "wallet" : zkProof ? "zk" : null;

  return { address, authMode };
}

/**
 * Sign and execute a Sui transaction using whichever provider is active.
 *
 * For ZK Login users this uses the direct RPC path:
 *   1. Validate the ZK session hasn't expired (epoch check)
 *   2. Build the full transaction (with gas from user's address)
 *   3. Sign with the ephemeral keypair
 *   4. Wrap in a ZK Login signature
 *   5. Submit via sui_executeTransactionBlock
 */
export function useUnifiedSignAndExecuteTransaction(): {
  signAndExecuteTransaction: (params: { transaction: Transaction }) => Promise<{ digest: string }>;
} {
  const { address, authMode } = useUnifiedAccount();
  const dappSignAndExecute = useSignAndExecuteTransaction().mutateAsync;

  const signAndExecuteTransaction = useCallback(
    async (params: { transaction: Transaction }): Promise<{ digest: string }> => {
      const { transaction: tx } = params;

      // ── Wallet (dapp-kit) path ────────────────────────────────────────────
      if (authMode === "wallet") {
        const result = await dappSignAndExecute({ transaction: tx });
        return { digest: result.digest };
      }

      // ── ZK Login path — follows the official Mysten ZK Login guide ──────────
      const proof = SessionManager.getProof();
      if (proof) {
        console.log("[ZkLogin] proof found, address:", proof.address, "maxEpoch:", proof.maxEpoch);

        const client = getSuiClient();

        // 1. Epoch validity check
        try {
          const sysState = await client.getLatestSuiSystemState();
          const currentEpoch = Number(sysState.epoch);
          console.log("[ZkLogin] epoch check — maxEpoch:", proof.maxEpoch, "currentEpoch:", currentEpoch);
          if (proof.maxEpoch < currentEpoch) {
            SessionManager.clearProof();
            throw new Error(
              `ZK Login session expired (max epoch ${proof.maxEpoch}, current ${currentEpoch}). Please sign in again.`
            );
          }
        } catch (epochErr: any) {
          if (epochErr.message?.includes("ZK Login session expired")) throw epochErr;
          console.warn("[ZkLogin] epoch check skipped (RPC error):", epochErr.message);
        }

        // 2. Rebuild ephemeral keypair
        const keypair = ZkLoginService.recreateKeyPair(proof.ephemeralPrivateKey);

        // 3. Set sender and sign — official pattern: tx.sign({ client, signer })
        tx.setSender(proof.address);
        const { bytes, signature: userSignature } = await tx.sign({ client, signer: keypair });

        // 4. Build ZK Login signature — spread partialZkLoginSignature + addressSeed
        const zkLoginSignature = ZkLoginService.createTransactionSignature(
          proof.zkProof,
          proof.maxEpoch,
          userSignature,
          proof.jwtToken,
          proof.userSalt
        );

        // 5. Execute — pass base64 bytes directly to executeTransactionBlock
        console.log("[ZkLogin] submitting transaction...");
        const result = await client.executeTransactionBlock({
          transactionBlock: bytes,
          signature: [zkLoginSignature],
          options: { showEffects: true },
        });
        console.log("[ZkLogin] result:", result);

        const digest = result.digest;
        if (!digest) throw new Error("Transaction failed — no digest returned.");

        if (result.effects?.status?.status === "failure") {
          throw new Error(`Transaction failed on-chain: ${result.effects.status.error}`);
        }

        return { digest };
      }

      throw new Error("No active account. Connect a wallet or sign in with ZK Login.");
    },
    [authMode, address, dappSignAndExecute]
  );

  return { signAndExecuteTransaction };
}

/**
 * useUnifiedTransaction — primary CRM transaction hook.
 * wallet  → dapp-kit direct execution (user pays gas)
 * zkLogin → Enoki sponsored execution (org pays gas)
 *
 * Drop-in for useUnifiedSignAndExecuteTransaction when gas sponsorship is desired.
 */
export function useUnifiedTransaction(options?: {
  allowedMoveCallTargets?: string[];
}): {
  execute: (params: { transaction: Transaction }) => Promise<{ digest: string }>;
  isPending: boolean;
  error: string | null;
} {
  const { address, authMode } = useUnifiedAccount();
  const dappSignAndExecute = useSignAndExecuteTransaction().mutateAsync;

  const [zkProof] = useState(() =>
    typeof window !== "undefined" ? SessionManager.getProof() : null
  );

  const { sponsorAndExecute, isSponsoring, error } = useSponsoredTransaction(
    authMode === "zk" ? zkProof : undefined
  );

  const execute = useCallback(
    async (params: { transaction: Transaction }): Promise<{ digest: string }> => {
      const { transaction: tx } = params;

      if (authMode === "wallet") {
        const result = await dappSignAndExecute({ transaction: tx });
        return { digest: result.digest };
      }

      if (authMode === "zk") {
        if (!zkProof) throw new Error("Not authenticated. Please sign in with ZK Login first.");
        const digest = await sponsorAndExecute(tx, {
          allowedMoveCallTargets: options?.allowedMoveCallTargets ?? CRM_SPONSORED_TARGETS,
        });
        return { digest };
      }

      throw new Error("No active account. Connect a wallet or sign in with ZK Login.");
    },
    [authMode, address, dappSignAndExecute, sponsorAndExecute, zkProof, options?.allowedMoveCallTargets]
  );

  return { execute, isPending: isSponsoring, error };
}

/**
 * useUnifiedSignPersonalMessage — works for both wallet and zkLogin users.
 *
 * wallet  → delegates to dapp-kit useSignPersonalMessage
 * zkLogin → signs with the stored ephemeral Ed25519 keypair
 *
 * Returns a function: (message: Uint8Array) => Promise<string>  (base64 signature)
 */
export function useUnifiedSignPersonalMessage(): {
  signPersonalMessage: (message: Uint8Array) => Promise<string>;
} {
  const { authMode } = useUnifiedAccount();
  const { mutateAsync: dappSignPersonalMessage } = useSignPersonalMessage();

  const signPersonalMessage = useCallback(
    async (message: Uint8Array): Promise<string> => {
      if (authMode === "wallet") {
        const result = await dappSignPersonalMessage({ message });
        return result.signature;
      }

      if (authMode === "zk") {
        const proof = SessionManager.getProof();
        if (!proof) throw new Error("No zkLogin session found. Please sign in again.");

        // Recreate the ephemeral keypair and sign the personal message
        const keypair = ZkLoginService.recreateKeyPair(proof.ephemeralPrivateKey);
        const { signature: ephemeralSig } = await keypair.signPersonalMessage(message);

        // Wrap the ephemeral signature in a full zkLogin signature.
        // Seal's SessionKey verifies address ownership — for a zkLogin address
        // that requires the ZK proof, not a bare Ed25519 signature.
        const zkLoginSig = ZkLoginService.createTransactionSignature(
          proof.zkProof,
          proof.maxEpoch,
          ephemeralSig,
          proof.jwtToken,
          proof.userSalt
        );
        return zkLoginSig;
      }

      throw new Error("No active account. Sign in with Google or connect a wallet.");
    },
    [authMode, dappSignPersonalMessage]
  );

  return { signPersonalMessage };
}
