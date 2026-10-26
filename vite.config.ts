import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// emails/ is the source of the email templates. The dev server re-syncs public/email-templates.js whenever a note
// there changes and reloads the page; a build syncs once first, so dist/ always ships the current emails.
function emailsSync(): Plugin {
  const dir = path.resolve(import.meta.dirname, "emails"), script = path.resolve(import.meta.dirname, "scripts/sync-emails.py");
  const run = () => execFileSync("python3", [script], { stdio: "inherit" });
  let build = false;   // only `vite build` syncs up front (not vite-node scripts or tests)
  return {
    name: "emails-sync",
    buildStart() { if (build) run(); },
    configResolved(c) { build = c.command === "build" && !process.env.VITEST; },
    configureServer(server) {
      if (process.env.VITEST) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      server.watcher.add(dir);
      server.watcher.on("all", (_event, file) => {
        if (!file.startsWith(dir + path.sep) || !file.endsWith(".md")) return;
        clearTimeout(timer);
        timer = setTimeout(() => execFile("python3", [script], (err, out, errOut) => {
          if (err) { server.config.logger.error("[emails] sync failed: " + (errOut || err.message).trim()); return; }
          server.config.logger.info("[emails] " + out.split("\n")[0], { timestamp: true });
          server.ws.send({ type: "full-reload" });
        }), 200);
      });
    },
  };
}

// base "./" + single-file output: dist/index.html opens straight from disk (file://), like the old app.
// email-templates.js and district-boundaries.js stay as separate files next to it (copied from public/).
export default defineConfig({
  base: "./",
  plugins: [emailsSync(), react(), viteSingleFile({ removeViteModuleLoader: true })],
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"] },
});
