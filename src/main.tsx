import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { tick } from "./lib/logic";
import { rptCss } from "./lib/report";
import favicon from "./assets/favicon.png";
import { ui } from "./store";
import { cloudOn, startCloud } from "./sync";

// Report styles for the Analytics tab, scoped under .rpt (same rules as the exported report)
document.head.insertAdjacentHTML("beforeend", `<style>.rpt{font-size:13px;line-height:1.45}\n${rptCss(".rpt ")}</style>`);

// Brand favicon, inlined so the single-file build keeps it
const icon = document.createElement("link"); icon.rel = "icon"; icon.type = "image/png"; icon.href = favicon; document.head.append(icon);

// Cloud build: sign in and load the team's data first (sync.ts runs tick() once it's loaded)
if (cloudOn) { ui.cloud = "signin"; startCloud(); }
else tick(); // contacted + 3 touches + overdue → Nurture
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
