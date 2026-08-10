import { useState, useEffect } from "react";
import Splash from "./Splash";
import Login from "./Login";
import ProfileSetup from "./ProfileSetup";
import Orders from "./Orders";
import CustomerHome from "./CustomerHome";
import AdminHome from "./AdminHome";
import TopBar from "./components/TopBar";
import Button from "./components/Button";
import { api, setUnauthorizedHandler } from "./api";

// Instant-resume cache for the agent/customer view switch - the backend's
// on_duty (see markets.service.set_duty) is the real source of truth,
// reconciled right after login below, but reading this first avoids a
// flash of the wrong dashboard on every refresh.
const DUTY_KEY = "quika_agent_on_duty";

function App() {
  const [token, setToken] = useState(localStorage.getItem("quika_token"));
  const [user, setUser] = useState(null);      // { id, role, phone, ... }
  const [loading, setLoading] = useState(!!token); // if we have a token, we're checking it
  // Only the logged-out flow ever needs the splash — a returning session
  // with a valid token drops straight into the app, never sees it again.
  const [splashDismissed, setSplashDismissed] = useState(!!token);
  // Agent/customer view switch - only ever meaningful for an AGENT-role
  // account (see roleSwitch below). Defaults true: a freshly promoted or
  // never-toggled agent starts in their agent view.
  const [onDuty, setOnDuty] = useState(() => {
    const stored = localStorage.getItem(DUTY_KEY);
    return stored === null ? true : stored === "true";
  });
  const [dutyBusy, setDutyBusy] = useState(false);
  const [dutyError, setDutyError] = useState("");

  // Registered once - any 401 from anywhere in the app (a poll included)
  // routes through here instead of each screen needing its own check. See
  // the comment on setUnauthorizedHandler in api.js. handleLogout is a
  // hoisted function declaration, so this is safe even though it's defined
  // later in the component body; its behavior never depends on stale
  // closure state (it only calls stable useState setters), so registering
  // once on mount is enough - no need to re-register on every render.
  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
  }, []);

  // Whenever we have a token, find out who it belongs to.
  useEffect(() => {
    if (!token) { setUser(null); return; }
    setLoading(true);
    api.me()
      .then(setUser)
      .catch(() => handleLogout())   // bad/expired token -> log out
      .finally(() => setLoading(false));
  }, [token]);

  // Reconcile the cached guess above with the backend's real on_duty, once
  // we know the account is actually an agent.
  useEffect(() => {
    if (!user || (user.role || "").toUpperCase() !== "AGENT") return;
    api.getMyAgentStatus()
      .then((s) => {
        setOnDuty(s.on_duty);
        localStorage.setItem(DUTY_KEY, String(s.on_duty));
      })
      .catch(() => {});
  }, [user]);

  async function handleToggleDuty(nextMode) {
    setDutyError(""); setDutyBusy(true);
    try {
      const result = await api.setAgentDuty(nextMode === "agent");
      setOnDuty(result.on_duty);
      localStorage.setItem(DUTY_KEY, String(result.on_duty));
    } catch (e) {
      setDutyError("Could not switch: " + e.message);
    } finally {
      setDutyBusy(false);
    }
  }

  function handleLoggedIn(t) {
    localStorage.setItem("quika_token", t);
    setToken(t);           // triggers the effect above, which loads the user
  }

  function handleLogout() {
    localStorage.removeItem("quika_token");
    localStorage.removeItem(DUTY_KEY);
    setToken(null);
    setUser(null);
    setSplashDismissed(false); // next login starts from the splash again
  }

  // Authenticated dashboards render their own full-page shell (sidebar/
  // drawer/etc. via AppShell) — no extra wrapper here, or the dashboard's
  // own chrome would double up with this one. Only the pre-dashboard states
  // (logged out, loading, or a role without a real dashboard yet) use the
  // simple centered layout below.
  if (token && !loading && user) {
    // Anyone with no name saved yet completes their profile exactly once
    // before ever reaching a dashboard. ProfileSetup itself decides what
    // that looks like: a brand-new customer gets the "what would you like
    // to do" choice (with a path into becoming an agent); an already-agent
    // account (role fixed by an admin, e.g. via dev-seed) just gets a plain
    // name prompt, since choosing a role again wouldn't make sense.
    const role = (user.role || "").toUpperCase();
    if ((role === "CUSTOMER" || role === "AGENT") && !user.full_name) {
      return <ProfileSetup user={user} onDone={setUser} />;
    }
    if (role === "AGENT") {
      // Shown ONLY to vetted agents - a plain customer gets no roleSwitch
      // prop at all, so Sidebar/MobileDrawer render nothing extra for them.
      const roleSwitch = {
        mode: onDuty ? "agent" : "customer",
        onToggle: handleToggleDuty,
        busy: dutyBusy,
        error: dutyError,
      };
      return onDuty
        ? <Orders user={user} onLogout={handleLogout} onUserUpdated={setUser} roleSwitch={roleSwitch} />
        : <CustomerHome user={user} onLogout={handleLogout} onUserUpdated={setUser} roleSwitch={roleSwitch} />;
    }
    if (role === "CUSTOMER") return <CustomerHome user={user} onLogout={handleLogout} onUserUpdated={setUser} />;
    if (role === "ADMIN") return <AdminHome user={user} onLogout={handleLogout} onUserUpdated={setUser} />;
  }

  if (!token && !splashDismissed) {
    return <Splash onGetStarted={() => setSplashDismissed(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 py-6">
        {!token && <Login onLoggedIn={handleLoggedIn} />}

        {token && loading && (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
            <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p>Loading…</p>
          </div>
        )}

        {token && !loading && user && (
          <div className="space-y-4 text-center">
            <p className="text-slate-600">Unknown role: {user.role}</p>
            <Button variant="neutral" onClick={handleLogout}>Log out</Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
