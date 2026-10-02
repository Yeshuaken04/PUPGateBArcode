import fs from "fs/promises";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "db.json");

export const DEMO_ACCOUNTS = [
  { username: "admin", password: "PUPBataan@123", full_name: "Administrator", role: "admin", email: "admin@pup.edu.ph" },
  { username: "guard", password: "guard123", full_name: "Gate Guard", role: "guard", email: "guard@pup.edu.ph" },
  { username: "operator", password: "operator123", full_name: "System Operator", role: "operator", email: "operator@pup.edu.ph" },
];

const EMPTY_STATE = {
  students: [],
  vehicles: [],
  logs: [],
  gateEvents: [],
  gate: { id: 1, name: "Main Gate", status: "closed", relay_mode: "mock", com_port: "COM3", pulse_seconds: 0.8 },
  users: [],
  issuedToken: null,
  issuedTokens: [],
};

export async function readState() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return structuredClone(EMPTY_STATE);
  }
}

export async function writeState(data) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}
