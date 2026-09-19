import React, { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../lib/api";
import {
  MobileScreen, Section, Field, TextInput, PrimaryButton, SecondaryButton, Pill,
} from "./brandMobileUi";

// Screen 1e — point of contact. Phone and name save straight to brand_profiles.
// The business email goes through the same real OTP pair BrandSettings.jsx uses
// (/otp/send then /otp/verify) before it's written.
//
// Note: the backend stores no "email verified" boolean on brand_profiles, so this
// screen shows the email as verified only for the session in which the OTP was
// actually confirmed — it does not claim a verified state the row can't back up.

export default function ContactScreen({ onBack, profile, saving, onSave }) {
  const [name, setName] = useState(profile.pocName || "");
  const [designation, setDesignation] = useState(profile.pocDesignation || "");
  const [phone, setPhone] = useState(profile.pocPhone || "");
  const [email, setEmail] = useState(profile.pocEmail || "");

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);

  const emailChanged = email.trim() !== (profile.pocEmail || "").trim();
  const emailConfirmed = verifiedEmail && verifiedEmail === email.trim();

  const sendOtp = async () => {
    const value = email.trim();
    if (!value.includes("@")) {
      toast.error("Enter a valid business email.");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await api.post("/otp/send", { target: "email", value });
      if (res.data?.ok) {
        setOtpOpen(true);
        toast.success(`Code sent to ${value}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Couldn't send the code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const value = email.trim();
    setVerifying(true);
    try {
      const res = await api.post("/otp/verify", { target: "email", value, code: otp.trim() });
      if (res.data?.ok) {
        const ok = await onSave({ pocEmail: value }, { silent: true });
        if (ok) {
          setVerifiedEmail(value);
          setOtpOpen(false);
          setOtp("");
          toast.success("Email verified and linked.");
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || "That code didn't work.");
    } finally {
      setVerifying(false);
    }
  };

  const detailsDirty =
    name !== (profile.pocName || "") ||
    designation !== (profile.pocDesignation || "") ||
    phone !== (profile.pocPhone || "");

  return (
    <MobileScreen
      title="Point of contact"
      onBack={onBack}
      footer={
        <PrimaryButton
          disabled={saving || !detailsDirty}
          onClick={() => onSave({ pocName: name, pocDesignation: designation, pocPhone: phone })}
        >
          {saving ? "Saving…" : "Save contact"}
        </PrimaryButton>
      }
    >
      <Section hint="Support and escrow use these details to reach you.">
        <Field label="Contact name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </Field>

        <Field label="Designation">
          <TextInput
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Founder, Marketing head…"
          />
        </Field>

        <Field
          label="Mobile number"
          hint="Stored as you type it — no code needed. Used only if support or escrow needs to reach you."
        >
          <TextInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 99999 88800"
            inputMode="tel"
          />
        </Field>
      </Section>

      <div className="border-t border-gray-100" />

      <Section
        title="Business email"
        hint="Escrow receipts, campaign approvals and dispute notices all go here."
      >
        <div className="flex items-center gap-2 mb-2">
          {emailConfirmed
            ? <Pill tone="green">Verified</Pill>
            : <Pill tone="amber">{emailChanged ? "Not verified yet" : "Verify to confirm"}</Pill>}
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <TextInput
              value={email}
              onChange={(e) => { setEmail(e.target.value); setOtpOpen(false); }}
              placeholder="ops@yourbrand.com"
              inputMode="email"
            />
          </div>
          <SecondaryButton onClick={sendOtp} disabled={sendingOtp || !email.trim()}>
            {sendingOtp ? "Sending…" : otpOpen ? "Resend" : "Verify"}
          </SecondaryButton>
        </div>

        {otpOpen && (
          <div className="mt-3 rounded-2xl border border-gray-200 p-4">
            <p className="text-xs text-gray-600 mb-3">
              Enter the 6-digit code we emailed to {email.trim()}.
            </p>
            <div className="flex gap-2">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                className="flex-1 h-11 rounded-xl border border-gray-200 bg-gray-50 text-center text-base font-semibold tracking-[0.3em] text-gray-900 focus:outline-none focus:border-violet-500 focus:bg-white"
              />
              <button
                onClick={verifyOtp}
                disabled={verifying || otp.length !== 6}
                className="h-11 px-5 rounded-xl bg-violet-600 text-white font-bold text-sm disabled:opacity-50"
              >
                {verifying ? "Checking…" : "Confirm"}
              </button>
            </div>
          </div>
        )}
      </Section>
    </MobileScreen>
  );
}
