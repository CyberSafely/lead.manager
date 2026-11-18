// District info (the Graph view's second tab): the district at a glance for whoever is about to call it.
// DESE facts (size, schools, main lines, website, staff email format) from public/district-stats.js, matched to the
// leads already on your lists: who to call first, which schools you have, and how the pipeline stands there.
import { useState, type CSSProperties } from "react";
import { isCto, isOv, isPr } from "../store";
import { STAGE, STAGES } from "../lib/pipeline";
import { digits, fmtPhone, name, schoolOf } from "../lib/helpers";
import { buildingsOf, exampleEmail, leadsPattern, normS, patternLabel, statsFor } from "../lib/district";
import type { DistrictBuilding, Lead, StageId } from "../lib/types";

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-US"));
const nz = (v: number | null | undefined) => (v ? v.toLocaleString("en-US") : "—");   // DESE lists 0 when no enrollment was reported
// Same rule as scripts/dese-schools.py: middle, junior high and high schools whose grades overlap 5-9 (the offer);
// an elementary that stops at grade 5 or 6 isn't one.
const inOffer = (b: DistrictBuilding) => b.lo != null && b.hi != null && b.hi >= 5 && b.lo <= 9 && b.level !== "Vocational"
  && (["Middle", "Junior High", "High"].includes(b.level) || b.hi >= 7);

function Kpi({ l, v, s }: { l: string; v: string; s?: string }) {
  return <div className="kpi" style={{ cursor: "default" }}><span className="kpi-l">{l}</span><span className="kpi-v">{v}</span>{s ? <span className="kpi-s">{s}</span> : null}</div>;
}
function Tel({ p, ext }: { p?: string; ext?: string }) {
  if (!p) return <span className="dinfo-miss">No phone</span>;
  return <a href={"tel:" + digits(p) + (ext ? ",," + ext : "")} onClick={e => e.stopPropagation()}>{fmtPhone(p)}{ext ? " x" + ext : ""}</a>;
}
function Mail({ e, inferred }: { e?: string; inferred?: boolean }) {
  if (!e) return <span className="dinfo-miss">No email</span>;
  return <span>{e}{inferred ? <span className="small muted" title="Built from the district's email format, not published: confirm it on the call"> (guess)</span> : null}</span>;
}
function StageChip({ id }: { id?: StageId }) {
  const st = id ? STAGE[id] : undefined;
  return st ? <span className="chip" style={{ borderLeft: "3px solid var(" + st.c + ")" }}>{st.name}</span> : null;
}

interface Person { key: string; lead: Lead; rank: number; who: string; role: string; school: string; phone?: string; ext?: string; email?: string; inferred?: boolean }

