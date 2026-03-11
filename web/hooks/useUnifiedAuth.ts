"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SessionManager } from "@/lib/zklogin/session";
import { ZkLoginService } from "@/lib/zklogin/zklogin";
import { getSuiClient } from "@/lib/config/sui";

export type AuthMode = "wallet" | "zk" | null;

export interface UnifiedAccount {
  address: string | null;
  authMode: AuthMode;
}

/**
 * Returns the currently active account from either provider:
 * - Wallet (dapp-kit): when user has connected their Sui wallet
 * - ZK Login: when user has signed in with Google and SessionManager has proof
 *
 * Use this so UI and transaction flows work the same for both auth methods.
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
 * Sign and execute a Sui transaction using whichever provider is active:
 * - Wallet: uses dapp-kit's signAndExecuteTransaction (wallet extension signs)
 * - ZK Login: uses SessionManager proof + ZkLoginService (same flow as sponsored tx signing)
 *
 * Return shape matches dapp-kit: { digest: string } so existing forms work unchanged.
 */
export function useUnifiedSignAndExecuteTransaction(): {
  signAndExecuteTransaction: (params: { transaction: Transaction }) => Promise<{ digest: string }>;
} {
  const { address, authMode } = useUnifiedAccount();
  const dappSignAndExecute = useSignAndExecuteTransaction().mutateAsync;

  const signAndExecuteTransaction = useCallback(
    async (params: { transaction: Transaction }): Promise<{ digest: string }> => {
      const { transaction: tx } = params;

      if (authMode === "wallet") {
        const result = await dappSignAndExecute({ transaction: tx });
        return { digest: result.digest };
      }

      if (authMode === "zk" && address) {
        const proof = SessionManager.getProof();
        if (!proof) {
          throw new Error("ZK Login session expired. Please sign in again.");
        }

        tx.setSender(proof.address);
        const client = getSuiClient();
        const keypair = ZkLoginService.recreateKeyPair(proof.ephemeralPrivateKey);
        const txBytes = await tx.build({ client });
        const { signature: userSignature } = await keypair.signTransaction(txBytes);

        const zkLoginSignature = ZkLoginService.createTransactionSignature(
          proof.zkProof,
          proof.maxEpoch,
          userSignature,
          proof.jwtToken,
          proof.userSalt
        );

        const result = await client.executeTransactionBlock({
          transactionBlock: txBytes,
          signature: zkLoginSignature,
          options: { showEffects: true, showEvents: true },
        });

        return { digest: result.digest };
      }

      throw new Error("No active account. Connect a wallet or sign in with ZK Login.");
    },
    [authMode, address, dappSignAndExecute]
  );

  return { signAndExecuteTransaction };
}
