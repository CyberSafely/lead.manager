// Home: the day at a glance (greeting, key numbers, reminders, districts in focus), then the full dashboard
// (progress report, funnels, by district) below. Everything is for the list selected at the top.
import { AlertTriangle, ArrowRight, BellRing, CalendarClock, CalendarDays, CheckCircle2, Clock, FileText, Mail, MapPin, Megaphone, Phone, Sparkles, Star, UserRound } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { DL, S, W, openLead, render, setView, ui } from "../store";
import { MAIN, STAGES, suggestTpl } from "../lib/pipeline";
import { addBiz, campsOf, fmtDate, iso, name, placeholders, schoolOf, todayISO } from "../lib/helpers";
import { fill } from "../lib/logic";
import { rptSet } from "../lib/report";
import { cv } from "../components/ui";
import { Dash } from "./Dash";
import { POST_STATUS, ensureSocial, itemsOf, postReminders, soc, type PostRem } from "../social/data";
import type { Lead } from "../lib/types";

const LIST_NAME: Record<string, string> = { principal: "Principals", overseer: "Overseers", campaign: "Campaigns", pta: "PTA", user: "App users", affiliate: "Affiliates" };
const CALL_WINDOWS: [number, number][] = [[7 * 60 + 30, 8 * 60 + 15], [14 * 60 + 45, 15 * 60 + 45]];   // CT, from the Today tab

function centralNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  const mins = (+p.hour % 24) * 60 + +p.minute;
  const label = new Date().toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
  return { mins, label, inWindow: CALL_WINDOWS.some(([a, b]) => mins >= a && mins <= b) };
}

function Metric({ icon, label, value, sub, tone, onClick }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: "bad" | "warn" | "ok"; onClick?: () => void }) {
  const body = <><span className="hm-l">{icon}{label}</span><span className={"hm-v" + (tone ? " " + tone : "")}>{value}</span>{sub ? <span className="hm-s">{sub}</span> : null}</>;
  return onClick ? <button className="card hm" onClick={onClick}>{body}</button> : <div className="card hm">{body}</div>;
}

