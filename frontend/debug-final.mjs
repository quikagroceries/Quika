import { chromium } from "playwright";
const SS = (name) => `/private/tmp/claude-501/-Users-george-Documents-Projects-Quika/a85c9964-f381-494d-b034-53be167173ba/scratchpad/${name}.png`;
const market = { id: "m1", name: "Balogun Market", city: "Lagos Island", state: "Lagos", venue_type: "local_market", is_active: true };
const order = {
  id: "ofd-1", status: "out_for_delivery", market_id: "m1", agent_id: "agent-1",
  created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  items: [], items_total: "0", combined_fee: "0", emtl_total: "0", transfer_fees_total: "0",
  delivery_fee: "0", grand_total: "4950", estimated_value: "5000", deposit_amount: "0", deposit_paid_at: null,
};
const now = Date.now();
const day = 86400_000;
const transactions = [
  { id: "t1", direction: "credit", amount: "5000.00", balance_after: "15250.00", order_id: null, note: null, created_at: new Date(now - 2 * 3600_000).toISOString() },
  { id: "t2", direction: "debit", amount: "2500.00", balance_after: "10250.00", order_id: "o-99", note: null, created_at: new Date(now - 5 * 3600_000).toISOString() },
  { id: "t3", direction: "credit", amount: "1200.00", balance_after: "12750.00", order_id: "o-98", note: "Refund - item dropped", created_at: new Date(now - day - 2 * 3600_000).toISOString() },
  { id: "t4", direction: "credit", amount: "10000.00", balance_after: "11550.00", order_id: null, note: null, created_at: new Date(now - 3 * day).toISOString() },
];
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", String(e)));
await page.addInitScript(() => localStorage.setItem("quika_token", "fake-token"));
await page.route("http://localhost:8000/**", async (route) => {
  const url = new URL(route.request().url()); const path = url.pathname;
  const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  if (path === "/auth/me") return json({ id: "u1", role: "CUSTOMER", full_name: "Ada" });
  if (path === "/markets") return json([market]);
  if (path === "/orders/mine-customer") return json([order]);
  if (path === "/wallet") return json({ balance: 15250 });
  if (path === "/wallet/transactions") return json(transactions);
  if (path === "/notifications") return json([]);
  return json({});
});

await page.goto("http://localhost:3003/wallet", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Fund wallet", { timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: SS("final-wallet") });

await page.goto("http://localhost:3003/history", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await page.screenshot({ path: SS("final-history-banner") });

await page.goto("http://localhost:3003/settings", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Settings", { timeout: 20000 });
await page.waitForTimeout(300);
await page.screenshot({ path: SS("final-settings-banner") });

console.log("done");
await browser.close();
