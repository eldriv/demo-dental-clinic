"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClinicDentist } from "@/lib/dentists";

const DENTISTS_CACHE_TTL_MS = 60_000;

let dentistsCache: { data: ClinicDentist[]; at: number } | null = null;
let dentistsInflight: Promise<ClinicDentist[]> | null = null;

async function fetchDentistsShared(): Promise<ClinicDentist[]> {
  const now = Date.now();
  if (dentistsCache && now - dentistsCache.at < DENTISTS_CACHE_TTL_MS) {
    return dentistsCache.data;
  }

  if (!dentistsInflight) {
    dentistsInflight = fetch("/api/admin/dentists")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) return [];
        const list = (data.dentists ?? []) as ClinicDentist[];
        dentistsCache = { data: list, at: Date.now() };
        return list;
      })
      .finally(() => {
        dentistsInflight = null;
      });
  }

  return dentistsInflight;
}

export function invalidateAdminDentistsCache(): void {
  dentistsCache = null;
}

export function useAdminDentists() {
  const [dentists, setDentists] = useState<ClinicDentist[]>(dentistsCache?.data ?? []);
  const [loading, setLoading] = useState(!dentistsCache);

  const refresh = useCallback(async () => {
    invalidateAdminDentistsCache();
    setLoading(true);
    try {
      const list = await fetchDentistsShared();
      setDentists(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (dentistsCache) {
      setDentists(dentistsCache.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchDentistsShared().then((list) => {
      if (!cancelled) {
        setDentists(list);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { dentists, loading, refresh };
}
