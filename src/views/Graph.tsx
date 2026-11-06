// Relationship chart: a district, the schools inside it, and the people at each — drawn with React Flow.
// Search a district or school to load its staff chart; click a node to open that lead (or the district → the map);
// add people you pick up on a call straight onto the chart (a new lead, or another contact at a school).
import { useCallback, useMemo, useRef, useState } from "react";
import { ReactFlow, Background, Controls, Handle, Position, applyNodeChanges, type Edge, type Node, type NodeChange, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DL, S, closeDrawer, goTo, isCto, isOv, isPr, lead, render, save, setDs, ui, useStore } from "../store";
import { addContact, log, setNext } from "../lib/logic";
import { STAGE } from "../lib/pipeline";
import { name, normD, schoolOf, uid } from "../lib/helpers";
import type { Lead, ListId, StageId } from "../lib/types";

const NODE_W = 210, SLOT = 236, ROW = 150;

/* ---------- node rendering ---------- */
interface BoxData {
  kind: "district" | "lead" | "contact";
  title: string; role: string; subtitle?: string; accent: string;
  del?: () => void;
  [k: string]: unknown;
}
function BoxNode({ data }: NodeProps) {
  const d = data as BoxData;
  return <div className={"gnode gnode-" + d.kind} style={{ borderLeftColor: d.accent }}>
    <Handle type="target" position={Position.Top} className="ghandle" isConnectable={false} />
    <div className="gnode-role" style={{ color: d.accent }}>{d.role}</div>
    <div className="gnode-title">{d.title}</div>
    {d.subtitle ? <div className="gnode-sub">{d.subtitle}</div> : null}
    {d.del ? <button className="gnode-del" title="Remove from chart" aria-label="Remove" onClick={e => { e.stopPropagation(); d.del!(); }}>×</button> : null}
    <Handle type="source" position={Position.Bottom} className="ghandle" isConnectable={false} />
  </div>;
}
const nodeTypes = { box: BoxNode };

/* ---------- tree layout (tidy, centered parents) ---------- */
interface TNode { id: string; data: BoxData; children: TNode[]; x: number; y: number }
function layout(nodes: TNode[]) {
  let leaf = 0;
  const place = (n: TNode, depth: number) => {
    n.y = depth * ROW;
    if (!n.children.length) { n.x = leaf * SLOT; leaf++; }
    else { n.children.forEach(c => place(c, depth + 1)); n.x = (n.children[0].x + n.children[n.children.length - 1].x) / 2; }
  };
  nodes.forEach(n => place(n, 0));
}

/* ---------- district helpers ---------- */
const roleOf = (l: Lead) => (l.jobtitle || (isOv(l) ? "Superintendent / overseer" : isCto(l) ? "Technology / CTO" : "Principal")).trim();
const accentOf = (l: Lead) => "var(" + (STAGE[l.stage as StageId]?.c || "--s0") + ")";

function openLeadOnGraph(l: Lead) {
  const t = (l.type || "principal") as ListId;
  if (t !== ui.ds) { setDs(t); ui.view = "graph"; }   // setDs resets filters + closes the drawer; stay on the chart
  ui.openId = l.id; ui.bulk = null; render();
}

