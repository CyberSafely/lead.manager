// Emails: an explorer for the emails/ folder. Pick a note on the left (grouped by folder) and read the whole file,
// rendered from markdown, on the right: what it's for, when to send it, the subject and body, and the notes around it.
// Markdown becomes React elements (no raw HTML), so a note can't inject markup into the app.
// A third column lists the first 10 Cold leads of the current list, so you can read a script, call and log in one screen.
// Clicking a lead there fills its {{merge fields}} (greeting, district, your name…) into the note's email and script text.
import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, ChevronDown, ChevronRight, FileText, Mail, MessageCircle, Phone, PhoneCall, RefreshCw, Search, UserCheck, X } from "lucide-react";
import { CALLS, CALL_IDS, KEY, STAGE, callDef } from "../lib/pipeline";
import { DL, S, W, lead, openLead, render, save, syncVault, tpl, vaultTemplates } from "../store";
import { DEFAULT_TEMPLATES } from "../lib/defaultTemplates";
import { name, schoolOf } from "../lib/helpers";
import { fill, log, setCall, tokens, toHubspot } from "../lib/logic";
import { FlashButton, Inp, MailLink, TelLink, copy } from "../components/ui";
import type { EmailFile, Lead, StageId } from "../lib/types";

const PICK_KEY = KEY + "-email";
const GUIDES = "Guides";
const STAGE_BY_WORD: Record<string, StageId> = { contacted: "contacted", engaged: "engaged", declined: "lost", live: "live", active: "active", nurture: "nurture" };

type Item = EmailFile & { group: string; code: string; title: string; isScript: boolean };

function items(): Item[] {
  const fromFiles: EmailFile[] = vaultTemplates()?.files || [];
  const known = new Set(fromFiles.map(f => f.id).filter(Boolean));
  // Emails that only exist in this app (added before emails/ was the source) still show, from their saved text
  const extra: EmailFile[] = S.templates.filter(t => !known.has(t.id)).map(t => ({
    path: "", folder: "Made in the app", name: t.name, id: t.id, fm: { kind: t.kind || "Email" },
    md: (t.subject ? "## Subject\n\n```text\n" + t.subject + "\n```\n\n" : "") + "## Body\n\n```text\n" + t.body + "\n```\n",
  }));
  return [...fromFiles, ...extra].map(f => {
    const [code, ...rest] = f.name.split(" · ");
    return { ...f, group: f.folder || GUIDES, code: rest.length ? code : "", title: rest.length ? rest.join(" · ") : f.name, isScript: (f.fm.kind || "") === "Script" || /script/i.test(f.name) };
  });
}

