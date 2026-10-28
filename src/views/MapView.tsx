// Missouri district map: leads per district as a heat map. Click a district to filter Schools.
import { useMemo, useRef } from "react";
import { DL, W, emptyFilt, goTo, render, ui } from "../store";
import { esc, normD } from "../lib/helpers";
import { LeadTable } from "../components/ui";
import type { DistrictFeature } from "../lib/types";

const VW = 1000, VH = 700, PAD = 10;

// Linear-equirectangular projection; at Missouri's scale it's fine without a real projection.
function project(feats: DistrictFeature[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const rings = (g: DistrictFeature["geometry"]) => g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
  feats.forEach(f => rings(f.geometry).forEach(r => r.forEach(([x, y]) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; })));
  // Latitude correction so Missouri doesn't look squashed.
  const midLat = (minY + maxY) / 2, kx = Math.cos(midLat * Math.PI / 180);
  const dx = (maxX - minX) * kx, dy = maxY - minY;
  const s = Math.min((VW - 2 * PAD) / dx, (VH - 2 * PAD) / dy);
  const ox = (VW - dx * s) / 2, oy = (VH - dy * s) / 2;
  const px = (x: number) => ox + (x - minX) * kx * s, py = (y: number) => VH - oy - (y - minY) * s;
  const ringPath = (r: number[][]) => r.map(([x, y], i) => (i ? "L" : "M") + px(x).toFixed(1) + " " + py(y).toFixed(1)).join("") + "Z";
  return feats.map(f => f.geometry.type === "Polygon" ? f.geometry.coordinates.map(ringPath).join("") : f.geometry.coordinates.map(p => p.map(ringPath).join("")).join(""));
}

