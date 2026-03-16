"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useUnifiedAccount } from "@/hooks/useUnifiedAuth";
import { type UserRecord } from "@/lib/mongodb";

interface UseUserResult {
  user: UserRecord | null;
  loading: boolean;
}

function resetUserState(
  setUser: Dispatch<SetStateAction<UserRecord | null>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): void {
  setUser(null);
  setLoading(false);
}

export function useUser(): UseUserResult {
  const { address } = useUnifiedAccount();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser(currentAddress: string): Promise<void> {
    setLoading(true);

    try {
      const response = await fetch(`/api/users?address=${currentAddress}`);
      const data = (await response.json()) as { user?: UserRecord | null };
      const loaded: UserRecord | null = data.user ?? null;
      setUser(loaded);

      if (loaded?.hasOrg && !loaded.orgRegistryId) {
        if (loaded.role === "member" && loaded.orgAdminAddress) {
          try {
            const adminRes = await fetch(`/api/users?address=${loaded.orgAdminAddress}`);
            const adminData = (await adminRes.json()) as { user?: UserRecord | null };
            if (adminData.user?.orgRegistryId) {
              await fetch(`/api/users`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  suiAddress: loaded.suiAddress,
                  orgRegistryId: adminData.user.orgRegistryId,
                }),
              });
              setUser((prev) =>
                prev ? { ...prev, orgRegistryId: adminData.user?.orgRegistryId } : prev,
              );
            }
          } catch {
            // Non-fatal — user will fall back to EXAMPLE_ORG_REGISTRY
          }
        } else {
          try {
            const syncRes = await fetch(`/api/users/sync-org?address=${currentAddress}`);
            const syncData = (await syncRes.json()) as { orgRegistryId?: string };
            if (syncData.orgRegistryId) {
              setUser((prev) =>
                prev ? { ...prev, orgRegistryId: syncData.orgRegistryId } : prev,
              );
            }
          } catch {
            // Non-fatal — user will fall back to EXAMPLE_ORG_REGISTRY
          }
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!address) {
      resetUserState(setUser, setLoading);
      return;
    }
    void loadUser(address);
  }, [address]);

  return { user, loading };
}
