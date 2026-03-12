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
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [address]);

  return { user, loading };
}