function HomeToday() {
  const L = DL(), w = W(), t = todayISO(), wk = addBiz(5);
  const first = (S.settings.caller || S.settings.sender || "").trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours(), hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const ct = centralNow();
  const act = L.filter(l => l.nextDue && l.stage !== "lost");
  const over = act.filter(l => l.nextDue! < t).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  const tod = act.filter(l => l.nextDue === t), soon = act.filter(l => l.nextDue! > t && l.nextDue! <= wk);
  const emailsDue = [...over, ...tod].filter(l => suggestTpl(l)).length;
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return iso(d); });
  const perDay = days.map(d => L.reduce((a, l) => a + (l.activity || []).filter(x => x.ts.slice(0, 10) === d && x.type !== "Stage" && x.type !== "Note").length, 0));
  const touches = perDay.reduce((a, b) => a + b, 0), peak = Math.max(1, ...perDay);
  const engaged = L.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf("engaged")).length;
  const su = L.map(l => l.families?.signups).filter(x => x !== undefined && x !== "");
  const signups = su.length ? su.reduce((a: number, b) => a + +b!, 0) : null;

  // Reminders: setup gaps first, then the progress report, then the most urgent follow-ups
  const r = rptSet(), lastRpt = (r.log || []).slice(-1)[0], dow = new Date().getDay();
  const missing = placeholders(fill("{{sender}} {{title}} {{phone}} {{sender_email}} {{mailing_address}}", {}));
  type Rem = { key: string; icon: ReactNode; text: ReactNode; sub?: string; tone?: "bad" | "warn"; go: () => void };
  const rems: Rem[] = [];
  if (missing.length) rems.push({ key: "profile", icon: <UserRound size={16} />, text: <>Finish your profile</>, sub: `Still missing: ${missing.join(", ")}`, tone: "warn", go: () => setView("profile") });
  if ([1, 3, 5].includes(dow) && !(lastRpt && lastRpt.slice(0, 10) === t)) rems.push({ key: "rpt", icon: <FileText size={16} />, text: <>Progress report for Torino is due today</>, sub: lastRpt ? `Last exported ${fmtDate(lastRpt.slice(0, 10))}` : "Not exported yet", go: () => document.getElementById("rpt")?.scrollIntoView({ behavior: "smooth" }) });
  if (emailsDue) rems.push({ key: "mail", icon: <Mail size={16} />, text: <>{emailsDue} {emailsDue === 1 ? "email is" : "emails are"} ready to send as batches</>, sub: "Open Today → Emails due now", go: () => setView("today") });
  [...over, ...tod].slice(0, 6).forEach(l => rems.push({ key: l.id, icon: <CalendarClock size={16} />, tone: l.nextDue! < t ? "bad" : undefined,
    text: <span><b>{schoolOf(l) || name(l)}</b> · {l.nextAction}</span>, sub: `${l.nextDue! < t ? "Overdue since " + fmtDate(l.nextDue) : "Due today"} · ${name(l)}`, go: () => openLead(l.id) }));
  const moreDue = over.length + tod.length - Math.min(6, over.length + tod.length);

  // Districts in focus (campaigns: by campaign): the ones named in the progress report's focus, else the busiest
  const groupOf = (l: Lead) => ui.ds === "campaign" ? campsOf(l) : ui.ds === "affiliate" ? [l.platform || "(none)"] : [l.district || (ui.ds === "pta" || ui.ds === "user" ? l.school || "" : "") || "(none)"];
  const focus = String(r.focus || "").toLowerCase().split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const groups = new Map<string, Lead[]>();
  L.forEach(l => groupOf(l).forEach(g => groups.set(g, [...(groups.get(g) || []), l])));
  const rows = [...groups].map(([g, ls]) => ({ g, ls, f: focus.some(f => g.toLowerCase().includes(f)), due: ls.filter(l => l.nextDue && l.nextDue <= t && l.stage !== "lost").length,
    cont: ls.filter(l => l.stage !== "new").length, eng: ls.filter(l => MAIN.indexOf(l.stage) >= MAIN.indexOf("engaged")).length }));
  const shown = (focus.length && rows.some(x => x.f) ? rows.filter(x => x.f) : rows.filter(x => x.g !== "(none)"))
    .sort((a, b) => (b.due - a.due) || (b.eng - a.eng) || (b.ls.length - a.ls.length)).slice(0, 6);
  const pickGroup = (g: string) => { ui.filt.district = g; ui.filt.stage = ""; ui.showAll = false; ui.view = "leads"; render(); };

  const lead = over.length + tod.length
    ? <>You have <b>{tod.length}</b> follow-up{tod.length === 1 ? "" : "s"} due today{over.length ? <> and <b className="hm-bad">{over.length} overdue</b></> : null}.</>
    : <>You're all caught up. Nothing is due today.</>;
  return <section className="home" aria-label="Today at a glance" data-parity-skip>
    <div className="hello">
      <div className="hello-main">
        <span className="hello-date">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {LIST_NAME[ui.ds]}</span>
        <h2>{hello}, {first}</h2>
        <p>{lead} {soon.length ? <>{soon.length} more in the next 5 workdays.</> : null}</p>
        <div className="row">
          <button className="b p" onClick={() => setView("today")}>Open Today <ArrowRight size={15} aria-hidden="true" /></button>
          <button className="b hello-b" onClick={() => setView("calls")}><Phone size={15} aria-hidden="true" /> Start calls</button>
        </div>
      </div>
      <div className="hello-side">
        <span className="hm-l"><Clock size={15} aria-hidden="true" /> Missouri time</span>
        <span className="hello-time">{ct.label} CT</span>
        <span className={"hello-win" + (ct.inWindow ? " on" : "")}>{ct.inWindow ? "● Good time to call principals" : "Call windows: 7:30–8:15 AM, 2:45–3:45 PM CT"}</span>
      </div>
    </div>

    <div className="hm-row">
      <Metric icon={<CalendarClock size={15} />} label="Due today" value={tod.length} sub={`${soon.length} in the next 5 workdays`} onClick={() => setView("today")} />
      <Metric icon={<AlertTriangle size={15} />} label="Overdue" value={over.length} tone={over.length ? "bad" : "ok"} sub={over.length ? "Catch up from Today" : "Nothing overdue"} onClick={() => setView("today")} />
      <div className="card hm"><span className="hm-l"><Sparkles size={15} />Touches, last 7 days</span><span className="hm-v">{touches}</span>
        <span className="spark" aria-hidden="true">{perDay.map((v, i) => <span key={i} style={{ height: `${Math.max(6, v / peak * 100)}%` }} title={`${fmtDate(days[i])}: ${v}`}></span>)}</span></div>
      <Metric icon={<CheckCircle2 size={15} />} label="Engaged or further" value={engaged} sub={L.length ? `of ${L.length} ${w.many}` : ""} />
      <Metric icon={<Star size={15} />} label="Family sign-ups" value={signups ?? "—"} sub={signups === null ? "not yet measurable" : `from ${su.length} reporting`} />
    </div>

    <div className="hm-cols">
      <div className="card hm-card">
        <h3><BellRing size={17} aria-hidden="true" /> Reminders</h3>
        {rems.length ? <ul className="rem">{rems.map(x => <li key={x.key}><button onClick={x.go} className={x.tone || ""}>
          <span className="rem-i">{x.icon}</span><span className="rem-t">{x.text}{x.sub ? <span className="small muted">{x.sub}</span> : null}</span><ArrowRight size={15} className="rem-go" aria-hidden="true" /></button></li>)}</ul>
          : <p className="muted">No reminders. Nice work.</p>}
        {moreDue > 0 ? <button className="b sm" onClick={() => setView("today")}>+{moreDue} more due on Today</button> : null}
      </div>
      <div className="card hm-card">
        <h3><MapPin size={17} aria-hidden="true" /> {ui.ds === "campaign" ? "Campaigns" : "Districts"} in focus</h3>
        <p className="small muted" style={{ marginTop: 0 }}>{focus.length && rows.some(x => x.f) ? <>From the progress report's focus: {r.focus}</> : <>The busiest right now. Set your focus in the progress report below.</>}</p>
        {shown.length ? <ul className="foc">{shown.map(x => <li key={x.g}><button onClick={() => pickGroup(x.g)}>
          <span className="foc-h"><b>{x.f ? "★ " : ""}{x.g}</b><span className="small muted">{x.cont}/{x.ls.length} contacted{x.due ? <> · <span className="hm-bad">{x.due} due</span></> : null}</span></span>
          <span className="stack" aria-hidden="true">{STAGES.map(s => { const c = x.ls.filter(l => l.stage === s.id).length; return c ? <span key={s.id} style={{ width: `${c / x.ls.length * 100}%`, background: cv(s.id) }}></span> : null; })}</span>
        </button></li>)}</ul> : <p className="muted">Nothing to show yet.</p>}
      </div>
    </div>
    <Posting />
    <h2 className="hm-sec">Progress & reporting</h2>
  </section>;
}

