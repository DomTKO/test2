// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed, onMounted, watch } from "vue";
import { api, getJson } from "../lib/api";

export function useAdminTickets(opts?: { defaultOpenOnly?: boolean }) {
  const tickets = ref<any[]>([]);
  const loading = ref(false);

  const errorKey = ref("");

  const showOnlyOpen = ref(opts?.defaultOpenOnly ?? true);
  const updatingIds = ref(new Set<number>());

  const filteredTickets = computed(() => {
    const list = Array.isArray(tickets.value) ? tickets.value : [];
    return showOnlyOpen.value ? list.filter((t: any) => !t?.resolved) : list;
  });

  async function loadTickets() {
    loading.value = true;
    errorKey.value = "";

    try {
      const query = showOnlyOpen.value ? "?onlyOpen=1" : "";
      const data = await getJson<any[]>(`/admin/tickets${query}`);
      tickets.value = Array.isArray(data) ? data : [];
    } catch {
      errorKey.value = "LOAD_FAILED";
    } finally {
      loading.value = false;
    }
  }

  async function toggleResolved(ticket: any) {
    const id = Number(ticket?.id);
    if (!Number.isFinite(id)) return;

    errorKey.value = "";
    updatingIds.value.add(id);

    const targetResolved = ticket?.resolved ? 0 : 1;

    try {
      const r = await api(`/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: targetResolved === 1 }),
      });

      if (!r.ok) {
        errorKey.value = "UPDATE_FAILED";
        return;
      }

      let resolvedNum = targetResolved;
      try {
        const payload = await r.json();
        if (typeof payload?.resolved === "number") resolvedNum = payload.resolved;
        else if (payload?.resolved === true) resolvedNum = 1;
        else if (payload?.resolved === false) resolvedNum = 0;
      } catch {
      }

      const nowIso = new Date().toISOString();

      tickets.value = (Array.isArray(tickets.value) ? tickets.value : []).map((t: any) => {
        if (Number(t?.id) !== id) return t;
        return {
          ...t,
          resolved: resolvedNum,
          resolvedAt: resolvedNum === 1 ? (t?.resolvedAt || nowIso) : null,
        };
      });
    } catch {
      errorKey.value = "UPDATE_FAILED";
    } finally {
      updatingIds.value.delete(id);
    }
  }

  watch(showOnlyOpen, () => {
    void loadTickets();
  });

  onMounted(() => {
    void loadTickets();
  });

  return {
    tickets,
    filteredTickets,
    loading,
    errorKey,

    showOnlyOpen,
    updatingIds,

    loadTickets,
    toggleResolved,
  };
}
