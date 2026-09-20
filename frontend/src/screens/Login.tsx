'use client';

import { useState, useEffect } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Input from "@/components/Input";
import OtpInput from "@/components/OtpInput";
import OtpResend from "@/components/OtpResend";
import GoogleSignInButton, { GOOGLE_SIGN_IN_ENABLED } from "@/components/GoogleSignInButton";
import WavyDivider from "@/components/WavyDivider";
import logo from "@/assets/logo.png";

const isDev = process.env.NODE_ENV !== "production";

// Only meaningful for an identifier that has never signed up before - the
// backend only honors `role` on account CREATION (see auth/service.py's
// get_or_create_user), and only outside production. Picking a role for an
// identifier that already has an account is silently ignored server-side, so
// this is for spinning up a fresh test account per role, not for changing
// an existing one.
//
// No "Agent" option here on purpose: an AGENT-role user also needs a
// matching Agent record (assigned market, availability) that only the
// admin-approved agent_applications workflow creates - self-assigning the
// role here would produce a half-provisioned account that 404s the moment
// it tries to do anything agent-shaped (e.g. toggling duty). Get a real
// agent account by signing up as a customer, then applying from Settings -
// or, for instant test accounts, POST /dev/seed on the backend.
const DEV_ROLES = [
  { key: "customer", label: "Customer" },
  { key: "admin", label: "Admin" },
];

function SmsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 5.5h16a1 1 0 011 1v10a1 1 0 01-1 1H8.5L4 21v-3.5H4a1 1 0 01-1-1v-10a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.03 2.5c-5.26 0-9.53 4.27-9.53 9.53 0 1.68.44 3.3 1.28 4.73L2.5 21.5l4.86-1.27a9.5 9.5 0 004.67 1.23h.01c5.26 0 9.53-4.27 9.53-9.53 0-2.54-.99-4.93-2.79-6.73a9.47 9.47 0 00-6.75-2.7zm0 17.44h-.01a7.9 7.9 0 01-4.02-1.1l-.29-.17-2.88.75.77-2.81-.19-.29a7.9 7.9 0 01-1.21-4.19c0-4.37 3.56-7.92 7.94-7.92a7.9 7.9 0 015.61 2.32 7.87 7.87 0 012.32 5.6c0 4.37-3.56 7.92-7.94 7.92l.9-.11z"
      />
      <path
        fill="currentColor"
        d="M9.6 7.6c-.18-.4-.37-.4-.54-.41h-.46a.9.9 0 00-.65.3c-.22.24-.85.83-.85 2.03s.87 2.36 1 2.52c.12.17 1.68 2.7 4.15 3.68 2.05.81 2.47.65 2.92.61.45-.04 1.44-.59 1.65-1.16.2-.57.2-1.05.14-1.16-.06-.1-.23-.17-.46-.29-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.36-.77-1.86z"
      />
    </svg>
  );
}

const CHANNELS = [
  { key: "sms", label: "SMS", Icon: SmsIcon },
  { key: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon },
] as const;

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function looksLikeEmail(v: string) {
  return v.includes("@");
}

