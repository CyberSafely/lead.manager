// Types for emailPattern.mjs (used from TypeScript scripts).
export interface EmailPattern { domain: string; pattern: string; matches: number; total: number; share: number }
export interface NamedEmail { first?: string; last?: string; email?: string }
export function nameParts(first?: string, last?: string): { f: string; l: string; lHyphen: string };
export const PATTERNS: Record<string, (f: string, l: string) => string>;
export function learnPattern(people: NamedEmail[], opts?: { minMatches?: number; minShare?: number }): EmailPattern | null;
export function inferEmail(pat: EmailPattern | null, first?: string, last?: string): string;
export function inferNote(pat: EmailPattern): string;
export function districtPeople(leads: { districtId?: string; first?: string; last?: string; email?: string; emailInferred?: boolean;
  contacts?: { first?: string; last?: string; email?: string; emailInferred?: boolean }[] }[], districtId: string): NamedEmail[];
