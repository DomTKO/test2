// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { api } from "../lib/api";

export type ComponentType = "voting" | "verifier" | "admin-api" | string;
export type LevelType = "INFO" | "WARN" | "ERROR" | string;

export interface LogEntry {
  id: number;
  userId: number | null;
  component: ComponentType;
  eventType: string;
  level: LevelType;
  userAgent: string | null;
  details: unknown | null;
  createdAt: string | Date;
}

type UseAdminLogsOptions = {
  limit?: number;
  autoLoad?: boolean;
};

export function useAdminLogs(options: UseAdminLogsOptions = {}) {
  const { t } = useI18n();

  const limit = options.limit ?? 200;
  const autoLoad = options.autoLoad ?? true;

  const logs = ref<LogEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const filterComponent = ref<string>("");
  const filterLevel = ref<string>("");

  const openedDetailsId = ref<number | null>(null);

  const filteredLogs = computed(() =>
    logs.value.filter((entry) => {
      if (filterComponent.value && entry.component !== filterComponent.value) {
        return false;
      }
      if (filterLevel.value && entry.level !== filterLevel.value) {
        return false;
      }
      return true;
    })
  );

  function toggleDetails(id: number) {
    openedDetailsId.value = openedDetailsId.value === id ? null : id;
  }

  // Wenn Filter wechselt und die geöffnete Zeile nicht mehr sichtbar ist -> schließen
  watch([filterComponent, filterLevel, filteredLogs], () => {
    if (openedDetailsId.value == null) return;
    const stillVisible = filteredLogs.value.some((e) => e.id === openedDetailsId.value);
    if (!stillVisible) openedDetailsId.value = null;
  });

  async function load() {
    loading.value = true;
    error.value = null;

    try {
      const r = await api(`/admin/logs?limit=${encodeURIComponent(String(limit))}`);
      if (!r.ok) {
        console.error("Failed to load logs, status:", r.status);
        error.value = t("admin.logs.loadError") as string;
        return;
      }

      const data = await r.json();
      logs.value = Array.isArray(data) ? (data as LogEntry[]) : [];
    } catch (e) {
      console.error("Error loading logs:", e);
      error.value = t("admin.logs.loadError") as string;
    } finally {
      loading.value = false;
    }
  }

  function downloadJson() {
    const dataToDownload = filteredLogs.value.length ? filteredLogs.value : logs.value;

    const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `logs-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  onMounted(() => {
    if (autoLoad) load();
  });

  return {
    logs,
    loading,
    error,

    filterComponent,
    filterLevel,

    openedDetailsId,
    filteredLogs,

    load,
    toggleDetails,
    downloadJson,
  };
}
