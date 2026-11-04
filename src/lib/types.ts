// Data model. Field names and ids match what's already saved in localStorage ("cs-outreach-v1"): never rename them.

export type StageId = "new" | "contacted" | "rejected" | "engaged" | "live" | "active" | "nurture" | "lost";
export type ListId = "principal" | "overseer" | "cto" | "campaign" | "pta" | "user" | "affiliate";
export type CallId = "interested" | "info" | "followup" | "not" | "unreach";

export interface Activity { ts: string; type: string; note: string }

export interface Call {
  status?: CallId | string;
  ts?: string;
  by?: string;
  prev?: { stage: StageId; seq: number };
  note?: string;
  fundraising?: boolean;
}

export interface Families { signups?: string | number; activated?: string | number; asOf?: string }

// Other people at the school/district: the influencer who actually picks up (tech overseer, counselor, "Dr."),
// kept on the parent lead so they're tied to the same school/district and the same deal. The lead's own
// first/last/email/phone stay the formal (principal) contact. `primary` just flags the one Giancarlo works most
// (display only); it does not change who the email/call buttons target.
export interface SchoolContact {
  id: string;
  first?: string; last?: string;
  role?: string;     // Tech / Guidance counselor / Front office / Dr. / Other
  email?: string;
  phone?: string;    // a direct line, if there is one
  ext?: string;      // extension
  primary?: boolean; // the influencer — shown first and badged "Main contact"
  notes?: string;
}

export interface Lead {
  id: string;
  type?: Exclude<ListId, "principal"> | "principal";
  first?: string; last?: string; email?: string; phone?: string; jobtitle?: string;
  school?: string; district?: string; districtId?: string; owner?: string; hubspotId?: string; notes?: string; state?: string;
  code?: string; regLink?: string; level?: string; grades?: string; city?: string; region?: string; assigned?: string;
  campaign?: string; title_salutation?: string;
  // Affiliates (social media): handle without "@", platform name, follower count as digits, link to the account
  handle?: string; platform?: string; followers?: string; profileUrl?: string;
  postUrl?: string;   // their latest post about us (regLink / code hold their own tracking link and referral code)
  accessCode?: string;   // their family's free access code (Parent Ambassadors)
  stage: StageId;
  seq?: number;
  sent?: string[];
  path?: string;
  shared?: boolean;
  call?: Call;
  families?: Families;
  nextAction?: string;
  nextDue?: string;
  contacts?: SchoolContact[];   // additional people at this school/district
  activity?: Activity[];
  createdAt?: string;
  updatedAt?: string;
}

// A reference note in the Resources tab (e.g. "What counts as an affiliate"). Team-shared in the cloud build.
export interface Resource {
  id: string;
  title: string;
  body: string;
  tags?: string;      // comma-separated, for grouping
  updatedAt?: string;
}

export interface Template {
  id: string;
  phase?: string;
  name: string;
  to?: StageId | null;
  seq?: number;
  path?: string;
  shared?: boolean;   // sending it marks the lead as having shared the links (frontmatter marks_shared)
  subject: string;
  body: string;
  kind?: string;
  file?: string;
}

export interface ReportSettings { focus: string; wins: string; blockers: string; next: string; log: string[] }

export interface Settings {
  sender: string; caller: string; phone: string; onboardingPage: string; defaultLink: string; support: string;
  // Profile. title and sender_email are personal (named like their members columns); mailingAddress is team-wide.
  title: string; sender_email: string; mailingAddress: string;
  activeTarget: number | string;
  report: ReportSettings;
}

export interface AppState {
  leads: Lead[];
  templates: Template[];
  tplVersion: number;
  vaultVersion?: string;
  vaultIds?: string[];
  settings: Settings;
  resources?: Resource[];
  resourceSeed?: number;   // which built-in resources have been seeded (see defaultResources.ts)
  savedAt: string | null;
}

/** One note in emails/, in full (for the Emails explorer). fm = its frontmatter; md = the text after it. */
export interface EmailFile { path: string; folder: string; name: string; id?: string | null; fm: Record<string, string>; md: string }
export interface VaultTemplates { templates: Template[]; categories: string[]; version: string; generated: string; files?: EmailFile[] }

export interface DistrictFeature {
  type: "Feature";
  properties: { name: string; code?: string; county?: string };
  geometry: { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
}

declare global {
  interface Window {
    VAULT_TEMPLATES?: VaultTemplates;
    MO_DISTRICTS?: { type: "FeatureCollection"; features: DistrictFeature[] };
  }
}
