import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Mail, ExternalLink } from "lucide-react";
import { MobileScreen, Section, Card, Pill } from "./brandMobileUi";

// Screen 1g — the same policy copy the desktop settings "Privacy & terms" tab
// carries. This content is genuinely static on both platforms; nothing here is
// stubbed in place of an API.

export default function LegalScreen({ onBack }) {
  return (
    <MobileScreen title="Privacy & terms" onBack={onBack}>
      <Section>
        <Card className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Shield size={16} className="text-violet-600" />
            <h3 className="text-sm font-bold text-gray-900">Privacy policy</h3>
            <Pill tone="green">GDPR & DPDP</Pill>
            <Pill tone="violet"><Lock size={9} /> Secure storage</Pill>
          </div>
          <p className="text-xs text-gray-600 mt-2.5 leading-relaxed">
            We store your company and KYC details to verify your business and run escrow.
            They aren't sold, and creators only see what's on your public profile.
          </p>
          <Link
            to="/privacy-policy"
            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 mt-3"
          >
            Read the full policy <ExternalLink size={11} />
          </Link>
        </Card>
      </Section>

      <Section className="pt-0">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900">Escrow & payment terms</h3>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            Every campaign runs through our neutral escrow system, so neither side holds the
            other's money.
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs font-bold text-gray-900">Zero middlemen markup</div>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                What you quote is what the creator receives.
              </p>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">Release timeline</div>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                UPI and NEFT payouts are processed within 48–72 hours of work verification.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      <Section className="pt-0">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900">Disputes & cancellation</h3>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            If a brand asks for revisions outside the original brief, or a creator misses the
            agreed timeframe, either side can raise a dispute. Support reviews the campaign chat,
            the brief and the draft assets within 24 hours and decides a fair resolution or a
            partial refund.
          </p>
        </Card>
      </Section>

      <Section className="pt-0 pb-8">
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-900">Need legal support?</h3>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            Our compliance and legal cell replies within a day.
          </p>
          <a
            href="mailto:legal@ybex.io"
            className="mt-3 h-11 rounded-xl bg-gray-100 flex items-center justify-center gap-2 text-sm font-semibold text-gray-900"
          >
            <Mail size={14} /> legal@ybex.io
          </a>
        </Card>
      </Section>
    </MobileScreen>
  );
}
