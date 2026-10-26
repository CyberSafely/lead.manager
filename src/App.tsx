import { useEffect } from "react";
import { DL, S, closeDrawer, setView, ui, useStore } from "./store";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Drawer } from "./components/Drawer";
import { Today } from "./views/Today";
import { Calls } from "./views/Calls";
import { Leads } from "./views/Leads";
import { Board } from "./views/Board";
import { MapView } from "./views/MapView";
import { Templates } from "./views/Templates";
import { Home } from "./views/Home";
import { Stats } from "./views/Stats";
import { Data } from "./views/Data";
import { Help } from "./views/Help";
import { Profile } from "./views/Profile";
import { Social } from "./views/Social";
import { Empty } from "./views/Empty";
import { CloudGate } from "./components/SignIn";

const VIEW = { today: Today, calls: Calls, leads: Leads, board: Board, map: MapView, templates: Templates, dash: Home, stats: Stats, data: Data, help: Help, profile: Profile, social: Social };

export function App() {
  useStore();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && (ui.openId || ui.bulk)) closeDrawer(); };
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, []);
  if (ui.cloud !== "off" && ui.cloud !== "ready") return <CloudGate />;
  const v = ui.view;
  const empty = !DL().length && !["data", "templates", "help", "profile", "social"].includes(v) && !(v === "stats" && S.leads.length);
  const V = VIEW[v];
  return <>
    <Sidebar />
    <Header />
    <main id="main">
      {ui.cloud === "ready" && !S.settings.sender ? <div className="banner warn">Add <b>your</b> name for email sign-offs and call notes in <a href="#" onClick={e => { e.preventDefault(); setView("profile"); }}>Profile</a> (and pick yourself on the Calls tab).</div> : null}
      {empty ? <Empty /> : <V key={ui.ds} />}</main>
    <Drawer />
  </>;
}
