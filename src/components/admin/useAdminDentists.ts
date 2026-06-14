"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClinicDentist } from "@/lib/dentists";

export function useAdminDentists() {
  const [dentists, setDentists] = useState<ClinicDentist[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dentists");
      const data = await res.json();
      if (res.ok) {
        setDentists(data.dentists ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dentists, loading, refresh };
}
