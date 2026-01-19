// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed } from "vue";
import { getJson } from "../lib/api";

export function useVerifyIntro(locale: { value: unknown }) {
  const introHtml = ref("");

  const hasIntro = computed(() => introHtml.value.trim().length > 0);

  async function loadIntro() {
    try {
      const data = await getJson<{ html: string }>(
        `/content/verify?lang=${encodeURIComponent(String(locale.value))}`
      );
      introHtml.value = (data?.html || "").trim();
    } catch {
      introHtml.value = "";
    }
  }

  return { introHtml, hasIntro, loadIntro };
}
