// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref } from "vue";
import { api, getJson } from "../lib/api";

export type BallotBase = {
  id: number;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  minChoices: number;
  maxChoices: number;
  ballotType?: "simple" | "first" | "second" | string;
  electionId?: number | null;
  electionNameDe?: string | null;
  electionNameEn?: string | null;
};

export type Choice = {
  id: number;
  ballotId: number;
  labelDe: string;
  labelEn: string;
  sortIndex: number;
  technicalNone: number;
};

export type Ballot = BallotBase & {
  choices: Choice[];
};

export type Draft = {
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  minChoices: number;
  maxChoices: number;
};

export type ElectionText = {
  titleDe: string;
  titleEn: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

type Election = {
  id: number;
  slug: string;
  nameDe: string;
  nameEn: string | null;
  descriptionDe: string;
  descriptionEn: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: number;
};

async function readJsonIfPossible(r: Response): Promise<any | null> {
  try {
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export function useAdminBallots() {
  const ballots = ref<Ballot[]>([]);
  const loading = ref(false);

  const errorKey = ref<string | null>(null);

  const savingBallot = ref(false);

  const choicesLoadingIds = ref<Set<number>>(new Set());
  const addingChoiceIds = ref<Set<number>>(new Set());
  const deletingChoiceIds = ref<Set<number>>(new Set());
  const deletingBallotIds = ref<Set<number>>(new Set());

  function clearError() {
    errorKey.value = null;
  }

  async function loadChoicesFor(ballotId: number) {
    choicesLoadingIds.value.add(ballotId);
    try {
      const raw = await getJson<Choice[]>(`/admin/ballots/${ballotId}/choices`);
      const visible = raw.filter((c) => c.technicalNone === 0);

      const idx = ballots.value.findIndex((b) => b.id === ballotId);
      if (idx !== -1) {
        ballots.value[idx] = { ...ballots.value[idx], choices: visible };
      }
    } catch {
      errorKey.value = "admin.ballots.choicesLoadError";
    } finally {
      choicesLoadingIds.value.delete(ballotId);
    }
  }

  async function loadBallots() {
    
    loading.value = true;
    errorKey.value = null;

    try {
      const base = await getJson<BallotBase[]>("/admin/ballots");
      ballots.value = base.map((b) => ({ ...b, choices: [] }));

      await Promise.all(ballots.value.map((b) => loadChoicesFor(b.id)));
    } catch {
      errorKey.value = "admin.ballots.loadError";
    } finally {
      loading.value = false;
    }
  }

  async function createElectionForPair(
    electionText: ElectionText,
    first: Draft,
    second: Draft
  ): Promise<Election | null> {
    const baseTitleDe =
      electionText.titleDe || first.titleDe || second.titleDe || "Wahlgruppe";
    const baseTitleEn =
      electionText.titleEn || first.titleEn || second.titleEn || baseTitleDe;

    const baseDescDe = baseTitleDe;
    const baseDescEn = baseTitleEn;

    let slug = slugify(baseTitleEn || baseTitleDe || "election");
    if (!slug) slug = "election";
    slug = `${slug}-${Date.now().toString(36)}`;

    const body = {
      slug,
      nameDe: baseTitleDe,
      nameEn: baseTitleEn,
      descriptionDe: baseDescDe,
      descriptionEn: baseDescEn,
      startsAt: null as string | null,
      endsAt: null as string | null,
      isActive: 1,
    };

    const r = await api("/admin/elections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) return null;
    return (await r.json()) as Election;
  }

  function isInvalidDraft(d: Draft): boolean {
    return (
      !d.titleDe?.trim() ||
      !d.titleEn?.trim() ||
      !Number.isFinite(Number(d.minChoices)) ||
      !Number.isFinite(Number(d.maxChoices)) ||
      Number(d.minChoices) < 0 ||
      Number(d.maxChoices) < 1 ||
      Number(d.minChoices) > Number(d.maxChoices)
    );
  }

  async function createSimpleBallot(draft: Draft): Promise<boolean> {
    clearError();

    const body = {
      titleDe: draft.titleDe.trim(),
      titleEn: draft.titleEn.trim(),
      descriptionDe: (draft.descriptionDe ?? "").trim(),
      descriptionEn: (draft.descriptionEn ?? "").trim(),
      minChoices: Number(draft.minChoices),
      maxChoices: Number(draft.maxChoices),
      ballotType: "simple" as const,
      electionId: null as number | null,
    };

    if (isInvalidDraft(body)) {
      errorKey.value = "admin.ballots.validationError";
      return false;
    }

    savingBallot.value = true;
    try {
      const r = await api("/admin/ballots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        errorKey.value = "admin.ballots.createError";
        return false;
      }

      const created = (await r.json()) as BallotBase;
      ballots.value.push({ ...created, choices: [] });
      return true;
    } catch {
      errorKey.value = "admin.ballots.createError";
      return false;
    } finally {
      savingBallot.value = false;
    }
  }

  async function createPairBallots(
    electionText: ElectionText,
    firstDraft: Draft,
    secondDraft: Draft
  ): Promise<boolean> {
    clearError();

    const first: Draft = {
      ...firstDraft,
      titleDe: firstDraft.titleDe.trim(),
      titleEn: firstDraft.titleEn.trim(),
      descriptionDe: (firstDraft.descriptionDe ?? "").trim(),
      descriptionEn: (firstDraft.descriptionEn ?? "").trim(),
      minChoices: Number(firstDraft.minChoices),
      maxChoices: Number(firstDraft.maxChoices),
    };

    const second: Draft = {
      ...secondDraft,
      titleDe: secondDraft.titleDe.trim(),
      titleEn: secondDraft.titleEn.trim(),
      descriptionDe: (secondDraft.descriptionDe ?? "").trim(),
      descriptionEn: (secondDraft.descriptionEn ?? "").trim(),
      minChoices: Number(secondDraft.minChoices),
      maxChoices: Number(secondDraft.maxChoices),
    };

    if (isInvalidDraft(first) || isInvalidDraft(second)) {
      errorKey.value = "admin.ballots.validationError";
      return false;
    }

    savingBallot.value = true;
    try {
      const election = await createElectionForPair(electionText, first, second);
      if (!election) {
        errorKey.value = "admin.ballots.createError";
        return false;
      }

      const electionId = election.id;

      const r1 = await api("/admin/ballots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...first, ballotType: "first", electionId }),
      });
      if (!r1.ok) {
        errorKey.value = "admin.ballots.createError";
        return false;
      }
      const createdFirst = (await r1.json()) as BallotBase;

      const r2 = await api("/admin/ballots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...second, ballotType: "second", electionId }),
      });
      if (!r2.ok) {
        errorKey.value = "admin.ballots.createError";
        return false;
      }
      const createdSecond = (await r2.json()) as BallotBase;

      ballots.value.push(
        {
          ...createdFirst,
          electionNameDe: election.nameDe,
          electionNameEn: election.nameEn,
          choices: [],
        },
        {
          ...createdSecond,
          electionNameDe: election.nameDe,
          electionNameEn: election.nameEn,
          choices: [],
        }
      );

      return true;
    } catch {
      errorKey.value = "admin.ballots.createError";
      return false;
    } finally {
      savingBallot.value = false;
    }
  }

  async function addChoice(
    ballotId: number,
    labelDe: string,
    labelEn: string
  ): Promise<boolean> {
    clearError();

    if (!labelDe.trim() || !labelEn.trim()) {
      errorKey.value = "admin.ballots.choiceValidationError";
      return false;
    }

    addingChoiceIds.value.add(ballotId);
    try {
      const r = await api(`/admin/ballots/${ballotId}/choices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelDe: labelDe.trim(), labelEn: labelEn.trim() }),
      });

      if (!r.ok) {
        errorKey.value = "admin.ballots.addChoiceError";
        return false;
      }

      const created = (await r.json()) as Choice;
      const idx = ballots.value.findIndex((b) => b.id === ballotId);
      if (idx !== -1) {
        ballots.value[idx].choices = [...ballots.value[idx].choices, created];
      }
      return true;
    } catch {
      errorKey.value = "admin.ballots.addChoiceError";
      return false;
    } finally {
      addingChoiceIds.value.delete(ballotId);
    }
  }

  async function deleteChoice(ballotId: number, choiceId: number): Promise<boolean> {
    clearError();
    deletingChoiceIds.value.add(choiceId);

    try {
      const r = await api(`/admin/choices/${choiceId}`, { method: "DELETE" });

      if (!r.ok) {
        const payload = await readJsonIfPossible(r);
        if (payload?.code === "HAS_VOTES") {
          errorKey.value = "admin.ballots.deleteChoiceHasVotes";
        } else {
          errorKey.value = "admin.ballots.deleteChoiceError";
        }
        return false;
      }

      const idx = ballots.value.findIndex((b) => b.id === ballotId);
      if (idx !== -1) {
        ballots.value[idx].choices = ballots.value[idx].choices.filter(
          (c) => c.id !== choiceId
        );
      }
      return true;
    } catch {
      errorKey.value = "admin.ballots.deleteChoiceError";
      return false;
    } finally {
      deletingChoiceIds.value.delete(choiceId);
    }
  }

  async function deleteBallot(ballotId: number): Promise<boolean> {
    clearError();
    deletingBallotIds.value.add(ballotId);

    try {
      const r = await api(`/admin/ballots/${ballotId}`, { method: "DELETE" });

      if (!r.ok) {
        const payload = await readJsonIfPossible(r);
        if (payload?.code === "HAS_VOTES") {
          errorKey.value = "admin.ballots.deleteHasVotes";
        } else {
          errorKey.value = "admin.ballots.deleteError";
        }
        return false;
      }

      ballots.value = ballots.value.filter((b) => b.id !== ballotId);
      return true;
    } catch {
      errorKey.value = "admin.ballots.deleteError";
      return false;
    } finally {
      deletingBallotIds.value.delete(ballotId);
    }
  }

  return {
    ballots,
    loading,
    errorKey,

    savingBallot,
    choicesLoadingIds,
    addingChoiceIds,
    deletingChoiceIds,
    deletingBallotIds,

    loadBallots,
    loadChoicesFor,

    createSimpleBallot,
    createPairBallots,

    addChoice,
    deleteChoice,
    deleteBallot,
  };
}
