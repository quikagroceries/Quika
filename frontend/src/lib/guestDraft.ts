/** Guest shopping draft — survives refresh until Place order succeeds. */

export const GUEST_DRAFT_KEY = "quika_guest_draft";

export type ShopStep = "market" | "vendors" | "list" | "address" | "quote";

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
    // Migrate older drafts that jumped market → list
    if (draft.step === "list" && draft.marketId && !draft.vendorId && draft.vendorName === undefined) {
      // keep list if they already built one; otherwise vendors is fine via flow
    }
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
