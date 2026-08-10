// Falls back to localhost so local dev keeps working even without a .env
// (see .env.example) - but any real deployment must set VITE_API_BASE_URL,
// or every request silently targets a dev machine that isn't there.
const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Cloudinary unsigned upload — chat photos go straight from the browser to
// Cloudinary, never through our backend (no image bytes touch our server).
// Cloud name + unsigned preset are meant to be public (that's how
// Cloudinary's unsigned-upload model works) - env-driven so switching
// accounts doesn't require a code change, not because they're secret.
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "y0vuqbu5";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "quika_chat";

// Fired on ANY 401 from ANY request, not just the screens that happen to
// check for it - App.jsx registers its logout handler here once on mount.
// Without this, a token that goes stale (expiry, server restart, logout in
// another tab) while a polling screen (OrderDetail, Notifications, Shopping)
// is mounted just spams 401s forever instead of ever returning to Login,
// since those screens' setInterval polls never themselves checked the
// status code. Routing every request through this one place means a single
// fix here covers every current AND future poller, instead of needing the
// same 401 check copy-pasted into each one.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Every request goes through here so the token is attached in ONE place.
async function request(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("quika_token");
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      // Only add the auth header if we actually have a token.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    // Throw so the calling screen can catch and show an error.
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  // Some endpoints return no body; guard against that.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  requestOtp: (phone) =>
    request("/auth/request-otp", { method: "POST", body: { phone } }),
  verifyOtp: (phone, code) =>
    request("/auth/verify-otp", { method: "POST", body: { phone, code } }),
  myOrders: () => request("/orders/mine"),

  // The app calls this to check if the token is still valid and get the user info.
  me: () => request("/auth/me"),
  updateProfile: (body) => request("/auth/me", { method: "PATCH", body }),

  // --- shopping ---
  getOrder: (id) => request(`/orders/${id}`),
  // Propose->accept assignment: the customer sees who's proposed before an
  // agent gains any access to the order.
  getProposedAgent: (id) => request(`/orders/${id}/proposed-agent`),
  acceptProposedAgent: (id) => request(`/orders/${id}/accept-agent`, { method: "POST" }),
  seeAnotherAgent: (id) => request(`/orders/${id}/see-another-agent`, { method: "POST" }),
  startShopping: (id) =>
    request(`/orders/${id}/start-shopping`, { method: "POST" }),
  releaseOrder: (id) => request(`/orders/${id}/release`, { method: "POST" }),
  // Agent/customer view switch — on_duty is the single source of truth for
  // which dashboard a vetted agent sees (see App.jsx).
  getMyAgentStatus: () => request("/markets/agents/me"),
  setAgentDuty: (onDuty) =>
    request("/markets/agents/me/duty", { method: "PATCH", body: { on_duty: onDuty } }),
  // Agent Dashboard tab — earnings, task counts, availability, share history.
  getAgentSummary: () => request("/agent/summary"),
  setAgentAvailability: (isAvailable) =>
    request("/agent/availability", { method: "PATCH", body: { is_available: isAvailable } }),
  payVendor: (id, body) =>
    request(`/jit/orders/${id}/pay-vendor`, { method: "POST", body }),
  flagUnavailable: (id, itemId) =>
    request(`/orders/${id}/items/${itemId}/unavailable`, { method: "POST" }),
  // Per-item overage (#5): the item's real price is above what the customer
  // listed - request approval for just that item, instead of paying it.
  requestItemOverage: (id, itemId, price) =>
    request(`/orders/${id}/items/${itemId}/request-overage`, { method: "POST", body: { price } }),
  decideItemOverage: (id, itemId, decision) =>
    request(`/orders/${id}/items/${itemId}/overage-decide`, { method: "POST", body: { decision } }),
  // Agent rating (#7) - customer feedback only, once per completed order.
  getRating: (id) => request(`/orders/${id}/rating`),
  rateAgent: (id, stars, comment) =>
    request(`/orders/${id}/rating`, { method: "POST", body: { stars, comment: comment || null } }),
  finishShopping: (id) =>
    request(`/orders/${id}/finish-shopping`, { method: "POST" }),

    // --- customer ---
  myCustomerOrders: () => request("/orders/mine-customer"),
  createOrder: (body) => request("/orders", { method: "POST", body }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: "DELETE" }),
  // Unlike delete: legal even with a deposit already paid (it's refunded to
  // the wallet instead of blocking the cancellation).
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
  getMarkets: () => request("/markets"),
  payBalance: (id) =>
    request(`/payments/orders/${id}/pay-from-wallet`, { method: "POST" }),
  payDeposit: (id) =>
    request(`/payments/orders/${id}/deposit/pay-from-wallet`, { method: "POST" }),
  // Bank-transfer (Paystack) alternative for each — origin becomes the
  // callback_url so the browser lands back on this app, tagged with the
  // reference so the return screen can verify immediately (see below).
  checkoutBalance: (id) =>
    request(`/payments/orders/${id}/checkout`, {
      method: "POST",
      body: { origin: window.location.origin },
    }),
  checkoutDeposit: (id) =>
    request(`/payments/orders/${id}/deposit/checkout`, {
      method: "POST",
      body: { origin: window.location.origin },
    }),
  verifyBalanceCheckout: (id, reference) =>
    request(`/payments/orders/${id}/checkout/verify`, {
      method: "POST",
      body: { reference },
    }),
  verifyDepositCheckout: (id, reference) =>
    request(`/payments/orders/${id}/deposit/checkout/verify`, {
      method: "POST",
      body: { reference },
    }),
  decideItem: (id, itemId, decision) =>
    request(`/orders/${id}/items/${itemId}/decide`, {
      method: "POST",
      body: { decision },
    }),
  getAuthorization: (id) => request(`/jit/orders/${id}/authorization`),
  // Purchase receipts (amount + photo) per stall - proof of goods bought.
  getPurchases: (id) => request(`/jit/orders/${id}/purchases`),
  // Attach/replace a purchase photo after the fact - required before
  // finish-shopping, but never blocks the transfer itself.
  attachPurchasePhoto: (id, transferId, photoRef) =>
    request(`/jit/orders/${id}/purchases/${transferId}/photo`, {
      method: "POST", body: { photo_ref: photoRef },
    }),

  // --- delivery ---
  packOrder: (id) => request(`/delivery/orders/${id}/pack`, { method: "POST" }),
  dispatchCourier: (id, courierReference) =>
    request(`/delivery/orders/${id}/dispatch-courier`, {
      method: "POST",
      body: courierReference ? { courier_reference: courierReference } : {},
    }),
  addPackingPhotos: (id, refs) =>
    request(`/delivery/orders/${id}/packing-photos`, { method: "POST", body: { refs } }),
  confirmDelivery: (id) =>
    request(`/delivery/orders/${id}/confirm-delivery`, { method: "POST" }),

  // --- agent applications ---
  applyAsAgent: (body) => request("/agent-applications", { method: "POST", body }),
  raiseCap: (id, extra) =>
    request(`/jit/orders/${id}/authorization/raise`, {
      method: "POST",
      body: { extra },
    }),

  // --- wallet ---
  getWalletBalance: () => request("/wallet"),
  fundWalletInit: (amount) =>
    request("/payments/wallet/fund/init", {
      method: "POST",
      // origin tells the backend where to send Paystack's callback_url, so
      // it lands back on wherever this app is actually running.
      body: { amount, origin: window.location.origin },
    }),
  fundWalletDev: (amount) =>
    request("/wallet/fund", { method: "POST", body: { amount } }), // dev-only direct credit
  verifyWalletFunding: (reference) =>
    request("/payments/wallet/fund/verify", { method: "POST", body: { reference } }),
  getWalletTransactions: () => request("/wallet/transactions"),

  // --- admin ---
  getAdminFloat: (marketId) =>
    request(`/admin/float${marketId ? `?market_id=${marketId}` : ""}`),
  getInFlightOrders: () => request("/admin/orders/in-flight"),
  getOrderLosses: () => request("/admin/orders/losses"),
  getFlaggedUsers: () => request("/admin/users/flagged"),
  clearUserFlag: (userId) =>
    request(`/admin/users/${userId}/clear-flag`, { method: "POST" }),
  listAgents: () => request("/admin/agents"),
  getAnalytics: (days) =>
    request(`/admin/analytics${days ? `?days=${days}` : ""}`),
  getAgentApplications: (statusFilter) =>
    request(`/agent-applications${statusFilter ? `?status=${statusFilter}` : ""}`),
  approveAgentApplication: (id) =>
    request(`/agent-applications/${id}/approve`, { method: "POST" }),
  rejectAgentApplication: (id) =>
    request(`/agent-applications/${id}/reject`, { method: "POST" }),
  assignAgent: (orderId, agentId) =>
    request(`/orders/${orderId}/assign-agent`, {
      method: "POST",
      body: { agent_id: agentId },
    }),
  createMarket: (body) => request("/markets", { method: "POST", body }),
  updateMarket: (id, body) =>
    request(`/markets/${id}`, { method: "PATCH", body }),
  getAllMarkets: () => request("/markets?active_only=false"),
  floatTransfer: (body) => request("/float/transfer", { method: "POST", body }),
  floatTopUp: (marketId, amount, note) =>
    request(`/float/top-up${marketId ? `?market_id=${marketId}` : ""}`, {
      method: "POST",
      body: { amount, note },
    }),
  floatBalance: (marketId) =>
    request(`/float/balance${marketId ? `?market_id=${marketId}` : ""}`),

  // --- notifications ---
  getNotifications: () => request("/notifications"),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),

  // --- calls (LiveKit prototype) ---
  getCallToken: (orderId) => request(`/calls/${orderId}/token`, { method: "POST" }),

  // --- chat ---
  getMessages: (orderId) => request(`/orders/${orderId}/messages`),
  sendMessage: (orderId, body) =>
    request(`/orders/${orderId}/messages`, { method: "POST", body }),

  // Plain fetch, not the request() helper above: different host (Cloudinary,
  // not our BASE), no Authorization header, form-data not JSON. Shared by
  // chat photos and packing photos - same unsigned preset, same upload
  // mechanic, just called from different screens.
  uploadChatImage: (file) => uploadToCloudinary(file),
  uploadPackingPhoto: (file) => uploadToCloudinary(file),
  uploadPurchasePhoto: (file) => uploadToCloudinary(file),
};

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  return data.secure_url;
}