// Posting: what the Social calendar says needs posting (overdue, today, the next 2 days). The same for every list.
function Posting() {
  useEffect(() => { ensureSocial(); }, []);
  const open = (id?: string) => { ui.socTab = "calendar"; ui.socOpen = id || null; setView("social"); };
  const head = <div className="row" style={{ marginBottom: 10 }}><h3 className="grow" style={{ margin: 0 }}><Megaphone size={17} aria-hidden="true" /> Posting</h3>
    <button className="b sm" onClick={() => open()}><CalendarDays size={14} aria-hidden="true" /> Open calendar</button></div>;
  if (soc.status !== "ready") return <div className="card hm-card hm-post">{head}<p className="muted">{soc.status === "error" ? soc.err : "Checking the calendar…"}</p></div>;
  const { rems, next, undated, caughtUp } = postReminders(itemsOf("post"));
  const st = (r: PostRem) => POST_STATUS.find(x => x[0] === r.it.data.status)![1];
  const day = (d: string) => new Date(d + "T12:00").toLocaleDateString(undefined, { weekday: "long" });
  const meta = (r: PostRem) => [r.it.data.platforms.join(", "), r.it.data.owner].filter(Boolean).join(" · ");
  const row = (r: PostRem) => {
    const p = r.it.data, title = <b>{p.title || "(untitled post)"}</b>, at = p.time ? " at " + p.time : "";
    const [tone, text, sub]: ["bad" | "warn" | "", ReactNode, string] =
      r.level === "overdue" ? ["bad", <>{title} was planned for {fmtDate(p.date)}</>, `Not marked Posted · still ${st(r)} · ${meta(r)}`]
      : r.level === "today" ? [r.late || r.notReady ? (r.late ? "bad" : "warn") : "warn", <>Post today{at}: {title}</>, [r.late ? "Past its time" : "", r.notReady ? "still " + st(r) : "", meta(r)].filter(Boolean).join(" · ")]
      : r.notReady ? ["warn", <>{p.status === "ready" ? "Review" : "Finish"} for {day(p.date!)}: {title}</>, `Still ${st(r)} · ${meta(r)}`]
      : ["", <>{day(p.date!)}{at}: {title}</>, `Scheduled · ${meta(r)}`];
    return <li key={r.it.id}><button onClick={() => open(r.it.id)} className={tone}>
      <span className="rem-i">{r.level === "soon" && !r.notReady ? <CalendarDays size={16} /> : <Megaphone size={16} />}</span>
      <span className="rem-t"><span>{text}</span><span className="small muted">{sub}</span></span><ArrowRight size={15} className="rem-go" aria-hidden="true" /></button></li>;
  };
  return <div className="card hm-card hm-post">{head}
    {caughtUp ? <p className="hm-ok"><CheckCircle2 size={16} aria-hidden="true" /> You're all caught up on posting.
      {rems.length ? null : next ? <> Next: <b>{next.data.title || "(untitled post)"}</b> on {fmtDate(next.data.date)}.</> : <> Nothing planned in the next few days.</>}</p> : null}
    {rems.length ? <ul className="rem">{rems.map(row)}</ul> : null}
    {undated ? <button className="b sm" onClick={() => { ui.socTab = "posts"; setView("social"); }}>{undated} idea{undated === 1 ? "" : "s"} without a date · plan {undated === 1 ? "it" : "them"} on the calendar</button> : null}
  </div>;
}

export function Home() {
  return <><HomeToday /><Dash /></>;
}