export function MapView() {
  const data = window.MO_DISTRICTS;
  const paths = useMemo(() => data?.features ? project(data.features) : [], [data]);
  const svgRef = useRef<SVGSVGElement>(null), tipRef = useRef<HTMLDivElement>(null);
  if (!data || !data.features) return <div className="card"><h2 style={{ marginTop: 0 }}>Map data not loaded</h2>
    <p><code>district-boundaries.js</code> wasn't found next to this file. It ships the Missouri school-district polygons (source: MO DESE / MSDIS). Reload once it's in the same folder as this HTML.</p></div>;

  const feats = data.features, L = DL();
  // Count leads per DESE district code and by normalized name.
  const byCode: Record<string, number> = {}, byName: Record<string, number> = {};
  L.forEach(l => {
    if (l.districtId) { const k = String(l.districtId).trim(); byCode[k] = (byCode[k] || 0) + 1; }
    const n = normD(l.district); if (n) byName[n] = (byName[n] || 0) + 1;
  });
  const counts = feats.map(f => { const c = f.properties.code; if (c && byCode[c] != null) return byCode[c]; return byName[normD(f.properties.name)] || 0; });
  const max = Math.max(1, ...counts);
  // Heat color: darker = more leads, in the accent blue family.
  const heat = (n: number) => { if (!n) return "var(--sx)"; const t = Math.min(1, n / max); return `hsl(220 70% ${85 - t * 55}%)`; };
  const total = counts.reduce((a, b) => a + b, 0), hit = counts.filter(n => n > 0).length;
  const ds = ui.ds;
  // District picked on Analytics: outline it on the map and list who is in it underneath
  const fN = normD(ui.mapFocus), inF = DL().filter(l => fN && normD(l.district) === fN);
  const fCodes = new Set(inF.map(l => String(l.districtId || "").trim()).filter(Boolean));
  const fIdx = fN ? feats.findIndex(f => (f.properties.code && fCodes.has(f.properties.code)) || normD(f.properties.name) === fN) : -1;

  const onMove = (e: React.MouseEvent) => {
    const tip = tipRef.current!, svg = svgRef.current!;
    const t = (e.target as Element).closest("path"); if (!t) { tip.style.display = "none"; return; }
    const i = +t.dataset.i!, f = feats[i], n = counts[i], rect = svg.getBoundingClientRect();
    tip.innerHTML = `<b>${esc(f.properties.name)}</b><br><span class="muted">${esc(f.properties.county || "")}${f.properties.county ? " County · " : ""}code ${esc(f.properties.code || "—")}</span><br>${n} ${n === 1 ? "lead" : "leads"}`;
    tip.style.display = "block";
    tip.style.left = Math.min(e.clientX - rect.left + 12, rect.width - tip.offsetWidth - 6) + "px";
    tip.style.top = (e.clientY - rect.top + 12) + "px";
  };
  const onClick = (e: React.MouseEvent) => {
    const t = (e.target as Element).closest("path"); if (!t) return;
    const f = feats[+t.dataset.i!], code = f.properties.code;
    // Prefer a district name that exists in the current list so the filter matches.
    let nm: string | null = null;
    if (code) { const l = L.find(x => String(x.districtId || "").trim() === code); if (l && l.district) nm = l.district; }
    if (!nm) { const nd = normD(f.properties.name); const l = L.find(x => normD(x.district) === nd); if (l && l.district) nm = l.district; }
    if (!nm) nm = f.properties.name;
    // Show the whole district: every stage, no leftover search or filters (as Home's district click does)
    ui.filt = { ...emptyFilt(), stage: "", district: nm }; ui.showAll = false; ui.view = "leads"; ui.pick = null; ui.mapFocus = ""; render();
  };

  return <div className="card">
    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
      <div><h2 style={{ margin: "0 0 4px" }}>Missouri lead map</h2>
        <div className="small muted">{total} {ds === "overseer" ? "overseers" : ds === "cto" ? "CTOs" : ds === "campaign" ? "campaign contacts" : ds === "pta" ? "PTA contacts" : ds === "user" ? "users" : ds === "affiliate" ? "affiliates" : "principals"} across {hit} of {feats.length} districts · click a district to filter Schools</div></div>
      <div className="row" style={{ alignItems: "center", gap: 8 }}><span className="small muted">fewer</span>
        <svg width="140" height="12" style={{ display: "block" }}><defs><linearGradient id="mapGrad" x1="0" x2="1"><stop offset="0" stopColor="hsl(220 70% 85%)" /><stop offset="1" stopColor="hsl(220 70% 30%)" /></linearGradient></defs><rect width="140" height="12" rx="2" fill="url(#mapGrad)" /></svg>
        <span className="small muted">more (max {max})</span></div>
    </div>
    <div style={{ position: "relative", marginTop: 12 }}>
      <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 6, display: "block" }}
        onMouseMove={onMove} onMouseLeave={() => { tipRef.current!.style.display = "none"; }} onClick={onClick}>
        {paths.map((d, i) => <path key={i} d={d} fill={heat(counts[i])} stroke="var(--line)" strokeWidth="0.5" data-i={i} data-n={counts[i]} />)}
        {fIdx >= 0 ? <path d={paths[fIdx]} fill="none" stroke="var(--warn)" strokeWidth="3" style={{ pointerEvents: "none" }} /> : null}
      </svg>
      <div ref={tipRef} style={{ position: "absolute", pointerEvents: "none", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 4, padding: "4px 8px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,.15)", display: "none", zIndex: 2, whiteSpace: "nowrap" }}></div>
    </div>
    {ui.mapFocus ? <div style={{ marginTop: 14 }} data-parity-skip>
      <div className="row"><h3 className="grow" style={{ margin: 0 }}>{ui.mapFocus} <span className="muted">· {inF.length} {inF.length === 1 ? W().one : W().many}{fIdx < 0 ? " · not found on the map" : ""}</span></h3>
        <button className="b sm" onClick={() => goTo({ view: "leads", label: ui.mapFocus, district: inF[0]?.district || ui.mapFocus })}>Open in {W().many} list</button>
        <button className="b sm" onClick={() => { ui.view = "stats"; ui.mapFocus = ""; render(); }}>‹ Back to Analytics</button>
        <button className="b sm" onClick={() => { ui.mapFocus = ""; render(); }}>Clear</button></div>
      {inF.length ? <div style={{ marginTop: 8 }}><LeadTable arr={inF} compact /></div> : <p className="muted">No {W().many} in this district on this list.</p>}
    </div> : null}
  </div>;
}