export function Graph() {
  useStore();
  const districtName = ui.graphDistrict, districtId = String(ui.graphDistrictId || "").trim();
  const nid = districtId, nkey = normD(districtName);
  const inDist = (l: Lead) => (!!nid && String(l.districtId || "").trim() === nid) || (!!nkey && normD(l.district) === nkey);

  // Every lead in the district, across all lists (principals, overseers, CTOs, …)
  const members = districtName || districtId ? S.leads.filter(inDist) : [];
  const schools = members.filter(isPr).sort((a, b) => schoolOf(a).localeCompare(schoolOf(b)));
  const overseers = members.filter(isOv).sort((a, b) => name(a).localeCompare(name(b)));
  const ctos = members.filter(isCto).sort((a, b) => name(a).localeCompare(name(b)));
  const other = members.filter(l => !isPr(l) && !isOv(l) && !isCto(l)).sort((a, b) => name(a).localeCompare(name(b)));

  // A signature of what the chart draws; the layout rebuilds only when it changes (so dragging sticks).
  const sig = JSON.stringify([districtName, districtId, members.map(l =>
    [l.id, l.type, l.stage, l.first, l.last, l.school, l.jobtitle, (l.contacts || []).map(c => [c.id, c.first, c.last, c.role])])]);

  const { baseNodes, edges } = useMemo(() => {
    const edges: Edge[] = [];
    const contactsOf = (l: Lead): TNode[] => (l.contacts || []).map(c => ({
      id: "c:" + c.id, children: [], x: 0, y: 0,
      data: {
        kind: "contact", accent: "var(--muted)",
        role: c.role || "Contact", title: [c.first, c.last].filter(Boolean).join(" ") || c.email || c.phone || "(no name)",
        subtitle: c.primary ? "Main contact" : (c.email || c.phone || ""),
        del: () => { if (confirm("Remove this contact from " + schoolOf(l) + "?")) { l.contacts = (l.contacts || []).filter(x => x.id !== c.id); log(l, "Contact removed", [c.first, c.last].filter(Boolean).join(" ") || "contact"); save(); } },
      },
    }));
    const leadNode = (l: Lead): TNode => ({
      id: l.id, children: contactsOf(l), x: 0, y: 0,
      data: {
        kind: "lead", accent: accentOf(l),
        role: roleOf(l), title: name(l),
        subtitle: isPr(l) ? schoolOf(l) : (STAGE[l.stage as StageId]?.name || ""),
        del: () => { if (confirm("Delete " + name(l) + " (" + schoolOf(l) + ") and its history from the chart and your lists?")) { S.leads = S.leads.filter(x => x.id !== l.id); closeDrawer(); save(); } },
      },
    });
    // District → superintendent(s)/overseer(s) → the schools → each school's contacts.
    // CTOs and any other district people sit alongside the overseer, under the district.
    const schoolNodes = schools.map(leadNode);
    let children: TNode[];
    if (overseers.length) {
      const ovNodes = overseers.map((o, i) => {
        const n = leadNode(o);
        if (i === 0) n.children = [...n.children, ...schoolNodes];   // schools hang off the lead overseer
        return n;
      });
      children = [...ovNodes, ...ctos.map(leadNode), ...other.map(leadNode)];
    } else {
      // No superintendent on the chart yet: schools (and the rest) sit directly under the district.
      children = [...ctos.map(leadNode), ...schoolNodes, ...other.map(leadNode)];
    }
    const root: TNode = {
      id: "district", children, x: 0, y: 0,
      data: { kind: "district", accent: "var(--accent)", role: "District", title: districtName || "(unnamed district)", subtitle: `${schools.length} ${schools.length === 1 ? "school" : "schools"} · ${members.length} ${members.length === 1 ? "lead" : "leads"}` },
    };
    layout([root]);
    const flat: TNode[] = [];
    const walk = (n: TNode, parent?: string) => { flat.push(n); if (parent) edges.push({ id: parent + "->" + n.id, source: parent, target: n.id, type: "smoothstep" }); n.children.forEach(c => walk(c, n.id)); };
    walk(root);
    const baseNodes: Node[] = flat.map(n => ({ id: n.id, type: "box", position: { x: n.x, y: n.y }, data: n.data, draggable: true, width: NODE_W }));
    return { baseNodes, edges };
  }, [sig]);

  // Controlled nodes: reset the layout when the chart signature changes; dragging persists within a chart.
  const [nodes, setNodes] = useState<Node[]>(baseNodes);
  const sigRef = useRef(sig);
  if (sigRef.current !== sig) { sigRef.current = sig; setNodes(baseNodes); }   // adjust state during render (re-runs before commit)
  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds)), []);
  const onNodeClick = (_: unknown, node: Node) => {
    const d = node.data as BoxData;
    if (d.kind === "district") { goTo({ view: "map", label: districtName, district: districtName }); return; }
    // a contact node opens its school's lead (where the contact lives)
    if (d.kind === "contact") { const parent = members.find(l => (l.contacts || []).some(c => "c:" + c.id === node.id)); if (parent) openLeadOnGraph(parent); return; }
    const l = lead(node.id); if (l) openLeadOnGraph(l);
  };

  const hasDistrict = !!(districtName || districtId);

  return <div className="card graph-card">
    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div><h2 style={{ margin: "0 0 4px" }}>Relationship chart</h2>
        <div className="small muted">Search a district or school, then click any box to open it. {hasDistrict ? "Drag to rearrange." : ""}</div></div>
      <GraphSearch />
    </div>

    {!hasDistrict ? <StartHint /> : <>
      <div className="row" style={{ margin: "10px 0 6px", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{districtName || "(district)"}</h3>
        <span className="muted small">· {members.length} {members.length === 1 ? "lead" : "leads"}</span>
        <span className="grow" />
        <AddPerson schools={schools} />
        <button className="b sm" onClick={() => goTo({ view: "map", label: districtName, district: districtName })}>Open on map</button>
        <button className="b sm" onClick={() => { ui.graphDistrict = ""; ui.graphDistrictId = ""; render(); }}>Clear</button>
      </div>
      <div className="graph-canvas">
        {members.length ? <ReactFlow key={sig} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onNodeClick={onNodeClick}
          fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.3} maxZoom={1.6} nodesConnectable={false} proOptions={{ hideAttribution: false }}>
          <Background gap={22} color="var(--line)" />
          <Controls showInteractive={false} />
        </ReactFlow> : <div className="graph-empty">
          <p className="muted">No one is on this district's chart yet.</p>
          <AddPerson schools={schools} startOpen />
        </div>}
      </div>
    </>}
  </div>;
}

