"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useAuth } from "@/components/AuthProvider";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Inline phone/OTP (+ optional name) for guest Place order.
 * Calls onSuccess after token is stored and profile has a full_name.
 */
export default function AuthSheet({
  open,
  onClose,
  onSuccess,
  title = "Sign in to place your order",
  subtitle = "We only ask for your phone when money is involved — your list stays ready.",
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { handleLoggedIn, setUser } = useAuth();
  const [phone, setPhone] = useState("+234");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [devOtp, setDevOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("phone");
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

  async function requestOtp() {
    setError("");
    setBusy(true);
    try {
      const data = await api.requestOtp(phone);
      if (data?.dev_otp) setDevOtp(data.dev_otp);
      setExpiresAt(data?.expires_in_seconds ? Date.now() + data.expires_in_seconds * 1000 : null);
      setCode("");
      setStep("code");
    } catch {
      setError("Could not send code. Check the number and the server.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setBusy(true);
    try {
      const data = await api.verifyOtp(phone, code);
      handleLoggedIn(data.access_token);
      const me = await api.me();
      await finishWithUser(me);
    } catch {
      setError("Wrong or expired code. Request a new one.");
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
      <div className="relative z-[1] w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="auth-sheet-title" className="text-xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

        <div className="mt-5 space-y-3">
          {step === "phone" && (
            <>
              <Input type="tel" placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Button onClick={requestOtp} busy={busy} fullWidth>
                Send code
              </Button>
            </>
          )}

          {step === "code" && (
            <>
              <p className="text-sm text-slate-600">Enter the code sent to {phone}.</p>
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
                onClick={() => {
                  setStep("phone");
                  setExpiresAt(null);
                  setDevOtp("");
                }}
                fullWidth
              >
                Use a different number
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
