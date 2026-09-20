"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Input from "@/components/Input";
import OtpInput from "@/components/OtpInput";
import OtpResend from "@/components/OtpResend";
import GoogleSignInButton, { GOOGLE_SIGN_IN_ENABLED } from "@/components/GoogleSignInButton";
import { useAuth } from "@/components/AuthProvider";

const CHANNELS = [
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function looksLikeEmail(v: string) {
  return v.includes("@");
}

/**
 * Inline phone/email + OTP (+ optional name) for guest Place order.
 * Calls onSuccess after token is stored and profile has a full_name.
 */
export default function AuthSheet({
  open,
  onClose,
  onSuccess,
  title = "Sign in to place your order",
  subtitle = "We only ask for a contact when money is involved — your list stays ready.",
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { handleLoggedIn, setUser } = useAuth();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("+234");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [otpSentKey, setOtpSentKey] = useState(0); // bumps on every send: restarts the fallback countdown
  const [fallbackAfter, setFallbackAfter] = useState(45);
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [step, setStep] = useState<"identifier" | "code" | "name">("identifier");
  const [devOtp, setDevOtp] = useState("");
  const [sentChannel, setSentChannel] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const identifier = mode === "phone" ? phone : email;

  useEffect(() => {
    if (!open) {
      setStep("identifier");
      setCode("");
      setError("");
      setDevOtp("");
      setExpiresAt(null);
      setFullName("");
    }
  }, [open]);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const remainingMs = expiresAt != null && now != null ? expiresAt - now : null;
  const codeExpired = remainingMs != null && remainingMs <= 0;

  async function finishWithUser(user: any) {
    setUser(user);
    if (!user?.full_name) {
      setStep("name");
      setBusy(false);
      return;
    }
    onSuccess();
  }

  function handleResent(data: any) {
    if (data?.dev_otp) setDevOtp(data.dev_otp);
    setSentChannel(data?.channel || sentChannel);
    setExpiresAt(data?.expires_in_seconds ? Date.now() + data.expires_in_seconds * 1000 : null);
    setFallbackAfter(data?.fallback_after_seconds ?? 45);
    setOtpSentKey((k) => k + 1);
    setCode("");
  }

  async function requestOtp() {
    setError("");
    setBusy(true);
    try {
      const data = await api.requestOtp(identifier, mode === "phone" ? channel : undefined);
      if (data?.dev_otp) setDevOtp(data.dev_otp);
      setSentChannel(data?.channel || (mode === "phone" ? channel : "email"));
      setExpiresAt(data?.expires_in_seconds ? Date.now() + data.expires_in_seconds * 1000 : null);
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
    setError("");
    setBusy(true);
    try {
      const data = await api.verifyOtp(identifier, code);
      handleLoggedIn(data.access_token);
      const me = await api.me();
      await finishWithUser(me);
    } catch {
      setError("Wrong or expired code. Request a new one.");
      setBusy(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError("");
    setBusy(true);
    try {
      const data = await api.googleAuth(credential);
      handleLoggedIn(data.access_token);
      const me = await api.me();
      await finishWithUser(me);
    } catch {
      setError("Google sign-in failed. Try again.");
      setBusy(false);
    }
  }

  async function saveName() {
    const name = fullName.trim();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const me = await api.updateProfile({ full_name: name });
      setUser(me);
      onSuccess();
    } catch (e: any) {
      setError("Could not save name: " + (e?.message || "try again"));
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="auth-sheet-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative z-[1] w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl">
        <h2 id="auth-sheet-title" className="font-serif text-2xl italic tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        <div className="mt-5 space-y-3">
          {step === "identifier" && (
            <>
              {GOOGLE_SIGN_IN_ENABLED && (
                <>
                  <GoogleSignInButton onCredential={handleGoogleCredential} />
                  <div className="flex items-center gap-3 py-1 text-xs font-semibold uppercase tracking-wide text-faint">
                    <span className="flex-1 border-t border-dashed border-line-strong" />
                    or
                    <span className="flex-1 border-t border-dashed border-line-strong" />
                  </div>
                </>
              )}

              {mode === "phone" ? (
                <Input type="tel" placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              ) : (
                <Input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}

              {mode === "phone" && (
                <div className="flex gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChannel(c.key)}
                      className={
                        "flex-1 rounded-full border px-3 py-1.5 text-sm font-bold transition " +
                        (channel === c.key
                          ? "border-brand-orange bg-brand-orange text-[#1A1A1A]"
                          : "border-line-strong text-ink/60 hover:text-ink")
                      }
                    >
                      {c.label}
                    </button>
                  ))}
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
            </>
          )}

          {step === "code" && (
            <>
              <p className="text-sm text-slate-600">
                Enter the code sent via {sentChannel === "whatsapp" ? "WhatsApp" : sentChannel === "email" ? "email" : sentChannel === "voice" ? "phone call" : "SMS"} to{" "}
                <span className="font-semibold text-ink">{identifier}</span>.
              </p>
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
                onClick={() => {
                  setStep("identifier");
                  setExpiresAt(null);
                  setDevOtp("");
                }}
                fullWidth
              >
                Use a different {mode === "phone" ? "number" : "email"}
              </Button>
            </>
          )}

          {step === "name" && (
            <>
              <p className="text-sm text-slate-600">What should we call you?</p>
              <Input
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Button onClick={saveName} busy={busy} fullWidth>
                Continue to place order
              </Button>
            </>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            Keep editing list
          </button>
        </div>
      </div>
    </div>
  );
}
