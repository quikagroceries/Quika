'use client';

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import Input from "@/components/Input";
import OtpInput from "@/components/OtpInput";

const isDev = process.env.NODE_ENV !== "production";

function looksLikeEmail(v: string) {
  return v.includes("@");
}

// Shown exactly once, right after first login, to anyone with no name saved
// yet. A brand-new signup is always role=CUSTOMER (the only role OTP verify
// self-assigns), so this is now just a name (+ optional address, + optional
// email) prompt. Becoming an agent is its own admin-approved application,
// reachable from Settings — never self-granted here.
function ProfileSetup({ user, onDone }: any) {
  const isCustomer = (user.role || "").toUpperCase() === "CUSTOMER";

  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Email is optional here and independent of the main "Continue" action -
  // a phone signup has no email on file yet (see auth/models.py::User), so
  // this offers to add + verify one via the same OTP flow sign-in uses,
  // without blocking anyone who'd rather skip it and add it later from
  // Settings.
  const [email, setEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">(
    user.email ? "verified" : "idle"
  );
  const [emailCode, setEmailCode] = useState("");
  const [emailDevOtp, setEmailDevOtp] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");

  async function handleSendEmailCode() {
    setEmailError("");
    setEmailBusy(true);
    try {
      const data = await api.requestOtp(email.trim());
      if (data && data.dev_otp) setEmailDevOtp(data.dev_otp);
      setEmailCode("");
      setEmailStep("sent");
    } catch (e: any) {
      setEmailError("Could not send a code. Check the address and try again.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleVerifyEmailCode() {
    setEmailError("");
    setEmailBusy(true);
    try {
      await api.linkEmail(email.trim(), emailCode);
      setEmailStep("verified");
    } catch (e: any) {
      setEmailError("Wrong or expired code. Request a new one.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleContinue() {
    setError("");
    setBusy(true);
    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        ...(isCustomer ? { default_delivery_address: address.trim() || null } : {}),
      });
      onDone(updated);
    } catch (e: any) {
      setError("Could not save: " + e.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        Complete your profile
      </h1>
      <p className="mb-6 text-muted">
        Just a couple of details before we get you shopping.
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-ink">Full name</span>
          <Input
            placeholder="e.g. Ada Obi"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

        {isCustomer && (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Delivery address <span className="font-normal text-faint">(optional)</span>
            </span>
            <Input
              placeholder="e.g. 12 Allen Avenue, Ikeja"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
        )}

        {!user.email && (
          <div>
            <span className="mb-1 block text-sm font-semibold text-ink">
              Email <span className="font-normal text-faint">(optional)</span>
            </span>

            {emailStep === "verified" ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-green">
                ✓ {email || "Email"} verified
              </p>
            ) : emailStep === "sent" ? (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Enter the code sent to <span className="font-semibold text-ink">{email}</span>.
                </p>
                {isDev && emailDevOtp && (
                  <p className="text-sm text-muted">
                    Dev code: <b className="text-ink">{emailDevOtp}</b>
                  </p>
                )}
                <OtpInput value={emailCode} onChange={setEmailCode} autoFocus />
                <div className="flex gap-2">
                  <Button
                    variant="neutral"
                    onClick={() => setEmailStep("idle")}
                    disabled={emailBusy}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyEmailCode}
                    busy={emailBusy}
                    disabled={emailCode.length !== 6}
                    fullWidth
                  >
                    Verify email
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="neutral"
                  onClick={handleSendEmailCode}
                  busy={emailBusy}
                  disabled={!looksLikeEmail(email)}
                >
                  Send code
                </Button>
              </div>
            )}
            {emailError && (
              <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{emailError}</p>
            )}
          </div>
        )}

        <Button
          onClick={handleContinue}
          busy={busy}
          disabled={!fullName.trim()}
          fullWidth
          className="mt-2"
        >
          Continue
        </Button>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {isCustomer && (
        <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
          Want to shop for Qyka at a market?{" "}
          <Link href="/settings" className="font-semibold text-brand-orange hover:underline">
            Apply as an agent →
          </Link>
        </p>
      )}
    </div>
  );
}

export default ProfileSetup;
