// Falls back to localhost so local dev keeps working even without a .env
// (see .env.example) - but any real deployment must set NEXT_PUBLIC_API_BASE_URL,
// or every request silently targets a dev machine that isn't there.
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Cloudinary unsigned upload — chat photos go straight from the browser to
// Cloudinary, never through our backend (no image bytes touch our server).
// Cloud name + unsigned preset are meant to be public (that's how
// Cloudinary's unsigned-upload model works) - env-driven so switching
// accounts doesn't require a code change, not because they're secret.
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "y0vuqbu5";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "quika_chat";

// Fired on ANY 401 from ANY request, not just the screens that happen to
// check for it - AuthProvider registers its logout handler here once on mount.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Every request goes through here so the token is attached in ONE place.
async function request(path: string, { method = "GET", body }: { method?: string; body?: unknown } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("qyka_token") : null;
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const detail = await res.text();
    throw new Error(`${res.status}: ${detail}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // `identifier` is a phone number OR an email — the backend tells them apart.
  // `channel` ("sms" | "whatsapp" | "email") only matters for a phone
  // identifier; an email identifier always delivers by email regardless.
  // Returns { detail, channel, dev_otp, expires_in_seconds }.
  requestOtp: (identifier: string, channel?: "sms" | "whatsapp" | "voice" | "email") =>
    request("/auth/request-otp", {
      method: "POST",
      body: { identifier, ...(channel ? { channel } : {}) },
    }),
  // `role` is only honored by the backend outside production, and only for
  // an identifier that doesn't already have an account - see auth/routes.py.
  verifyOtp: (identifier: string, code: string, role?: string) =>
    request("/auth/verify-otp", {
      method: "POST",
      body: { identifier, code, ...(role ? { role } : {}) },
    }),
  // credential is the ID token from Google Identity Services. Google already
  // verifies the email, so this always logs in or creates the account in one
  // step — returns { access_token }.
  googleAuth: (credential: string) =>
    request("/auth/google", { method: "POST", body: { credential } }),
  // Admins only — standard email+password login, never phone/OTP. See
  // backend/app/admin/routes.py::admin_login.
  adminLogin: (email: string, password: string) =>
    request("/admin/login", { method: "POST", body: { email, password } }),
  myOrders: () => request("/orders/mine"),

  me: () => request("/auth/me"),
  getHealth: () => request("/health"),
  updateProfile: (body) => request("/auth/me", { method: "PATCH", body }),
  // Attaches a verified email to the signed-in account. Caller must have
  // already sent the code via requestOtp(email) - this just confirms it,
  // the same way sign-in/sign-up verification works.
  // Agent-only accounts (approved from the public For Agents page) opting
  // into the customer side - see backend auth/routes.py::register_customer.
  registerAsCustomer: (body: { full_name?: string; default_delivery_address?: string }) =>
    request("/auth/me/register-customer", { method: "POST", body }),
  linkEmail: (email: string, code: string) =>
    request("/auth/link-email", { method: "POST", body: { email, code } }),

  getOrder: (id) => request(`/orders/${id}`),
  getConversations: () => request("/chat/conversations"),
  markChatRead: (id) => request(`/orders/${id}/messages/read`, { method: "POST" }),
  getOrderAgent: (id) => request(`/orders/${id}/agent`),
  getProposedAgent: (id) => request(`/orders/${id}/proposed-agent`),
  acceptProposedAgent: (id) => request(`/orders/${id}/accept-agent`, { method: "POST" }),
  seeAnotherAgent: (id) => request(`/orders/${id}/see-another-agent`, { method: "POST" }),
  startShopping: (id) =>
    request(`/orders/${id}/start-shopping`, { method: "POST" }),
  releaseOrder: (id) => request(`/orders/${id}/release`, { method: "POST" }),
  getMyAgentStatus: () => request("/markets/agents/me"),
  setAgentDuty: (onDuty) =>
    request("/markets/agents/me/duty", { method: "PATCH", body: { on_duty: onDuty } }),
  getAgentSummary: () => request("/agent/summary"),
  setAgentAvailability: (isAvailable) =>
    request("/agent/availability", { method: "PATCH", body: { is_available: isAvailable } }),
  payVendor: (id, body) =>
    request(`/jit/orders/${id}/pay-vendor`, { method: "POST", body }),
  flagUnavailable: (id, itemId) =>
    request(`/orders/${id}/items/${itemId}/unavailable`, { method: "POST" }),
  requestItemOverage: (id, itemId, price) =>
    request(`/orders/${id}/items/${itemId}/request-overage`, { method: "POST", body: { price } }),
  decideItemOverage: (id, itemId, decision) =>
    request(`/orders/${id}/items/${itemId}/overage-decide`, { method: "POST", body: { decision } }),
  getRating: (id) => request(`/orders/${id}/rating`),
  rateAgent: (id, stars, comment) =>
    request(`/orders/${id}/rating`, { method: "POST", body: { stars, comment: comment || null } }),
  finishShopping: (id) =>
    request(`/orders/${id}/finish-shopping`, { method: "POST" }),

  myCustomerOrders: () => request("/orders/mine-customer"),
  createOrder: (body) => request("/orders", { method: "POST", body }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: "DELETE" }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
  getMarkets: (params?: { venue_type?: string }) => {
    const q = params?.venue_type ? `?venue_type=${encodeURIComponent(params.venue_type)}` : "";
    return request(`/markets${q}`);
  },
  getShopActivity: () => request("/markets/activity"),
  getMarketVendors: (marketId: string) => request(`/markets/${marketId}/vendors`),
  createVendor: (
    marketId: string,
    body: { name: string; stall_description?: string; phone?: string; latitude?: number; longitude?: number }
  ) => request(`/markets/${marketId}/vendors`, { method: "POST", body }),
  payBalance: (id) =>
    request(`/payments/orders/${id}/pay-from-wallet`, { method: "POST" }),
  payDeposit: (id) =>
    request(`/payments/orders/${id}/deposit/pay-from-wallet`, { method: "POST" }),
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
  updateDraftOrder: (id, body) =>
    request(`/orders/${id}/draft`, { method: "PUT", body }),
  addOrderItem: (id, body) =>
    request(`/orders/${id}/items`, { method: "POST", body }),
  getAuthorization: (id) => request(`/jit/orders/${id}/authorization`),
  getPurchases: (id) => request(`/jit/orders/${id}/purchases`),
  attachPurchasePhoto: (id, transferId, photoRef) =>
    request(`/jit/orders/${id}/purchases/${transferId}/photo`, {
      method: "POST", body: { photo_ref: photoRef },
    }),

  packOrder: (id) => request(`/delivery/orders/${id}/pack`, { method: "POST" }),
  dispatchCourier: (id: string | number, courierReference?: string) =>
    request(`/delivery/orders/${id}/dispatch-courier`, {
      method: "POST",
      body: courierReference ? { courier_reference: courierReference } : {},
    }),
  addPackingPhotos: (id, refs) =>
    request(`/delivery/orders/${id}/packing-photos`, { method: "POST", body: { refs } }),
  confirmDelivery: (id) =>
    request(`/delivery/orders/${id}/confirm-delivery`, { method: "POST" }),

  applyAsAgent: (body) => request("/agent-applications", { method: "POST", body }),
  getMyAgentApplications: () => request("/agent-applications/me"),
  raiseCap: (id, extra) =>
    request(`/jit/orders/${id}/authorization/raise`, {
      method: "POST",
      body: { extra },
    }),

  getWalletBalance: () => request("/wallet"),
  fundWalletInit: (amount) =>
    request("/payments/wallet/fund/init", {
      method: "POST",
      body: { amount, origin: window.location.origin },
    }),
  fundWalletDev: (amount) =>
    request("/wallet/fund", { method: "POST", body: { amount } }),
  verifyWalletFunding: (reference) =>
    request("/payments/wallet/fund/verify", { method: "POST", body: { reference } }),
  getWalletTransactions: () => request("/wallet/transactions"),

  getAdminFloat: (marketId) =>
    request(`/admin/float${marketId ? `?market_id=${marketId}` : ""}`),
  getInFlightOrders: () => request("/admin/orders/in-flight"),
  getOrderLosses: () => request("/admin/orders/losses"),
  getUsers: () => request("/admin/users?limit=200"),
  getFlaggedUsers: () => request("/admin/users/flagged"),
  clearUserFlag: (userId) =>
    request(`/admin/users/${userId}/clear-flag`, { method: "POST" }),
  listAgents: () => request("/admin/agents"),
  getAnalytics: (days) =>
    request(`/admin/analytics${days ? `?days=${days}` : ""}`),
  listAdmins: () => request("/admin/admins"),
  addAdmin: (body: { email: string; full_name?: string; temporary_password: string }) =>
    request("/admin/admins", { method: "POST", body }),
  removeAdmin: (userId) => request(`/admin/admins/${userId}`, { method: "DELETE" }),
  changeAdminPassword: (current_password: string, new_password: string) =>
    request("/admin/me/password", { method: "POST", body: { current_password, new_password } }),
  getAgentApplications: (statusFilter?: string, kind?: "agent" | "rider") => {
    const q = new URLSearchParams();
    if (statusFilter) q.set("status", statusFilter);
    if (kind) q.set("kind", kind);
    const qs = q.toString();
    return request(`/agent-applications${qs ? `?${qs}` : ""}`);
  },
  // Public - the For Agents / For Riders pages, no sign-in.
  submitApplication: (body: {
    kind: "agent" | "rider"; full_name: string; phone: string;
    market_id?: string; area?: string; vehicle?: string; note?: string;
  }) => request("/agent-applications/public", { method: "POST", body }),
  listRiders: () => request("/admin/riders"),
  setRiderStatus: (riderId, status: "active" | "suspended") =>
    request(`/admin/riders/${riderId}`, { method: "PATCH", body: { status } }),
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

  getNotifications: () => request("/notifications"),
  markRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),

  getCallToken: (orderId) => request(`/calls/${orderId}/token`, { method: "POST" }),

  getMessages: (orderId) => request(`/orders/${orderId}/messages`),
  sendMessage: (orderId, body) =>
    request(`/orders/${orderId}/messages`, { method: "POST", body }),

  uploadChatImage: (file) => uploadToCloudinary(file),
  uploadProfilePhoto: (file) => uploadToCloudinary(file),
  uploadPackingPhoto: (file) => uploadToCloudinary(file),
  uploadPurchasePhoto: (file) => uploadToCloudinary(file),
  // Guest-friendly (get_current_user_optional backend-side) - `request`
  // already attaches a token when one exists, but works without one too.
  trackLocation: (label: string, latitude?: number, longitude?: number) =>
    request("/locations/track", { method: "POST", body: { label, latitude, longitude } }),
  getPopularLocations: () => request("/locations/popular"),
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
