// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, watch, type Ref } from "vue";
import { getJson } from "../lib/api";

type CmsResponse = { html?: string | null };

export function useDynamicContent(opts: {
  key: string;
  locale: Ref<string>;
  basePath?: string;
}) {
  const basePath = (opts.basePath ?? "/content").replace(/\/+$/, "");
  const html = ref<string>("");
  const loading = ref<boolean>(false);
  const error = ref<string>("");
  let reqId = 0;

  async function load() {
    const myId = ++reqId;

    loading.value = true;
    error.value = "";

    try {
      const url = `${basePath}/${encodeURIComponent(opts.key)}?lang=${encodeURIComponent(
        String(opts.locale.value)
      )}`;

      const data = await getJson<CmsResponse>(url);

      if (myId !== reqId) return;
      html.value = String(data?.html ?? "");
    } catch (e: any) {
      if (myId !== reqId) return;
      html.value = "";
      error.value = e?.message ? String(e.message) : "CMS load failed";
    } finally {
      if (myId === reqId) loading.value = false;
    }
  }

  watch(
    () => opts.locale.value,
    () => void load(),
    { immediate: true }
  );

  return {
    html,
    loading,
    error,
    reload: load,
  };
}
