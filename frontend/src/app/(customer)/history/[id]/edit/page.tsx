"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";
import ListBuilder from "@/components/ListBuilder";
import { draftFromOrder } from "@/lib/orderToDraft";
import HeroBanner from "@/components/HeroBanner";
import personShoppingList from "@/assets/illustrations/person-shopping-list.png";

// Edit a saved draft list. Only drafts are editable (the backend enforces
// it too - see orders.service.update_draft): once an agent is proposed or
// shopping starts, other people are relying on the list as it stands.
export default function EditDraftPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [market, setMarket] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getOrder(id)
      .then((o: any) => {
        if (o.status !== "draft") router.replace(`/orders/${id}`);
        else setOrder(o);
      })
      .catch(() => setError("Could not load this list."));
  }, [id, router]);

  useEffect(() => {
    if (!order) return;
    api
      .getMarkets()
      .then((list: any[]) => setMarket(list.find((m) => m.id === order.market_id) || null))
      .catch(() => {});
  }, [order]);

  const initial = useMemo(() => (order ? draftFromOrder(order) : null), [order]);

  async function save(payload: any) {
    setError("");
    setSaving(true);
    try {
      await api.updateDraftOrder(id, {
        listed_items_total: payload.unstructuredTotal,
        items: payload.items,
      });
      router.push("/track?tab=lists");
    } catch (e: any) {
      setError("Could not save your changes: " + e.message);
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <HeroBanner
        leading={
          <button
            type="button"
            onClick={() => router.push("/track?tab=lists")}
            aria-label="Back to lists"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-canvas text-ink transition hover:bg-sunken-2"
          >
            <Icon name="chevronDown" className="h-5 w-5 rotate-90" />
          </button>
        }
        eyebrow="Edit list"
        title={market?.name ? `Your list for ${market.name}` : "Your saved list"}
        body="Change what's on it, then save. Nothing is sent to an agent until you place the order."
        illustration={personShoppingList}
      />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {initial && (
        <ListBuilder
          initial={initial}
          standalone
          marketId={order.market_id}
          marketName={market?.name}
          onContinue={save}
          continueLabel={saving ? "Saving…" : "Save changes"}
        />
      )}
    </div>
  );
}
