import { useEffect, useState } from "react";
import { api } from "./api";
import Button from "./components/Button";
import Card from "./components/Card";
import EmptyState from "./components/EmptyState";
import Icon from "./components/Icon";
import Input from "./components/Input";
import { CardSkeleton } from "./components/Skeleton";
import { LOW_FLOAT_BALANCE } from "./adminUtils";

// Shared by create and edit - same fields either way, just prefilled and
// pointed at a different submit handler when editing.
function MarketForm({ initial, onSubmit, onCancel, busy, error }) {
  const [name, setName] = useState(initial?.name || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [latitude, setLatitude] = useState(initial?.latitude ?? "");
  const [longitude, setLongitude] = useState(initial?.longitude ?? "");

  function submit() {
    onSubmit({
      name: name.trim(),
      city: city.trim(),
      state: state.trim(),
      latitude: latitude === "" ? null : Number(latitude),
      longitude: longitude === "" ? null : Number(longitude),
    });
  }

  return (
    <Card className="border-2 border-brand-orange">
      <p className="mb-3 font-bold text-slate-900">{initial ? "Edit market" : "New market"}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input placeholder="Name (e.g. Mile 12 Market)" value={name} onChange={(e) => setName(e.target.value)} className="sm:col-span-2" />
        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
        <Input placeholder="Latitude (optional)" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
        <Input placeholder="Longitude (optional)" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="neutral" onClick={onCancel} disabled={busy} className="flex-1">Cancel</Button>
        <Button onClick={submit} busy={busy} disabled={!name.trim() || !city.trim() || !state.trim()} className="flex-1">
          {initial ? "Save changes" : "Create market"}
        </Button>
      </div>
    </Card>
  );
}

function AdminMarkets() {
  const [markets, setMarkets] = useState(null);
  const [floatByMarket, setFloatByMarket] = useState({});
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const list = await api.getAllMarkets();
      setMarkets(list);
      setError("");
      const balances = await Promise.all(
        list.map((m) => api.floatBalance(m.id).catch(() => ({ balance: null })))
      );
      const map = {};
      list.forEach((m, i) => { map[m.id] = balances[i].balance; });
      setFloatByMarket(map);
    } catch (e) {
      setError("Could not load markets. (" + e.message + ")");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(body) {
    setFormError(""); setBusy(true);
    try {
      await api.createMarket(body);
      setCreating(false);
      await refresh();
    } catch (e) {
      setFormError("Could not create market: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id, body) {
    setFormError(""); setBusy(true);
    try {
      await api.updateMarket(id, body);
      setEditingId(null);
      await refresh();
    } catch (e) {
      setFormError("Could not save changes: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(market) {
    setError(""); setBusy(true);
    try {
      await api.updateMarket(market.id, { is_active: !market.is_active });
      await refresh();
    } catch (e) {
      setError("Could not update market: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">Markets</h1>
          <p className="mt-1 text-slate-500">Where agents shop — this is what sets up a pilot market.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} className="shrink-0">
            <Icon name="plus" className="h-4 w-4" /> New market
          </Button>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {creating && (
        <div className="mb-4">
          <MarketForm
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setFormError(""); }}
            busy={busy}
            error={formError}
          />
        </div>
      )}

      {markets === null ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : markets.length === 0 && !creating ? (
        <EmptyState icon="store" title="No markets yet" subtitle="Create one to start assigning agents and orders." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {markets.map((m) =>
            editingId === m.id ? (
              <MarketForm
                key={m.id}
                initial={m}
                onSubmit={(body) => handleUpdate(m.id, body)}
                onCancel={() => { setEditingId(null); setFormError(""); }}
                busy={busy}
                error={formError}
              />
            ) : (
              <Card key={m.id} className={m.is_active ? "" : "opacity-60"}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900">{m.name}</div>
                    <div className="text-sm text-slate-500">{m.city}, {m.state}</div>
                  </div>
                  {!m.is_active && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">Inactive</span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Float balance</span>
                  <span className={
                    "font-bold " +
                    (floatByMarket[m.id] != null && Number(floatByMarket[m.id]) < LOW_FLOAT_BALANCE
                      ? "text-red-600" : "text-slate-900")
                  }>
                    {floatByMarket[m.id] != null ? `₦${floatByMarket[m.id]}` : "—"}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="neutral" onClick={() => { setEditingId(m.id); setFormError(""); }} className="flex-1 text-sm">
                    Edit
                  </Button>
                  <Button variant="neutral" onClick={() => handleToggleActive(m)} disabled={busy} className="flex-1 text-sm">
                    {m.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default AdminMarkets;