/* ---------- search ---------- */
interface Hit { kind: "district" | "school"; name: string; id: string; district: string; sub: string }
function GraphSearch() {
  useStore();
  const [q, setQ] = useState(""), [open, setOpen] = useState(false);
  const qN = normD(q);

  const hits = useMemo<Hit[]>(() => {
    if (qN.length < 2) return [];
    // Districts in the data, keyed by DESE id when present, otherwise by normalized name
    const dmap = new Map<string, { name: string; id: string; schools: number; people: number }>();
    S.leads.forEach(l => {
      const nm = l.district; if (!nm) return;
      const id = String(l.districtId || "").trim();
      const key = id ? "#" + id : normD(nm);
      const e = dmap.get(key) || { name: nm, id, schools: 0, people: 0 };
      if (isPr(l)) e.schools++; else e.people++;
      if (!e.id && id) e.id = id;
      dmap.set(key, e);
    });
    const districts: Hit[] = [...dmap.values()].filter(d => normD(d.name).includes(qN))
      .map(d => ({ kind: "district", name: d.name, id: d.id, district: d.name, sub: `${d.schools} school${d.schools === 1 ? "" : "s"} · ${d.people} other` }));
    // Schools (principals) by name → resolve to their district
    const schools: Hit[] = S.leads.filter(l => isPr(l) && l.school && normD(l.school).includes(qN))
      .slice(0, 12).map(l => ({ kind: "school", name: l.school!, id: String(l.districtId || "").trim(), district: l.district || l.school!, sub: l.district || "(no district)" }));
    // Missouri districts from the map not already in the data (so you can start an empty one)
    const known = new Set([...dmap.values()].map(d => d.id ? "#" + d.id : normD(d.name)));
    const feats = (window.MO_DISTRICTS?.features || []).filter(f => normD(f.properties.name).includes(qN) && !known.has(f.properties.code ? "#" + f.properties.code : normD(f.properties.name)))
      .slice(0, 6).map<Hit>(f => ({ kind: "district", name: f.properties.name, id: f.properties.code || "", district: f.properties.name, sub: f.properties.county ? f.properties.county + " County" : "on the map" }));
    return [...districts, ...schools, ...feats]
      .sort((a, b) => (+normD(b.name).startsWith(qN) - +normD(a.name).startsWith(qN))).slice(0, 10);
  }, [qN]);

  const choose = (h: Hit) => { ui.graphDistrict = h.district; ui.graphDistrictId = h.id; setQ(""); setOpen(false); render(); };

  return <div className="map-search graph-search" style={{ margin: 0, maxWidth: 360, width: "100%" }}>
    <input type="search" placeholder="Find a district or school, e.g. Smithville" value={q} aria-label="Find a district or school"
      onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 160)}
      onKeyDown={e => { if (e.key === "Enter" && hits[0]) choose(hits[0]); if (e.key === "Escape") { setQ(""); setOpen(false); } }} />
    {open && qN.length >= 2 ? <div className="map-hits">{hits.length ? hits.map((h, i) => <button key={i} onMouseDown={e => e.preventDefault()} onClick={() => choose(h)}>
      <b>{h.kind === "school" ? h.name : h.name}</b><span className="small muted">{h.kind === "school" ? "School · " + h.sub : h.sub}</span></button>)
      : <div className="small muted" style={{ padding: "6px 10px" }}>No match for "{q}".</div>}</div> : null}
  </div>;
}

/* ---------- add a person to the district ---------- */
const ADD_ROLES: { v: ListId | "contact"; label: string; needsSchool?: boolean }[] = [
  { v: "principal", label: "School / principal", needsSchool: true },
  { v: "overseer", label: "Superintendent / district overseer" },
  { v: "cto", label: "District technology / CTO" },
  { v: "contact", label: "Another contact at a school", needsSchool: true },
];
// Roles you meet at a school or district, offered as a dropdown (you can still type your own).
// Receptionist is first: it's the front-office name Giancarlo asks for on every call.
const SCHOOL_ROLES = [
  "Receptionist", "Front office / secretary", "Office manager", "Administrative assistant",
  "Principal", "Assistant principal", "Dean of students",
  "Guidance counselor", "Technology / IT", "Teacher", "School nurse",
  "Athletic director", "Librarian", "Social worker",
  "Superintendent", "Assistant superintendent", "Other",
];
function splitName(n: string) { const p = n.trim().split(/\s+/).filter(Boolean); return { first: p[0] || "", last: p.slice(1).join(" ") }; }