// onLoggedIn is a function App passes in; we call it with the token on success.
function Login({ onLoggedIn }: any) {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("+234");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [otpSentKey, setOtpSentKey] = useState(0); // bumps on every send: restarts the fallback countdown
  const [fallbackAfter, setFallbackAfter] = useState(45);
  const [code, setCode] = useState("");
  const [step, setStep] = useState("identifier");
  const [devOtp, setDevOtp] = useState(""); // dev-only: show the code on screen
  const [devRole, setDevRole] = useState("customer"); // dev-only: role for a brand-new account
  const [sentChannel, setSentChannel] = useState<string>("");
  // When the current code expires (epoch ms), and a live clock reading to
  // count down against - both null until a code has actually been sent.
  const [expiresAt, setExpiresAt] = useState<any>(null);
  const [now, setNow] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const identifier = mode === "phone" ? phone : email;

  async function handleGoogleCredential(credential: string) {
    setError(""); setBusy(true);
    try {
      const data = await api.googleAuth(credential);
      localStorage.setItem("qyka_token", data.access_token);
      onLoggedIn(data.access_token);
    } catch {
      setError("Google sign-in failed. Try again.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const remainingMs = expiresAt != null && now != null ? expiresAt - now : null;
  const codeExpired = remainingMs != null && remainingMs <= 0;

  function handleResent(data: any) {
    if (data?.dev_otp) setDevOtp(data.dev_otp);
    setSentChannel(data?.channel || sentChannel);
    setExpiresAt(data?.expires_in_seconds ? Date.now() + data.expires_in_seconds * 1000 : null);
    setFallbackAfter(data?.fallback_after_seconds ?? 45);
    setOtpSentKey((k) => k + 1);
    setCode("");
  }

  async function requestOtp() {
    setError(""); setBusy(true);
    try {
      const data = await api.requestOtp(identifier, mode === "phone" ? channel : undefined);
      if (data && data.dev_otp) setDevOtp(data.dev_otp);
      setSentChannel(data?.channel || (mode === "phone" ? channel : "email"));
      setExpiresAt(data && data.expires_in_seconds ? Date.now() + data.expires_in_seconds * 1000 : null);
      setFallbackAfter(data?.fallback_after_seconds ?? 45);
      setOtpSentKey((k) => k + 1);
      setCode("");
      setStep("code");
    } catch {
      setError(`Could not send a code. Check the ${mode === "phone" ? "number" : "email"} and the server.`);
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(""); setBusy(true);
    try {
      const data = await api.verifyOtp(
        identifier,
        code,
        isDev && devRole !== "customer" ? devRole : undefined
      );
      localStorage.setItem("qyka_token", data.access_token);
      onLoggedIn(data.access_token); // tell App we're in
    } catch {
      setError("Wrong or expired code. Request a new one.");
      setBusy(false);
    }
  }

  return (
    <div>
      <Image src={logo} alt="" className="mb-4 h-10 w-auto object-contain" priority />
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">Welcome back</p>
      {/* `font-display` (Bricolage Grotesque) - this was `font-sans` (DM
          Sans, the body text font), so the page's main heading was set in
          plain body type instead of the display face every other header
          in the app uses. */}
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Sign in to Qyka.
      </h1>
      <p className="mt-3 text-muted">
        Recycled-float grocery shopping, run by real market agents.
      </p>

      <div className="mt-6">
        {step === "identifier" && (
          <div className="space-y-3">
            {GOOGLE_SIGN_IN_ENABLED && (
              <>
                <GoogleSignInButton onCredential={handleGoogleCredential} />
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-faint">
                  <span className="flex-1 border-t border-dashed border-line-strong" />
                  or
                  <span className="flex-1 border-t border-dashed border-line-strong" />
                </div>
              </>
            )}

            {mode === "phone" ? (
              <Input
                type="tel"
                placeholder="+234..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            ) : (
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <button
              type="button"
              onClick={() => setMode(mode === "phone" ? "email" : "phone")}
              className="text-sm font-semibold text-brand-orange hover:underline"
            >
              {mode === "phone" ? "Use email instead?" : "Use phone instead?"}
            </button>

            {mode === "phone" && (
              <div>
                {/* Wavy trial - guaranteed visible regardless of Google
                    sign-in config, unlike the "or" divider above. */}
                <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-faint">
                  <WavyDivider />
                  Send code via
                  <WavyDivider />
                </div>
                <div className="flex gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChannel(c.key)}
                      className={
                        "flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border px-3 text-sm font-bold transition " +
                        (channel === c.key
                          ? "border-brand-orange bg-brand-orange text-[#1A1A1A] shadow-sm"
                          : "border-line-strong bg-surface text-ink/60 hover:text-ink")
                      }
                    >
                      <c.Icon className="h-4 w-4 shrink-0" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dev-only: only takes effect for an identifier that has never
                signed up before - the backend ignores it for an existing
                account. Lets you spin up an agent/admin test login without
                curl or hand-editing the database. */}
            {isDev && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-faint">
                  Dev only — role for a brand-new account
                </p>
                <div className="flex gap-2">
                  {DEV_ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setDevRole(r.key)}
                      className={
                        "flex-1 rounded-2xl px-3 py-1.5 text-sm font-bold transition " +
                        (devRole === r.key
                          ? "bg-brand-orange text-[#1A1A1A]"
                          : "bg-sunken text-ink hover:bg-[#e8e4df]")
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={requestOtp}
              busy={busy}
              disabled={!identifier.trim() || (mode === "email" && !looksLikeEmail(email))}
              fullWidth
            >
              Send code
            </Button>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <p className="text-muted">
              Enter the code sent via {sentChannel === "whatsapp" ? "WhatsApp" : sentChannel === "email" ? "email" : sentChannel === "voice" ? "phone call" : "SMS"} to{" "}
              <span className="font-semibold text-ink">{identifier}</span>.
            </p>
            {devOtp && (
              <p className="text-sm text-muted">
                Dev code: <b className="text-ink">{devOtp}</b>
              </p>
            )}
            {isDev && devRole !== "customer" && (
              <p className="text-sm font-semibold text-brand-orange">
                Signing in as: {DEV_ROLES.find((r) => r.key === devRole)?.label}
                {" "}(only applies if this account is brand new)
              </p>
            )}
            {remainingMs != null && (
              <p className={"text-sm font-semibold " + (codeExpired ? "text-red-600" : "text-muted")}>
                {codeExpired
                  ? "Code expired — request a new one."
                  : `Code expires in ${formatRemaining(remainingMs)}`}
              </p>
            )}
            <OtpInput value={code} onChange={setCode} autoFocus />
            {mode === "phone" && (
              <OtpResend
                identifier={identifier}
                sentChannel={sentChannel}
                sentKey={otpSentKey}
                fallbackAfterSeconds={fallbackAfter}
                onSent={handleResent}
              />
            )}
            <Button onClick={verifyOtp} busy={busy} disabled={code.length !== 6} fullWidth>
              Verify
            </Button>
            <Button
              variant="neutral"
              onClick={() => { setStep("identifier"); setExpiresAt(null); setDevOtp(""); }}
              fullWidth
            >
              Use a different {mode === "phone" ? "number" : "email"}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}

export default Login;
