"use client";

import { useCallback, useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { toBase64, fromBase64 } from "@mysten/sui/utils";
import { SessionManager } from "@/lib/zklogin/session";
import { ZkLoginService } from "@/lib/zklogin/zklogin";
import { CRM_SPONSORED_TARGETS } from "@/lib/config/contracts";

interface SponsorState {
  isSponsoring: boolean;
  error: string | null;
}

/**
 * useSponsoredTransaction
 *
 * A hook for submitting Sui transactions where the gas is paid by the
 * organization's Enoki gas pool — not the user.
 *
 * Usage (inside any dashboard component):
 *
 *   const { sponsorAndExecute, isSponsoring, error } = useSponsoredTransaction();
 *
 *   const handleCreateProfile = async () => {
 *     const tx = new Transaction();
 *     tx.moveCall({ target: CONTRACT_FUNCTIONS.PROFILE.CREATE_PROFILE, arguments: [...] });
 *
 *     const digest = await sponsorAndExecute(tx);
 *     console.log("tx digest:", digest);
 *   };
 */
export function useSponsoredTransaction(
  injectedProof?: ReturnType<typeof SessionManager.getProof>
) {
  const [state, setState] = useState<SponsorState>({
    isSponsoring: false,
    error: null,
  });

  const sponsorAndExecute = useCallback(
    async (
      tx: Transaction,
      options?: {
        allowedMoveCallTargets?: string[];
        allowedAddresses?: string[];
      }
    ): Promise<string> => {
      setState({ isSponsoring: true, error: null });

      try {
        // Load the proof the callback page saved to localStorage
        const proof = injectedProof ?? SessionManager.getProof();
        if (!proof) {
          throw new Error("Not authenticated. Please log in via zkLogin first.");
        }

        // Reconstruct the ephemeral keypair from the stored private key
        const ephemeralKeyPair = ZkLoginService.recreateKeyPair(proof.ephemeralPrivateKey);

        // Build transaction KIND bytes only (Enoki will wrap them with gas & sender)
        const network = (process.env.NEXT_PUBLIC_SUI_NETWORK as "testnet" | "mainnet" | "devnet") || "testnet";
        const client = new SuiJsonRpcClient({
          url: process.env.NEXT_PUBLIC_SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
          network,
        });
        const txKindBytes = await tx.build({ client, onlyTransactionKind: true });
        const txKindBytesB64 = toBase64(txKindBytes);

        // Step 1: Ask the backend (Enoki) to sponsor the transaction
        const sponsorRes = await fetch("/api/sponsor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionKindBytes: txKindBytesB64,
            sender: proof.address,
            allowedMoveCallTargets: options?.allowedMoveCallTargets ?? CRM_SPONSORED_TARGETS,
            allowedAddresses: options?.allowedAddresses,
          }),
        });

        if (!sponsorRes.ok) {
          const errJson = await sponsorRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Sponsorship failed (${sponsorRes.status})`);
        }

        const { digest, bytes } = await sponsorRes.json();

        // Step 2: Sign the sponsored tx bytes with the ephemeral keypair
        const sponsoredTxBytes = fromBase64(bytes);
        const { signature: ephemeralSignature } =
          await ephemeralKeyPair.signTransaction(sponsoredTxBytes);

        // Step 3: Build the full zkLogin signature (ephemeral sig + ZK proof)
        const zkLoginSignature = ZkLoginService.createTransactionSignature(
          proof.zkProof,
          proof.maxEpoch,
          ephemeralSignature,
          proof.jwtToken,
          proof.userSalt
        );

        // Step 4: Submit the zkLogin signature to Enoki to broadcast on-chain
        const executeRes = await fetch(`/api/sponsor/${digest}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature: zkLoginSignature }),
        });

        if (!executeRes.ok) {
          const errJson = await executeRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Execution failed (${executeRes.status})`);
        }

        const { digest: finalDigest } = await executeRes.json();
        setState({ isSponsoring: false, error: null });
        return finalDigest;
      } catch (err: any) {
        const msg = err.message || "Sponsored transaction failed";
        setState({ isSponsoring: false, error: msg });
        throw err;
      }
    },
    [injectedProof]
  );

  return {
    sponsorAndExecute,
    isSponsoring: state.isSponsoring,
    error: state.error,
  };
}