export function DistrictInfo({ districtName, districtId, members, open }: { districtName: string; districtId: string; members: Lead[]; open: (l: Lead) => void }) {
  const [allPeople, setAllPeople] = useState(false), [offerOnly, setOfferOnly] = useState(true);
  const st = statsFor(districtId, districtName);
  const schoolsLeads = members.filter(isPr);

  // DESE buildings ↔ your school leads
  const leadOf = new Map<string, Lead>();
  for (const l of schoolsLeads) for (const b of buildingsOf(l, st)) if (!leadOf.has(normS(b.name))) leadOf.set(normS(b.name), l);
  const buildings = st?.buildings || [];
  const offerB = buildings.filter(inOffer);
  const shown = offerOnly ? offerB : buildings;
  const unmatched = st ? schoolsLeads.filter(l => !buildingsOf(l, st).length) : schoolsLeads;

  // Everyone you can call here, district office first, then each school's main contact, its other people, its principal
  const people: Person[] = [];
  for (const l of members) {
    const base = isOv(l) ? 0 : isCto(l) ? 1 : !isPr(l) ? 2 : 5;
    people.push({ key: l.id, lead: l, rank: base, who: name(l), role: l.jobtitle || (isOv(l) ? "Superintendent / overseer" : isCto(l) ? "Technology / CTO" : isPr(l) ? "Principal" : "District"),
      school: isPr(l) ? schoolOf(l) : "District office", phone: l.phone, email: l.email, inferred: l.emailInferred });
    for (const c of l.contacts || []) people.push({ key: "c:" + c.id, lead: l, rank: base < 5 ? base + 0.5 : c.primary ? 3 : 4,
      who: [c.first, c.last].filter(Boolean).join(" ") || "(no name)", role: (c.role || "Contact") + (c.primary ? " · main" : ""),
      school: isPr(l) ? schoolOf(l) : "District office", phone: c.phone, ext: c.ext, email: c.email, inferred: c.emailInferred });
  }
  people.sort((a, b) => a.rank - b.rank || a.school.localeCompare(b.school) || a.who.localeCompare(b.who));
  const withPhone = people.filter(p => p.phone).length, withEmail = people.filter(p => p.email).length;
  const neither = people.filter(p => !p.phone && !p.email).length;
  const LIMIT = 12, list = allPeople ? people : people.slice(0, LIMIT);

  const stages = STAGES.map(s => ({ s, c: members.filter(l => l.stage === s.id).length })).filter(x => x.c);
  const mine = leadsPattern(members);
  const levelLine = st ? Object.entries(st.levels).filter(([, v]) => v.schools).map(([k, v]) => `${v.schools} ${k.toLowerCase()}`).join(" · ") : "";

  return <div className="dinfo">
    {st ? <div className="dinfo-head">
      <div><b>{st.name}</b> <span className="muted">· {st.county} County{st.city ? " · " + st.city : ""} · DESE {String(districtId || "").padStart(6, "0") || "—"}</span></div>
      <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
        {st.phone ? <span className="small">District office <Tel p={st.phone} /></span> : null}
        {st.url ? <a className="small" href={st.url} target="_blank" rel="noopener noreferrer">{st.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}</a> : null}
      </div>
    </div> : <p className="muted small" style={{ margin: "0 0 10px" }}>This district isn't in the DESE directory file, so size and school facts aren't available. The contacts below come from your lists.
      {typeof window.MO_DISTRICT_STATS === "undefined" ? " (public/district-stats.js is missing: run python3 scripts/district-stats.py.)" : ""}</p>}

    <div className="kpis" style={{ ["--n" as string]: 4, marginBottom: 12 } as CSSProperties}>
      <Kpi l="Students" v={st ? n(st.students) : "—"} s={st ? "DESE enrollment" : "not in DESE file"} />
      <Kpi l="Schools" v={st ? n(st.schools) : "—"} s={levelLine || undefined} />
      <Kpi l="Middle & high schools on your list" v={offerB.length ? `${offerB.filter(b => leadOf.has(normS(b.name))).length} of ${offerB.length}` : "—"}
        s={offerB.length ? `${schoolsLeads.length} school ${schoolsLeads.length === 1 ? "lead" : "leads"} in all` : "not yet measurable"} />
      <Kpi l="People to call" v={String(people.length)} s={people.length ? `${withPhone} with a phone · ${withEmail} with an email` : "none on your lists yet"} />
    </div>

    <div className="dinfo-grid">
      <section className="card dinfo-card">
        <h4>Email format</h4>
        {st?.emails.length ? st.emails.map(e => {
          const top = e.patterns[0];
          return <div key={e.domain} className="dinfo-fmt">
            <div><b>@{e.domain}</b> <span className="small muted">· {e.n} directory {e.n === 1 ? "address" : "addresses"}</span></div>
            {top ? <>
              <div>{patternLabel(top[0])} <span className="small muted">({top[1]} of {e.n}) e.g. <code>{exampleEmail(top[0], e.domain)}</code></span></div>
              {e.patterns.slice(1).map(([p, c]) => <div key={p} className="small muted">also {patternLabel(p)} ({c})</div>)}
            </> : <div className="small muted">No clear format in these addresses.</div>}
          </div>;
        }) : <p className="small muted">No staff emails in the DESE directory for this district.</p>}
        <div className="small" style={{ marginTop: 8 }}>
          {"pattern" in mine
            ? <>Your contacts here: <b>{patternLabel(mine.pattern)}@{mine.domain}</b> <span className="muted">({mine.matches} of {mine.total})</span></>
            : <span className="muted">Your contacts here: {mine.people ? `${mine.people} emails, no clear format yet` : "no emails yet"}</span>}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>From principal and superintendent addresses in the DESE directory. A built address is a guess until confirmed.</p>
      </section>

      <section className="card dinfo-card">
        <h4>Pipeline here</h4>
        {stages.length ? <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{stages.map(({ s, c }) => <span key={s.id} className="chip" style={{ borderLeft: "3px solid var(" + s.c + ")" }}>{s.name} {c}</span>)}</div>
          : <p className="small muted">No leads in this district yet.</p>}
        <div className="small" style={{ marginTop: 10 }}>
          {people.length ? <>{neither ? <span className="dinfo-miss">{neither} {neither === 1 ? "person has" : "people have"} no phone or email</span> : "Everyone has a phone or an email"}</> : null}
        </div>
        {st ? <div className="small muted" style={{ marginTop: 6 }}>{n(st.teachers)} teachers{st.students && st.teachers ? ` · about ${Math.round(st.students / st.teachers)} students per teacher` : ""}</div> : null}
      </section>
    </div>

    <h4 className="dinfo-h">Key contacts to call</h4>
    {people.length ? <div className="tablewrap"><table className="dinfo-table">
      <thead><tr><th>Name</th><th>Role</th><th>Where</th><th>Phone</th><th>Email</th><th>Stage</th></tr></thead>
      <tbody>{list.map(p => <tr key={p.key} className={"click" + (!p.phone && !p.email ? " dinfo-nodata" : "")} onClick={() => open(p.lead)}>
        <td><b>{p.who}</b></td><td>{p.role}</td><td>{p.school}</td>
        <td><Tel p={p.phone} ext={p.ext} /></td><td><Mail e={p.email} inferred={p.inferred} /></td><td><StageChip id={p.lead.stage} /></td>
      </tr>)}</tbody>
    </table></div> : <p className="small muted">No one from this district is on your lists yet. Use "Add person" above, or call the district office.</p>}
    {people.length > LIMIT ? <button className="b sm" style={{ marginTop: 6 }} onClick={() => setAllPeople(!allPeople)}>{allPeople ? "Show fewer" : `Show all ${people.length}`}</button> : null}

    {st ? <>
      <div className="row" style={{ alignItems: "center", gap: 10, margin: "18px 0 6px", flexWrap: "wrap" }}>
        <h4 className="dinfo-h" style={{ margin: 0 }}>Schools</h4>
        <div className="ds" role="tablist">
          <button role="tab" aria-selected={offerOnly} className={offerOnly ? "on" : ""} onClick={() => setOfferOnly(true)}>Middle & high ({offerB.length})</button>
          <button role="tab" aria-selected={!offerOnly} className={!offerOnly ? "on" : ""} onClick={() => setOfferOnly(false)}>All ({buildings.length})</button>
        </div>
      </div>
      <div className="tablewrap"><table className="dinfo-table">
        <thead><tr><th>School</th><th>Grades</th><th style={{ textAlign: "right" }}>Students</th><th>Main line</th><th>On your list</th></tr></thead>
        <tbody>
          {[...shown].sort((a, b) => (b.students || 0) - (a.students || 0)).map(b => {
            const l = leadOf.get(normS(b.name));
            return <tr key={b.name + b.grades} className={l ? "click" : "dinfo-off"} onClick={l ? () => open(l) : undefined}>
              <td><b>{b.name}</b>{b.level ? <span className="small muted"> · {b.level}</span> : null}</td><td>{b.grades}</td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{nz(b.students)}</td>
              <td><Tel p={b.phone} /></td>
              <td>{l ? <><span>{name(l)}</span> <StageChip id={l.stage} /></> : <span className="small muted">Not yet</span>}</td>
            </tr>;
          })}
          {unmatched.map(l => <tr key={l.id} className="click" onClick={() => open(l)}>
            <td><b>{schoolOf(l)}</b> <span className="small muted">· not matched in DESE list</span></td><td>{l.grades || ""}</td><td style={{ textAlign: "right" }}>—</td>
            <td><Tel p={l.phone} /></td><td>{name(l)} <StageChip id={l.stage} /></td>
          </tr>)}
        </tbody>
      </table></div>
    </> : null}
  </div>;
}
