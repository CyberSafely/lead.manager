// Profile: who you are in emails. Every field here fills a merge field ({{sender}}, {{title}}, …) in every draft.
// In the cloud build, the "You" fields are saved on your own member row (each teammate has their own) and the
// "Company" fields are shared by the whole team.
import { BadgeCheck, Building2, Mail, PenLine, Phone, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { S, save, ui } from "../store";
import { fill } from "../lib/logic";
import { placeholders } from "../lib/helpers";
import { Inp } from "../components/ui";
import type { Settings } from "../lib/types";

const SIGNATURE = "{{sender}}\n{{title}}, CyberSafely.ai\n{{phone}}\n{{sender_email}}\n{{mailing_address}}";

function Field({ icon, label, hint, token, k, placeholder, type }: { icon: ReactNode; label: string; hint?: string; token?: string; k: keyof Settings; placeholder?: string; type?: string }) {
  const set = (v: string) => { (S.settings as unknown as Record<string, string>)[k] = v.trim(); save(); };
  return <label className="pf-field">
    <span className="pf-label">{icon}{label}{token ? <code>{token}</code> : null}</span>
    <Inp value={S.settings[k] as string} onCommit={set} placeholder={placeholder} type={type} />
    {hint ? <span className="small muted">{hint}</span> : null}
  </label>;
}

export function Profile() {
  const cloud = ui.cloud !== "off", sig = fill(SIGNATURE, {}), missing = placeholders(sig);
  return <div className="pf">
    <div>
      <h2 style={{ marginBottom: 4 }}>Profile</h2>
      <p className="muted" style={{ marginTop: 0 }}>What you enter here is filled into every email draft automatically: the Gmail and Outlook drafts, bulk sends, the merge CSV and the HubSpot copy. Changes apply to the next draft you open.</p>
    </div>
    <section className="card pf-card">
      <h3><UserRound size={18} aria-hidden="true" /> You</h3>
      <p className="small muted">{cloud ? "Saved to your own team profile. Teammates have their own." : "Saved in this browser."}</p>
      <div className="pf-grid">
        <Field icon={<PenLine size={15} aria-hidden="true" />} label="Full name" token="{{sender}}" k="sender" placeholder="Pat Example" hint="Your sign-off in every email." />
        <Field icon={<BadgeCheck size={15} aria-hidden="true" />} label="Job title" token="{{title}}" k="title" placeholder="Onboarding & Activation" hint="Shown under your name in signatures." />
        <Field icon={<Mail size={15} aria-hidden="true" />} label="Email" token="{{sender_email}}" k="sender_email" type="email" placeholder="pat@example.org" hint="The address people can reply to." />
        <Field icon={<Phone size={15} aria-hidden="true" />} label="Phone" token="{{phone}}" k="phone" type="tel" placeholder="(555) 010-0000" hint="In your signature and voicemail script." />
        <Field icon={<UserRound size={15} aria-hidden="true" />} label="First name for call logs" k="caller" placeholder="Pat" hint="Recorded on call outcomes, not in emails." />
      </div>
    </section>
    <section className="card pf-card">
      <h3><Building2 size={18} aria-hidden="true" /> Company</h3>
      <p className="small muted">{cloud ? "Shared with the whole team." : "Used in every email."}</p>
      <div className="pf-grid">
        <Field icon={<Building2 size={15} aria-hidden="true" />} label="Mailing address" token="{{mailing_address}}" k="mailingAddress" placeholder="Street, city, state ZIP" hint="Required in commercial email (CAN-SPAM)." />
        <Field icon={<Mail size={15} aria-hidden="true" />} label="Support contact for parents" token="{{support}}" k="support" placeholder="Email or phone parents can contact" />
        <Field icon={<PenLine size={15} aria-hidden="true" />} label="Parent onboarding page" token="{{onboarding_page}}" k="onboardingPage" placeholder="https://…" />
        <Field icon={<PenLine size={15} aria-hidden="true" />} label="Default sign-up link" token="{{signup_link}}" k="defaultLink" placeholder="Used when a school has no link of its own" />
        <Field icon={<BadgeCheck size={15} aria-hidden="true" />} label={'"Active" target'} k="activeTarget" type="number" placeholder="10" hint="Sign-ups for a school to count as Active." />
      </div>
    </section>
    <section className="card pf-card">
      <h3><PenLine size={18} aria-hidden="true" /> Your signature, as drafts will show it</h3>
      <pre className="tpl">{sig}</pre>
      {missing.length ? <div className="banner warn">Still to fill in: {missing.join(", ")}. Drafts show these in brackets, and the send panel warns you before sending.</div>
        : <p className="small" style={{ color: "var(--ok)" }}>✓ Everything in your signature is filled in.</p>}
      <p className="small muted">Use these in any email file in <code>emails/</code>: <code>{"{{sender}}"}</code> <code>{"{{title}}"}</code> <code>{"{{sender_email}}"}</code> <code>{"{{phone}}"}</code> <code>{"{{mailing_address}}"}</code> <code>{"{{support}}"}</code> <code>{"{{onboarding_page}}"}</code> <code>{"{{signup_link}}"}</code></p>
    </section>
  </div>;
}
