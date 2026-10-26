// Actions that need both the store and the stage logic.
import { S, openLead, save, ui } from "./store";
import { setNext } from "./lib/logic";
import { uid } from "./lib/helpers";
import type { Lead } from "./lib/types";

export function newLead() {
  const ds = ui.ds;
  const l = { id: uid(), ...(ds !== "principal" ? { type: ds } : {}), stage: "new", seq: 0, sent: [], activity: [], families: {}, path: "", createdAt: new Date().toISOString() } as Lead;
  setNext(l); S.leads.push(l); save(); openLead(l.id);
}
