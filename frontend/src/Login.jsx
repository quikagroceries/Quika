import { useState, useEffect } from "react";
import { api } from "./api";
import Button from "./components/Button";
import Card from "./components/Card";
import Input from "./components/Input";

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// onLoggedIn is a function App passes in; we call it with the token on success.
function Login({ onLoggedIn }) {
  const [phone, setPhone] = useState("+234");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone");
  const [devOtp, setDevOtp] = useState(""); // dev-only: show the code on screen
  // When the current code expires (epoch ms), and a live clock reading to
  // count down against - both null until a code has actually been sent.
  // Seeded null (never Date.now() during render) - the epoch is only ever
  // set inside requestOtp, an event handler, which is a safe place to read
  // the clock; `now` is filled in by the interval below, same pattern as
  // PackagingPanel's packing-window countdown.
  const [expiresAt, setExpiresAt] = useState(null);
  const [now, setNow] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Mirrors PackagingPanel's countdown: no synchronous setState in the
  // effect body (only inside the interval callback, which fires later) -
  // the first real reading lands within a second of the code being sent,
  // fine for a soft countdown.
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const remainingMs = expiresAt != null && now != null ? expiresAt - now : null;
  const codeExpired = remainingMs != null && remainingMs <= 0;

  async function requestOtp() {
    setError(""); setBusy(true);
    try {
      const data = await api.requestOtp(phone);
      // In development your backend returns the code; show it so you can test.
      if (data && data.dev_otp) setDevOtp(data.dev_otp);
      setExpiresAt(data && data.expires_in_seconds ? Date.now() + data.expires_in_seconds * 1000 : null);
      setCode("");
      setStep("code");
    } catch {
      setError("Could not send code. Check the number and the server.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(""); setBusy(true);
    try {
      const data = await api.verifyOtp(phone, code);
      localStorage.setItem("quika_token", data.access_token);
      onLoggedIn(data.access_token); // tell App we're in
    } catch {
      setError("Wrong or expired code. Request a new one.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">
        Welcome to Quika
      </h1>
      <p className="mb-8 text-slate-500">
        Recycled-float grocery shopping, run by real market agents.
      </p>

      <Card>
        {step === "phone" && (
          <div className="space-y-3">
            <p className="text-slate-600">Enter your phone number to get a code.</p>
            <Input
              type="tel"
              placeholder="+234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button onClick={requestOtp} busy={busy} fullWidth>
              Send code
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <p className="text-slate-600">Enter the code sent to {phone}.</p>
            {devOtp && (
              <p className="text-sm text-slate-500">
                Dev code: <b className="text-slate-700">{devOtp}</b>
              </p>
            )}
            {remainingMs != null && (
              <p className={"text-sm font-semibold " + (codeExpired ? "text-red-600" : "text-slate-500")}>
                {codeExpired
                  ? "Code expired — request a new one."
                  : `Code expires in ${formatRemaining(remainingMs)}`}
              </p>
            )}
            <Input
              type="text"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="tracking-widest"
            />
            <Button onClick={verifyOtp} busy={busy} fullWidth>
              Verify
            </Button>
            <Button
              variant="neutral"
              onClick={() => { setStep("phone"); setExpiresAt(null); setDevOtp(""); }}
              fullWidth
            >
              Use a different number
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
      </Card>
    </div>
  );
}

export default Login;
