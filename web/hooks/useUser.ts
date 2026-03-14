"use client";

import { useEffect, useState } from "react";
import { useUnifiedAccount } from "@/hooks/useUnifiedAuth";
import { type UserRecord } from "@/lib/mongodb";

interface UseUserResult {
  user: UserRecord | null;
  loading: boolean;
}

export function useUser(): UseUserResult {
  const { address } = useUnifiedAccount();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    setLoading(true);

    fetch(`/api/users?address=${address}`)
      .then((r) => r.json())
      .then(async (data) => {
        const loaded: UserRecord | null = data.user ?? null;
        setUser(loaded);

        // If the user has an org but we don't have their OrgAccessRegistry ID yet,
        // look it up from their on-chain transaction history and cache it.
        if (loaded?.hasOrg && !loaded.orgRegistryId) {
          try {
            const syncRes = await fetch(`/api/users/sync-org?address=${address}`);
            const syncData = await syncRes.json();
            if (syncData.orgRegistryId) {
              setUser((prev) =>
                prev ? { ...prev, orgRegistryId: syncData.orgRegistryId } : prev
              );
            }
          } catch {
            // Non-fatal — user will fall back to EXAMPLE_ORG_REGISTRY
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [address]);

  return { user, loading };
}
