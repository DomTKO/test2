// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, onMounted } from "vue";
import { api, getJson } from "../lib/api";

function normalizeSuffixLength(n: unknown) {
  const x = Number(n);
  if (x === 4 || x === 5 || x === 6) return x;
  return 4;
}

export function useAdminUsers() {
  // Form
  const prefix = ref("user_");
  const count = ref(10);
  const suffixLength = ref(4);
  const role = ref("voter"); // "voter" | "admin" | "showroom"

  // Create result
  const creating = ref(false);
  const createError = ref("");  // "" | "VALIDATION" | "CREATE_FAILED" | "COPY_FAILED"
  const createStatus = ref(""); // "" | "CREATED" | "COPIED"
  const newAccounts = ref<any[]>([]);

  // Tabs
  const activeTab = ref<"new" | "existing">("new");

  // Existing users
  const existingUsers = ref<any[]>([]);
  const existingLoading = ref(false);
  const existingError = ref(""); // "" | "LOAD_FAILED" | "UPDATE_FAILED"
  const currentUserId = ref<number | null>(null);
  const togglingIds = ref(new Set<number>());

  async function fetchMe() {
    try {
      const me = await getJson<any>("/auth/me");
      currentUserId.value = typeof me?.id === "number" ? me.id : null;
    } catch {
      currentUserId.value = null;
    }
  }

  async function loadExisting() {
    existingLoading.value = true;
    existingError.value = "";
    try {
      const users = await getJson<any[]>("/admin/users");
      existingUsers.value = Array.isArray(users) ? users : [];
    } catch {
      existingError.value = "LOAD_FAILED";
    } finally {
      existingLoading.value = false;
    }
  }

  async function createBatch() {
    createError.value = "";
    createStatus.value = "";
    newAccounts.value = [];

    const body = {
      prefix: String(prefix.value || "").trim(),
      count: Number(count.value),
      role: String(role.value || "voter"),
      suffixLength: normalizeSuffixLength(suffixLength.value),
    };

    if (!body.prefix || !Number.isFinite(body.count) || body.count < 1 || body.count > 500) {
      createError.value = "VALIDATION";
      return;
    }

    creating.value = true;
    try {
      const r = await api("/admin/users/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        createError.value = "CREATE_FAILED";
        return;
      }

      const data = await r.json();
      newAccounts.value = Array.isArray(data?.created) ? data.created : [];

      createStatus.value = "CREATED";
      activeTab.value = "new";
      await loadExisting();
    } catch {
      createError.value = "CREATE_FAILED";
    } finally {
      creating.value = false;
    }
  }

  async function copyAll() {
    if (!newAccounts.value.length) return;

    const lines = newAccounts.value
      .map((a: any) => `${String(a.username ?? "")}\t${String(a.password ?? "")}`)
      .join("\n");

    createError.value = "";
    try {
      await navigator.clipboard.writeText(lines);
      createStatus.value = "COPIED";
    } catch {
      createError.value = "COPY_FAILED";
    }
  }

  async function toggleActive(user: any, checked: boolean) {
    // user darf sich nicht selbst deaktivieren
    if (currentUserId.value != null && user?.id === currentUserId.value) return;

    const id = Number(user?.id);
    if (!Number.isFinite(id)) return;

    const newIsActive = checked ? 1 : 0;

    togglingIds.value.add(id);
    existingError.value = "";

    try {
      const r = await api(`/admin/users/${id}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newIsActive === 1 }),
      });

      if (!r.ok) throw new Error("update failed");

      const idx = existingUsers.value.findIndex((u: any) => u?.id === id);
      if (idx !== -1) {
        existingUsers.value[idx] = { ...existingUsers.value[idx], isActive: newIsActive };
      }
    } catch {
      existingError.value = "UPDATE_FAILED";
    } finally {
      togglingIds.value.delete(id);
    }
  }

  onMounted(async () => {
    await Promise.all([fetchMe(), loadExisting()]);
  });

  return {
    prefix,
    count,
    suffixLength,
    role,

    creating,
    createError,
    createStatus,
    newAccounts,

    activeTab,

    existingUsers,
    existingLoading,
    existingError,
    currentUserId,
    togglingIds,

    createBatch,
    copyAll,
    toggleActive,
    loadExisting,
  };
}