/** Obsidian-isms → plain markdown: [[wikilinks]] become in-app links, <details> blocks are shown open. */
function prep(md: string) {
  return md.replace(/^\s*# .+\n+/, "")
    .replace(/<details>\s*<summary>(.*?)<\/summary>/g, "**$1**\n").replace(/<\/details>/g, "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => `[${(label || target).replace(/[[\]]/g, "")}](#wl:${encodeURIComponent(target.trim())})`);
}

/** {{merge fields}} highlighted inside email text, or, with a lead picked, replaced by that lead's values (still highlighted). */
function withTokens(text: string, l?: Lead) {
  const t = l ? tokens(l) : null;
  return text.split(/(\{\{\w+\}\})/g).map((part, i) => {
    if (!/^\{\{\w+\}\}$/.test(part)) return part;
    const v = t?.[part.slice(2, -2)];
    return v !== undefined ? <span key={i} className="tok fill" title={part}>{String(v)}</span> : <span key={i} className="tok">{part}</span>;
  });
}

function codeOf(children: ReactNode): { lang: string; text: string } {
  const el = Children.toArray(children)[0];
  if (!isValidElement(el)) return { lang: "", text: "" };
  const p = (el as ReactElement<{ className?: string; children?: ReactNode }>).props;
  return { lang: (p.className || "").replace("language-", ""), text: String(p.children ?? "").replace(/\n$/, "") };
}

const QUEUE = 10;

/** One lead in the side column: who, tap to call, then the outcome and a note, logged like the Calls tab. */
function QueueRow({ l, on, onPick, onLogged }: { l: Lead; on: boolean; onPick: (id: string) => void; onLogged: (id: string) => void }) {
  const c = l.call || {}, cd = callDef(c.status);
  return <li className={"exq-it" + (on ? " on" : "")}>
    <div className="exq-h">
      <button className="exq-pick" aria-pressed={on} title="Fill this lead into the email or script" onClick={() => onPick(l.id)}>
        <b>{schoolOf(l)}</b>
        {l.school && l.district ? <span className="small muted">{l.district}</span> : null}
        <span>{name(l)}</span>
      </button>
      <button className="b sm" onClick={() => openLead(l.id)}>Open ›</button>
    </div>
    <div className="exq-tel"><TelLink l={l} /></div>
    <div className="small exq-mail"><MailLink l={l} /></div>
    <select value={cd ? c.status : ""} aria-label={"Call outcome for " + name(l)} style={c.status && cd ? { borderLeft: `4px solid var(${cd.c})` } : undefined}
      onChange={e => { setCall(lead(l.id)!, e.target.value); onLogged(l.id); save(); }}>
      <option value="">— not called —</option>{CALL_IDS.map(k => <option key={k} value={k}>{CALLS[k].name}</option>)}</select>
    <Inp value={c.note} placeholder="Call note (no student/family details)" aria-label={"Call note for " + name(l)} onCommit={raw => {
      const v = raw.trim(); l.call = { ...(l.call || {}), note: v }; if (v) log(l, "Note", "Call note: " + v); onLogged(l.id); save();
    }} />
  </li>;
}

/** The first 10 Cold leads in the current list (same order as the Schools tab). Leads you log here stay at the top
 *  under "Just logged" until you leave the tab, so a lead doesn't vanish the moment its stage moves on. */
function Queue({ pick, onPick }: { pick: string; onPick: (id: string) => void }) {
  const [logged, setLogged] = useState<string[]>([]);
  const onLogged = (id: string) => setLogged(xs => xs.includes(id) ? xs : [id, ...xs]);
  const cold = DL().filter(l => l.stage === "new" && !logged.includes(l.id)).sort((a, b) => (a.district || "").localeCompare(b.district || ""));
  const done = logged.map(lead).filter((l): l is Lead => !!l);
  const w = W();
  return <aside className="ex-q" aria-label={"Cold " + w.many} data-parity-skip>
    <h3><PhoneCall size={16} aria-hidden="true" /> Cold {w.many}</h3>
    <p className="small muted">{cold.length ? <>First {Math.min(QUEUE, cold.length)} of {cold.length}. Click a name to fill it into the email or script. Switch the list at the top to see other lead types.</> : <>No Cold {w.many} left in this list.</>}</p>
    {done.length ? <><div className="exq-sub small muted">Just logged</div><ul className="exq">{done.map(l => <QueueRow key={l.id} l={l} on={pick === l.id} onPick={onPick} onLogged={onLogged} />)}</ul></> : null}
    {done.length && cold.length ? <div className="exq-sub small muted">Next up</div> : null}
    <ul className="exq">{cold.slice(0, QUEUE).map(l => <QueueRow key={l.id} l={l} on={pick === l.id} onPick={onPick} onLogged={onLogged} />)}</ul>
  </aside>;
}

export function Templates() {
  const all = items(), v = vaultTemplates();
  const [pick, setPick] = useState(() => { try { return localStorage.getItem(PICK_KEY) || ""; } catch (e) { return ""; } });
  const [q, setQ] = useState("");
  const [shut, setShut] = useState<Set<string>>(new Set());
  // The lead picked in the Cold column, whose details fill the merge fields (cleared by clicking it again)
  const [lid, setLid] = useState("");
  const who = lid ? lead(lid) : undefined;
  const keyOf = (f: Item) => f.path || "app:" + f.id;
  const choose = (key: string) => { setPick(key); try { localStorage.setItem(PICK_KEY, key); } catch (e) { /* storage unavailable */ } window.scrollTo({ top: 0 }); };
  const cur = all.find(f => keyOf(f) === pick) || all.find(f => f.group === GUIDES) || all[0];

  const ql = q.trim().toLowerCase();
  const shown = ql ? all.filter(f => (f.name + " " + f.md).toLowerCase().includes(ql)) : all;
  const order = [...new Set([GUIDES, ...(v?.categories || []), ...[...new Set(all.map(f => f.group))].sort()])];
  const groups = order.map(g => [g, shown.filter(f => f.group === g)] as const).filter(([, fs]) => fs.length);

  const goWiki = (target: string) => {
    const t = target.toLowerCase().replace(/\.md$/, "");
    const hit = all.find(f => (f.path.toLowerCase().replace(/\.md$/, "").split("/").pop() || "") === t || f.name.toLowerCase() === t);
    if (hit) choose(keyOf(hit));
  };
  const components: Components = {
    a: ({ href = "", children }) => href.startsWith("#wl:")
      ? <a href="#" className="wl" onClick={e => { e.preventDefault(); goWiki(decodeURIComponent(href.slice(4))); }}>{children}</a>
      : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    pre: ({ children }) => {
      const { lang, text } = codeOf(children);
      if (lang === "text") return <div className="ex-text"><FlashButton label="Copy" className="b sm ex-copy" onClick={() => copy(who ? fill(text, who) : text)} /><pre>{withTokens(text, who)}</pre></div>;
      if (lang === "mermaid") return <div className="ex-mermaid"><span className="small muted">Flow diagram (Mermaid). Open the note in Obsidian to see it drawn.</span><pre>{text}</pre></div>;
      return <pre className="ex-pre">{text}</pre>;
    },
    table: ({ children }) => <div className="tablewrap"><table>{children}</table></div>,
  };

  const t = cur?.id ? tpl(cur.id) : undefined;
  const fm = cur?.fm || {};
  const stage = STAGE_BY_WORD[(fm.stage_after_send || "").toLowerCase()];
  return <div className="ex">
    <aside className="ex-nav" aria-label="Emails">
      <div className="ex-search"><Search size={15} aria-hidden="true" /><input type="search" placeholder="Search emails and notes" value={q} onChange={e => setQ(e.target.value)} aria-label="Search emails and notes" /></div>
      {groups.map(([g, fs]) => {
        const closed = shut.has(g) && !ql;
        return <div key={g} className="ex-g">
          <button className="ex-gh" aria-expanded={!closed} onClick={() => { const n = new Set(shut); if (n.has(g)) n.delete(g); else n.add(g); setShut(n); }}>
            {closed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}<span>{g}</span><span className="count">{fs.length}</span></button>
          {closed ? null : fs.map(f => {
            const on = !!cur && keyOf(cur) === keyOf(f);
            return <button key={keyOf(f)} className={"ex-it" + (on ? " on" : "")} aria-current={on ? "true" : undefined} onClick={() => choose(keyOf(f))}>
              {f.group === GUIDES ? <BookOpen size={15} aria-hidden="true" /> : f.isScript ? <Phone size={15} aria-hidden="true" /> : f.fm.kind === "DM" ? <MessageCircle size={15} aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />}
              {f.code ? <span className="ex-code">{f.code}</span> : null}<span className="ex-t">{f.title}</span></button>;
          })}
        </div>;
      })}
      {!groups.length ? <p className="small muted" style={{ padding: "0 12px" }}>No emails match “{q}”.</p> : null}
      <div className="ex-foot small muted">
        <span>{v ? <>{v.templates.length} emails from <code>emails/</code> · synced {new Date(v.generated).toLocaleString()}</> : <>Not linked to <code>emails/</code>. Run <code>npm run sync-emails</code>, then reload.</>}</span>
        <button className="b sm" onClick={() => {
          if (!confirm("Reload every email from the emails/ folder? Edits made in the app are replaced.")) return;
          if (!syncVault(S, true)) S.templates = DEFAULT_TEMPLATES.map(x => ({ ...x })); save(); render();
        }}><RefreshCw size={13} aria-hidden="true" /> Reload from folder</button>
      </div>
    </aside>

    <article className="ex-doc card">
      {cur ? <>
        <div className="ex-crumb small muted"><FileText size={14} aria-hidden="true" />{cur.path ? <code>emails/{cur.path}</code> : <>Made in the app (no file)</>}</div>
        <h1>{cur.code ? <span className="ex-code big">{cur.code}</span> : null}{cur.title}</h1>
        <div className="ex-meta">
          {cur.group !== GUIDES ? <span className="pill">{cur.group}</span> : null}
          {fm.kind ? <span className="pill">{fm.kind}</span> : null}
          {stage ? <span className="pill">Logged → {STAGE[stage].name}</span> : fm.stage_after_send ? <span className="pill">Stage: {fm.stage_after_send}</span> : null}
          {fm.touch ? <span className="pill">Touch {fm.touch}</span> : null}
          {fm.marks_shared === "true" ? <span className="pill">Marks shared</span> : null}
          {fm.status ? <span className="pill">Status: {fm.status}</span> : null}
          {fm.outbound === "true" ? <span className="pill">Outbound: review before sending</span> : null}
          {cur.id ? <span className="pill">ID {cur.id}</span> : null}
        </div>
        {t ? <div className="row ex-actions">
          <FlashButton label="Copy subject + body" onClick={() => copy(who ? (t.subject ? "Subject: " + fill(t.subject, who) + "\n\n" : "") + fill(t.body, who) : (t.subject ? "Subject: " + t.subject + "\n\n" : "") + t.body)} />
          <FlashButton label="Copy HubSpot version" onClick={() => copy((t.subject ? "Subject: " + toHubspot(t.subject) + "\n\n" : "") + toHubspot(t.body))} />
          <span className="small muted">To send it, open a contact (or Bulk email) and pick <b>{t.name}</b>. Names, links and your Profile fill in.</span>
        </div> : null}
        {who ? <div className="ex-who"><UserCheck size={16} aria-hidden="true" /><span>Filled in for <b>{name(who)}</b>{schoolOf(who) ? <> · {schoolOf(who)}</> : null}. Highlighted text came from their record and your Profile.</span>
          <button className="b sm" onClick={() => setLid("")}><X size={13} aria-hidden="true" /> Clear</button></div> : null}
        <div className="md"><Markdown remarkPlugins={[remarkGfm]} components={components}>{prep(cur.md)}</Markdown></div>
      </> : <p className="muted">No emails yet. Add a note to <code>emails/</code>, then reload.</p>}
    </article>
    <Queue pick={lid} onPick={id => setLid(lid === id ? "" : id)} />
  </div>;
}
