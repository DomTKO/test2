// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed, watchEffect, type Ref } from "vue";
import { getJson } from "../lib/api";

export type BallotType = "simple" | "first" | "second" | "pair" | string;

export type Ballot = {
  id: number;
  title: string;
  description: string | null;
  minChoices?: number;
  maxChoices?: number;
  ballotType?: BallotType;
  electionId?: number | null;
  electionSlug?: string | null;
  electionName?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  electionIsActive?: 0 | 1 | boolean | null;
};

function toDateSafe(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isBallotOpen(b: Ballot): boolean {
  // Ballots ohne Election: immer offen
  if (b.electionId == null) return true;

  // Election explizit deaktiviert
  if (b.electionIsActive === 0 || b.electionIsActive === false) return false;

  const now = new Date();

  const start = toDateSafe(b.startsAt);
  if (start && now < start) return false;

  const end = toDateSafe(b.endsAt);
  if (end && now > end) return false;

  return true;
}

//Gruppiert Erst- und Zweitstimme pro Election in eine "Kachel"
function groupFirstSecond(input: Ballot[]): Ballot[] {
  const result: Ballot[] = [];
  const used = new Set<number>();

  for (const b of input) {
    if (used.has(b.id)) continue;

    const isVoteType =
      (b.ballotType === "first" || b.ballotType === "second") &&
      b.electionId != null;

    if (isVoteType) {
      const sibling = input.find(
        (other) =>
          !used.has(other.id) &&
          other.id !== b.id &&
          (other.ballotType === "first" || other.ballotType === "second") &&
          other.electionId === b.electionId
      );

      if (sibling) {
        used.add(b.id);
        used.add(sibling.id);

        let primary = b;
        let secondary = sibling;
        if (b.ballotType === "second" && sibling.ballotType === "first") {
          primary = sibling;
          secondary = b;
        }

        const title =
          primary.electionName || primary.title || secondary.title || "";

        const descParts = [
          primary.description || "",
          secondary.description || "",
        ].filter((d) => d.trim().length > 0);

        const description =
          descParts.length > 1 ? descParts.join(" · ") : descParts[0] || null;

        result.push({
          ...primary,
          title,
          description,
          ballotType: "pair",
        });

        continue;
      }
    }

    used.add(b.id);
    result.push(b);
  }

  return result;
}

export function useHomeBallots(opts: {
  locale: Ref<string>;
  t: (key: string) => unknown;
}) {
  const ballots = ref<Ballot[]>([]);
  const votedIds = ref<Set<number>>(new Set<number>());
  const loading = ref(true);
  const err = ref("");

  async function load() {
    loading.value = true;
    err.value = "";

    const lang = encodeURIComponent(String(opts.locale.value));
    try {
      const [ballotsData, ids] = await Promise.all([
        getJson<Ballot[]>(`/ballots?lang=${lang}`),
        getJson<number[]>(`/me/votes`),
      ]);

      ballots.value = Array.isArray(ballotsData) ? ballotsData : [];
      votedIds.value = new Set(Array.isArray(ids) ? ids : []);
    } catch {
      err.value = opts.t("common.loadError") as string;
    } finally {
      loading.value = false;
    }
  }

  watchEffect(() => {
    void opts.locale.value;
    void load();
  });

  const availableBallots = computed(() =>
    groupFirstSecond(
      ballots.value.filter((b) => !votedIds.value.has(b.id) && isBallotOpen(b))
    )
  );

  const submittedBallots = computed(() =>
    groupFirstSecond(ballots.value.filter((b) => votedIds.value.has(b.id)))
  );

  return {
    loading,
    err,
    availableBallots,
    submittedBallots,
    reload: load,
  };
}
