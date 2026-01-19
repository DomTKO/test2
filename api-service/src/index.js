// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import cookieParser from "cookie-parser";

import { PORT } from "./config/env.js";
import { applyCors } from "./middleware/cors.js";
import { initConfig } from "./config/initConfig.js";
import { installProcessHandlers, expressErrorHandler } from "./services/logger.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ballotsRoutes from "./routes/ballots.routes.js";
import configRoutes from "./routes/config.routes.js";
import contentRoutes from "./routes/content.routes.js";
import verifierRoutes from "./routes/verifier.routes.js";

const app = express();

app.set("trust proxy", 1);
installProcessHandlers();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "5mb" }));
app.use(cookieParser());

applyCors(app);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Routes
app.use(authRoutes);
app.use(adminRoutes);
app.use(ballotsRoutes);
app.use(configRoutes);
app.use(contentRoutes);
app.use(verifierRoutes);

// Global error handler
app.use(expressErrorHandler);

// Startup
(async () => {
  try {
    await initConfig();
  } catch (e) {
    console.warn("initConfig failed (continuing with defaults):", e?.message);
  }

  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
})();
