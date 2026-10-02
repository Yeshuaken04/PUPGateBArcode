import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { DEMO_ACCOUNTS, readState, writeState } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const backendDir = path.dirname(__filename);
const projectDir = path.dirname(backendDir);
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "pup-gate-backend" });
});

app.post("/api/auth/login", (req, res) => {
  const { username = "", password = "" } = req.body || {};
  const account = DEMO_ACCOUNTS.find(
    (item) => item.username.toLowerCase() === String(username).trim().toLowerCase() && item.password === String(password)
  );

  if (!account) {
    return res.status(401).send("Invalid username or password.");
  }

  res.json({
    access_token: `node-${Date.now().toString(36)}`,
    user: {
      id: account.username === "admin" ? 1 : account.username === "guard" ? 2 : 3,
      username: account.username,
      full_name: account.full_name,
      role: account.role,
      email: account.email,
    },
  });
});

app.get("/api/state", async (_req, res, next) => {
  try {
    res.json(await readState());
  } catch (error) {
    next(error);
  }
});

app.put("/api/state", async (req, res, next) => {
  try {
    await writeState(req.body || {});
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

if (process.env.NODE_ENV === "production") {
  const distDir = path.join(projectDir, "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
