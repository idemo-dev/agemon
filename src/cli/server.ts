import express from "express";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import type { DashboardData } from "../engine/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Start local HTTP server to serve the dashboard.
 */
export function startServer(
  dashboard: DashboardData,
  port: number = 3333,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const app = express();

    // API endpoint for dashboard data
    app.get("/api/dashboard", (_req, res) => {
      res.json(dashboard);
    });

    // Serve static UI files (built by Vite)
    const uiDistPath = join(__dirname, "..", "ui");
    access(uiDistPath)
      .then(() => {
        app.use(express.static(uiDistPath));
        // SPA fallback
        app.get("*", (_req, res) => {
          res.sendFile(join(uiDistPath, "index.html"));
        });
      })
      .catch(() => {
        app.get("/", (_req, res) => {
          res.send(
            "<html><body><p>UI not built. Run <code>npm run build:ui</code> first, or use <code>npm run dev:ui</code> for development.</p></body></html>",
          );
        });
      });

    const server = app.listen(port, () => {
      console.log(`  Dashboard: http://localhost:${port}`);
      console.log(`  Press Ctrl+C to stop\n`);
      // Do NOT resolve — keep the process alive until killed
    });

    server.on("error", reject);

    process.on("SIGINT", () => {
      server.close();
      resolve();
    });
  });
}
