/** Guest shopping draft — survives refresh until Place order succeeds. */

export const GUEST_DRAFT_KEY = "quika_guest_draft";

// List-first flow: compose the list, then choose the market, then delivery,
// then quote. "vendors" is a retired step kept only so old drafts coerce.
export type ShopStep = "list" | "market" | "address" | "quote";

const VALID_STEPS: ShopStep[] = ["list", "market", "address", "quote"];

/** Coerce any stored/legacy step onto the current flow — unknown → "list". */
export function normalizeStep(step: unknown): ShopStep {
  return VALID_STEPS.includes(step as ShopStep) ? (step as ShopStep) : "list";
}

export type GuestDraft = {
  marketId: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  step: ShopStep;
  stagedList: unknown | null;
  address: string;
  marketSlug?: string | null;
};

export function loadGuestDraft(): GuestDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as GuestDraft;
    // Coerce legacy/unknown steps ("vendors", "market" from the old
    // market-first flow) onto the current list-first flow.
    draft.step = normalizeStep(draft.step);
    return draft;
  } catch {
    return null;
  }
}

export function saveGuestDraft(draft: GuestDraft) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
}

export function clearGuestDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_DRAFT_KEY);
}
