// Sidebar: an icon rail on the left (like Supabase's). Hovering it, or tabbing into it, slides the labels out over the
// page; the page itself never moves. Groups: work, reach, tools, and you at the bottom.
import { BarChart3, BookOpen, CalendarCheck, Database, House, KanbanSquare, Mail, Map as MapIcon, Megaphone, Phone, School, UserRound, type LucideIcon } from "lucide-react";
import { DL, setView, ui, type View } from "../store";
import { todayISO } from "../lib/helpers";
import shield from "../assets/shield-white.png";

type Item = [View, string, LucideIcon];
const GROUPS: Item[][] = [
  [["dash", "Home", House], ["today", "Today", CalendarCheck], ["calls", "Calls", Phone], ["leads", "Schools", School], ["board", "Board", KanbanSquare], ["map", "Map", MapIcon]],
  [["templates", "Emails", Mail], ["social", "Social", Megaphone], ["stats", "Analytics", BarChart3], ["data", "Data", Database]],
  [["help", "Process", BookOpen]],
];
const BOTTOM: Item[] = [["profile", "Profile", UserRound]];

export function Sidebar() {
  const t = todayISO(), due = DL().filter(l => l.nextDue && l.nextDue <= t && l.stage !== "lost").length;
  const btn = ([k, label, Icon]: Item) => <button key={k} className={ui.view === k ? "on" : ""} aria-current={ui.view === k ? "page" : undefined} onClick={() => setView(k)} title={label}>
    <span className="ic"><Icon size={19} strokeWidth={1.8} aria-hidden="true" />{k === "today" && due ? <span className="dotn" aria-hidden="true"></span> : null}</span>
    <span className="lb">{label}{k === "today" && due ? <span className="n">{due}</span> : null}</span>
  </button>;
  return <aside className="side">
    <div className="side-logo"><img src={shield} alt="CyberSafely" /></div>
    <nav aria-label="Main">
      {GROUPS.map((g, i) => <div key={i} className="side-g">{g.map(btn)}</div>)}
      <div className="side-g side-bottom">{BOTTOM.map(btn)}</div>
    </nav>
  </aside>;
}