function AddPerson({ schools, startOpen }: { schools: Lead[]; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  const blank = { role: "principal" as ListId | "contact", name: "", title: "", email: "", phone: "", school: "", parent: schools[0]?.id || "" };
  const [f, setF] = useState({ ...blank });
  const def = ADD_ROLES.find(r => r.v === f.role)!;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const canSave = !!(f.name.trim() || f.email.trim()) && (!def.needsSchool || (f.role === "contact" ? !!f.parent : !!f.school.trim()));
  const save1 = () => {
    if (!canSave) return;
    const nm = splitName(f.name);
    if (f.role === "contact") {
      const parent = schools.find(s => s.id === f.parent); if (!parent) return;
      addContact(parent, { first: nm.first || undefined, last: nm.last || undefined, role: f.title.trim() || undefined, email: f.email.trim() || undefined, phone: f.phone.trim() || undefined });
      save(); openLeadOnGraph(parent);
    } else {
      const type = f.role as ListId;
      const l = { id: uid(), ...(type !== "principal" ? { type } : {}), stage: "new" as StageId, seq: 0, sent: [], activity: [], families: {}, path: "",
        district: ui.graphDistrict, ...(ui.graphDistrictId ? { districtId: ui.graphDistrictId } : {}),
        ...(nm.first ? { first: nm.first } : {}), ...(nm.last ? { last: nm.last } : {}),
        ...(f.title.trim() ? { jobtitle: f.title.trim() } : {}), ...(f.email.trim() ? { email: f.email.trim().toLowerCase() } : {}),
        ...(f.phone.trim() ? { phone: f.phone.trim() } : {}), ...(type === "principal" && f.school.trim() ? { school: f.school.trim() } : {}),
        createdAt: new Date().toISOString() } as Lead;
      setNext(l); S.leads.push(l); save(); openLeadOnGraph(l);
    }
    setF({ ...blank }); setOpen(false);
  };

  if (!open) return <button className="b sm primary" onClick={() => setOpen(true)}>+ Add person</button>;
  return <div className="card graph-add" data-parity-skip>
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      <input value={f.name} onChange={set("name")} placeholder="Name" style={{ flex: "1 1 150px" }} autoFocus />
      <select value={f.role} onChange={set("role")} style={{ flex: "1 1 170px" }}>{ADD_ROLES.map(r => <option key={r.v} value={r.v}>{r.label}</option>)}</select>
    </div>
    {f.role === "contact"
      ? <div style={{ marginTop: 6 }}><select value={f.parent} onChange={set("parent")} style={{ width: "100%" }} aria-label="Which school">
        {schools.length ? schools.map(s => <option key={s.id} value={s.id}>{schoolOf(s)}</option>) : <option value="">No schools yet — add one first</option>}</select></div>
      : def.needsSchool ? <div style={{ marginTop: 6 }}><input value={f.school} onChange={set("school")} placeholder="School name" style={{ width: "100%" }} /></div> : null}
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      <input list="cs-graph-roles" value={f.title} onChange={set("title")} placeholder="Role (e.g. Receptionist)" style={{ flex: "1 1 150px" }} />
      <datalist id="cs-graph-roles">{SCHOOL_ROLES.map(r => <option key={r} value={r} />)}</datalist>
    </div>
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      <input value={f.email} onChange={set("email")} placeholder="Email" style={{ flex: "1 1 150px" }} />
      <input value={f.phone} onChange={set("phone")} placeholder="Phone" style={{ flex: "1 1 120px" }} />
    </div>
    <div className="row" style={{ gap: 6, marginTop: 8 }}>
      <button className="b sm primary" disabled={!canSave} onClick={save1}>Add to chart</button>
      <button className="b sm" onClick={() => { setF({ ...blank }); setOpen(false); }}>Cancel</button>
    </div>
  </div>;
}

/* ---------- empty state ---------- */
function StartHint() {
  const recent = useMemo(() => {
    const m = new Map<string, { name: string; id: string; n: number }>();
    DL().forEach(l => { if (!l.district) return; const id = String(l.districtId || "").trim(); const k = id ? "#" + id : normD(l.district); const e = m.get(k) || { name: l.district, id, n: 0 }; e.n++; m.set(k, e); });
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [ui.ds]);
  return <div className="graph-start">
    <p className="muted" style={{ maxWidth: 520 }}>Search a district or school above to chart who's in it — the district, each school, and the people you've met. Click any box to open that lead; click the district to see it on the map.</p>
    {recent.length ? <div style={{ marginTop: 8 }}><div className="small muted" style={{ marginBottom: 6 }}>Jump to a district:</div>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{recent.map(d => <button key={d.name} className="b sm" onClick={() => { ui.graphDistrict = d.name; ui.graphDistrictId = d.id; render(); }}>{d.name} <span className="muted">· {d.n}</span></button>)}</div></div> : null}
  </div>;
}
