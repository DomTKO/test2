// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed } from "vue";
import { getJson } from "../lib/api";
import { toBool } from "../lib/parse";

type KVRow = { cKey: string; cVal: string };

export function useReportConfig(t: (k: string) => unknown) {
  const loading = ref(true);
  const enabled = ref(false);

  function safeT(key: string, fallback: string): string {
    const v = t(key) as string;
    return v === key ? fallback : v;
  }

  const disabledText = computed(() =>
    safeT("verify.report.disabled", "Diese Funktion ist aktuell deaktiviert.")
  );

  async function fetchVotingEnablePublicReport(): Promise<boolean> {
    const key = "votingEnablePublicReport";

    const candidates: Array<() => Promise<any>> = [
      () => getJson<any>(`/config/${encodeURIComponent(key)}`),
      () => getJson<any>("/config"),
      () => getJson<any>("/public/config"),
      () => getJson<any>("/admin/config"),
    ];

    for (const getFn of candidates) {
      try {
        const data = await getFn();

        if (Array.isArray(data)) {
          const row = (data as any[]).find((x) => x?.cKey === key) as KVRow | undefined;
          if (row) return toBool(row.cVal);
        }

        if (data && typeof data === "object" && "cKey" in data && "cVal" in data) {
          if (String((data as any).cKey) === key) return toBool((data as any).cVal);
        }

        if (data && typeof data === "object" && "cVal" in data && !("cKey" in data)) {
          return toBool((data as any).cVal);
        }

        if (data && typeof data === "object" && key in data) {
          return toBool((data as any)[key]);
        }
      } catch {
      }
    }
    return false;
  }

  async function loadConfig() {
    loading.value = true;
    try {
      enabled.value = await fetchVotingEnablePublicReport();
    } finally {
      loading.value = false;
    }
  }

  return { loading, enabled, disabledText, loadConfig };
}
