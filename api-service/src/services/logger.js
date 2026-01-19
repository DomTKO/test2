// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
export function installProcessHandlers() {
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
  });
}

export function expressErrorHandler(err, _req, res, _next) {
  console.error("UNHANDLED EXPRESS ERROR:", err);
  if (res.headersSent) return;
  res.status(500).json({ code: "INTERNAL" });
}
