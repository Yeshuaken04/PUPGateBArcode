
import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Camera,
  Car,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Download,
  Eye,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  PackageSearch,
  Plus,
  Barcode,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShieldX,
  SlidersHorizontal,
  SquareActivity,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import pupLogo from "./assets/logo200.svg";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "pup_gate_frontend_state_v2";
const AUTH_KEY = "pup_gate_user";
const TOKEN_KEY = "pup_gate_token";

const MAROON = "#7A0010";
const LIGHT_MAROON = "#b4232b";

const DEMO_ACCOUNTS = [
  { username: "admin", password: "PUPBataan@123", full_name: "Administrator", role: "admin", email: "admin@pup.edu.ph" },
  { username: "guard", password: "guard123", full_name: "Gate Guard", role: "guard", email: "guard@pup.edu.ph" },
  { username: "operator", password: "operator123", full_name: "System Operator", role: "operator", email: "operator@pup.edu.ph" },
];

const NAV_ITEMS = [
  ["Dashboard", "/", LayoutDashboard, ["admin", "guard", "operator"]],
  ["Student Vehicles", "/vehicles", Car, ["admin"]],
  ["Barcode Management", "/qr", Barcode, ["admin"]],
  ["Scanner (Live)", "/scanner", Camera, ["admin", "guard"]],
  ["Entry / Exit Logs", "/logs", ClipboardList, ["admin", "guard", "operator"]],
  ["Gate Control", "/gate", SquareActivity, ["admin", "guard"]],
  ["Reports & Analytics", "/reports", BarChart3, ["admin", "operator"]],
  ["Users & Roles", "/users", Users, ["admin"]],
  ["System Settings", "/settings", Settings, ["admin"]],
];

function uid(prefix = "") {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function readJSON(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normalizeDirection(value) {
  return String(value || "entry").toLowerCase() === "exit" ? "exit" : "entry";
}

function findIssuedRecord(state, rawToken) {
  const raw = String(rawToken || "").trim();
  const normalizedToken = normalizeToken(raw);
  const storedState = readJSON(STORAGE_KEY, makeInitialData());

  const candidates = [
    ...(state.issuedTokens || []),
    state.issuedToken,
    ...(storedState.issuedTokens || []),
    storedState.issuedToken,
  ].filter(Boolean);

  return (
    candidates.find((entry) => String(entry?.token || "").trim() === raw) ||
    candidates.find((entry) => normalizeToken(entry?.token) === normalizedToken) ||
    candidates.find((entry) => String(entry?.token || "").toLowerCase().includes(raw.toLowerCase())) ||
    null
  );
}

function writeJSON(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

async function apiJSON(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

function makeInitialData() {
  const students = [
    { id: 1, student_id: "2021-12345", full_name: "Juan Dela Cruz", course: "BSIT", year: "3", section: "A", contact_number: "09171234567", is_active: true },
    { id: 2, student_id: "2022-06789", full_name: "Maria Santos", course: "BSBA", year: "2", section: "B", contact_number: "09181234567", is_active: true },
    { id: 3, student_id: "2021-09876", full_name: "Mark Reyes", course: "BSEE", year: "4", section: "A", contact_number: "09191234567", is_active: true },
    { id: 4, student_id: "2023-11223", full_name: "Ana Cruz", course: "BSCE", year: "1", section: "C", contact_number: "09061234567", is_active: true },
  ];

  const vehicles = [
    { id: 1, student_id: 1, vehicle_type: "motorcycle", plate_number: "ABC-1234", brand_model: "Yamaha Aerox 155", color: "Black", valid_until: "2026-12-31", is_active: true },
    { id: 2, student_id: 2, vehicle_type: "motorcycle", plate_number: "DEF-5678", brand_model: "Honda Click 125", color: "Red", valid_until: "2026-12-31", is_active: true },
    { id: 3, student_id: 3, vehicle_type: "car", plate_number: "GHI-9012", brand_model: "Toyota Vios", color: "White", valid_until: "2026-12-31", is_active: true },
    { id: 4, student_id: 4, vehicle_type: "car", plate_number: "JKL-3456", brand_model: "Mitsubishi Mirage", color: "Gray", valid_until: "2026-12-31", is_active: true },
  ];

  const logs = [
    { id: 1, scanned_at: "2026-06-12T10:21:00", student_id: 1, vehicle_id: 1, gate: "Main Gate", direction: "entry", status: "authorized" },
    { id: 2, scanned_at: "2026-06-12T10:19:00", student_id: 2, vehicle_id: 2, gate: "Main Gate", direction: "entry", status: "authorized" },
    { id: 3, scanned_at: "2026-06-12T10:18:00", student_id: 3, vehicle_id: 3, gate: "Main Gate", direction: "exit", status: "authorized" },
    { id: 4, scanned_at: "2026-06-12T10:15:00", student_id: null, vehicle_id: null, gate: "Main Gate", direction: "entry", status: "unauthorized" },
    { id: 5, scanned_at: "2026-06-12T10:10:00", student_id: 4, vehicle_id: 4, gate: "Main Gate", direction: "entry", status: "authorized" },
  ];

  const gateEvents = [
    { id: 1, occurred_at: "2026-06-12T10:21:05", operator: "Administrator", event_type: "Gate Open", result: "success", reason: "Authorized scan" },
    { id: 2, occurred_at: "2026-06-12T10:15:13", operator: "Gate Guard", event_type: "Denied Access", result: "failed", reason: "Invalid token" },
  ];

  return {
    students,
    vehicles,
    logs,
    gateEvents,
    gate: {
      id: 1,
      name: "Main Gate",
      status: "closed",
      relay_mode: "mock",
      com_port: "COM3",
      pulse_seconds: 0.8,
    },
    users: [
      { id: 1, full_name: "Administrator", username: "admin", role: "admin", is_active: true },
      { id: 2, full_name: "Gate Guard", username: "guard", role: "guard", is_active: true },
      { id: 3, full_name: "System Operator", username: "operator", role: "operator", is_active: true },
    ],
    issuedToken: null,
    issuedTokens: [],
  };
}

function getStudentById(state, studentId) {
  return state.students.find((student) => Number(student.id) === Number(studentId));
}

function getVehicleById(state, vehicleId) {
  return state.vehicles.find((vehicle) => Number(vehicle.id) === Number(vehicleId));
}

function toLocalTime(value) {
  return new Date(value).toLocaleString();
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isToday(isoString) {
  return isoString?.slice(0, 10) === todayKey();
}

function barcodeDataUrl(value, width = 560, height = 150) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, String(value || "EMPTY"), {
    format: "CODE128",
    width: 2,
    height,
    displayValue: true,
    margin: 12,
    background: "#ffffff",
    lineColor: "#111827",
  });
  return canvas.toDataURL("image/png", 1);
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

const AppDataContext = createContext(null);

function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}


function AppDataProvider({ children }) {
  const [state, setState] = useState(() => readJSON(STORAGE_KEY, makeInitialData()));
  const hydratedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const serverState = await apiJSON("/api/state");
        if (!mounted) return;
        if (serverState && typeof serverState === "object") {
          setState(serverState);
          writeJSON(STORAGE_KEY, serverState);
        }
      } catch {
        if (!mounted) return;
        const cached = readJSON(STORAGE_KEY, makeInitialData());
        setState(cached);
      } finally {
        hydratedRef.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    writeJSON(STORAGE_KEY, state);
    if (!hydratedRef.current) return;

    apiJSON("/api/state", {
      method: "PUT",
      body: JSON.stringify(state),
    }).catch(() => {});
  }, [state]);

  const actions = useMemo(() => {
    const persist = (updater) =>
      setState((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        return next;
      });

    return {
      resetDemo: () => persist(makeInitialData()),
      setLoggedUser: (profile) => {
        if (typeof window === "undefined") return;
        localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
        localStorage.setItem(TOKEN_KEY, `local-${uid()}`);
      },
      logout: () => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(TOKEN_KEY);
      },
      saveStudent: (student) =>
        persist((current) => {
          const normalized = {
            ...student,
            id: student.id ? Number(student.id) : Number(current.students.at(-1)?.id || 0) + 1,
            is_active: student.is_active !== false,
          };
          const students = student.id
            ? current.students.map((item) => (Number(item.id) === Number(student.id) ? normalized : item))
            : [...current.students, normalized];
          return { ...current, students };
        }),
      deleteStudent: (id) =>
        persist((current) => ({
          ...current,
          students: current.students.filter((student) => Number(student.id) !== Number(id)),
          vehicles: current.vehicles.filter((vehicle) => Number(vehicle.student_id) !== Number(id)),
        })),
      saveVehicle: (vehicle) =>
        persist((current) => {
          const normalized = {
            ...vehicle,
            id: vehicle.id ? Number(vehicle.id) : Number(current.vehicles.at(-1)?.id || 0) + 1,
            student_id: Number(vehicle.student_id),
            is_active: vehicle.is_active !== false,
          };
          const vehicles = vehicle.id
            ? current.vehicles.map((item) => (Number(item.id) === Number(vehicle.id) ? normalized : item))
            : [...current.vehicles, normalized];
          return { ...current, vehicles };
        }),
      createStudentWithBarcode: (details) => {
        let createdRecord = null;

        persist((current) => {
          const student = {
            student_id: details.student_id.trim(),
            full_name: details.full_name.trim(),
            course: details.course.trim(),
            year: details.year.trim(),
            section: details.section.trim(),
            contact_number: details.contact_number.trim(),
            id: Number(current.students.at(-1)?.id || 0) + 1,
            is_active: true,
          };
          const vehicle = {
            ...details.vehicle,
            id: Number(current.vehicles.at(-1)?.id || 0) + 1,
            student_id: student.id,
            is_active: true,
          };
          const token = `PUP-${uid("TOK-").toUpperCase()}`;
          createdRecord = {
            token,
            token_hint: token.slice(0, 10),
            vehicle_id: vehicle.id,
            issued_at: new Date().toISOString(),
            student_id: student.id,
          };

          return {
            ...current,
            students: [...current.students, student],
            vehicles: [...current.vehicles, vehicle],
            issuedTokens: [...(current.issuedTokens || []), createdRecord],
            issuedToken: createdRecord,
          };
        });

        return createdRecord;
      },
      deleteVehicle: (id) =>
        persist((current) => ({
          ...current,
          vehicles: current.vehicles.filter((vehicle) => Number(vehicle.id) !== Number(id)),
        })),
      saveUser: (user) =>
        persist((current) => {
          const normalized = {
            ...user,
            id: user.id ? Number(user.id) : Number(current.users.at(-1)?.id || 0) + 1,
            is_active: user.is_active !== false,
          };
          const users = user.id
            ? current.users.map((item) => (Number(item.id) === Number(user.id) ? normalized : item))
            : [...current.users, normalized];
          return { ...current, users };
        }),
      issueToken: (vehicleId) => {
        let issuedRecord = null;

        persist((current) => {
          const vehicle = getVehicleById(current, vehicleId);
          if (!vehicle) return current;

          const existingRecord = (current.issuedTokens || []).find((item) => Number(item.vehicle_id) === Number(vehicleId));
          if (existingRecord) {
            issuedRecord = existingRecord;
            return { ...current, issuedToken: existingRecord };
          }

          const student = getStudentById(current, vehicle.student_id);
          const token = `PUP-${uid("TOK-").toUpperCase()}`;
          const record = {
            token,
            token_hint: token.slice(0, 10),
            vehicle_id: Number(vehicleId),
            issued_at: new Date().toISOString(),
            student_id: student?.id || null,
          };
          issuedRecord = record;

          const nextState = {
            ...current,
            issuedTokens: [...(current.issuedTokens || []), record],
            issuedToken: record,
          };

          writeJSON(STORAGE_KEY, nextState);
          return nextState;
        });

        return issuedRecord?.token || null;
      },
      validateScan: ({ token, direction = "entry", gateName = "Main Gate", operator = "Web Scanner" }) => {
        let result;
        persist((current) => {
          const normalizedToken = normalizeToken(token);
          const scanDirection = normalizeDirection(direction);
          const issuedRecord = findIssuedRecord(current, normalizedToken);
          const ok = Boolean(issuedRecord && normalizedToken);
          const vehicle = ok ? getVehicleById(current, issuedRecord.vehicle_id) : null;
          const student = vehicle ? getStudentById(current, vehicle.student_id) : null;
          const log = {
            id: Number(current.logs.at(-1)?.id || 0) + 1,
            scanned_at: new Date().toISOString(),
            student_id: ok ? student?.id || null : null,
            vehicle_id: ok ? vehicle?.id || null : null,
            gate: gateName,
            direction: scanDirection,
            status: ok ? "authorized" : "unauthorized",
          };

          result = {
            authorized: ok,
            status: ok ? "AUTHORIZED" : "UNAUTHORIZED",
            reason: ok ? "Access granted from local frontend validation." : "Token not recognized in local frontend mode.",
            student: student ? { ...student } : null,
            vehicle: vehicle ? { ...vehicle } : null,
            gate: { name: gateName },
            token: issuedRecord?.token || null,
          };

          return {
            ...current,
            gate: ok ? { ...current.gate, status: "open" } : current.gate,
            logs: [log, ...current.logs],
            gateEvents: ok
              ? [
                  {
                    id: Number(current.gateEvents.at(-1)?.id || 0) + 1,
                    occurred_at: new Date().toISOString(),
                    operator,
                    event_type: "Gate Open",
                    result: "success",
                    reason: "Authorized scan",
                  },
                  ...current.gateEvents,
                ]
              : [
                  {
                    id: Number(current.gateEvents.at(-1)?.id || 0) + 1,
                    occurred_at: new Date().toISOString(),
                    operator,
                    event_type: "Denied Access",
                    result: "failed",
                    reason: "Invalid token",
                  },
                  ...current.gateEvents,
                ],
          };
        });

        return result;
      },
      openGate: (reason = "Manual control panel") => {
        let outcome = { message: "Gate opened locally." };
        persist((current) => ({
          ...current,
          gate: { ...current.gate, status: "open" },
          gateEvents: [
            {
              id: Number(current.gateEvents.at(-1)?.id || 0) + 1,
              occurred_at: new Date().toISOString(),
              operator: "Web Operator",
              event_type: "Gate Open",
              result: "success",
              reason,
            },
            ...current.gateEvents,
          ],
        }));
        return outcome;
      },
      closeGate: (reason = "Manual close") => {
        persist((current) => ({
          ...current,
          gate: { ...current.gate, status: "closed" },
          gateEvents: [
            {
              id: Number(current.gateEvents.at(-1)?.id || 0) + 1,
              occurred_at: new Date().toISOString(),
              operator: "Web Operator",
              event_type: "Gate Close",
              result: "success",
              reason,
            },
            ...current.gateEvents,
          ],
        }));
      },
      saveGateSettings: (payload) =>
        persist((current) => ({
          ...current,
          gate: {
            ...current.gate,
            relay_mode: payload.relay_mode,
            com_port: payload.com_port,
            pulse_seconds: Number(payload.pulse_seconds),
          },
        })),
      restoreToken: (token) => persist((current) => ({ ...current, issuedToken: token })),
    };
  }, []);

  return <AppDataContext.Provider value={{ state, setState, actions }}>{children}</AppDataContext.Provider>;
}
/* -------------------------------------------------------------------------- */
/* UI primitives                                                              */
/* -------------------------------------------------------------------------- */

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Badge({ value }) {
  const state = String(value || "").toLowerCase();
  const ok = ["authorized", "active", "open", "online", "connected", "success", "ready"].includes(state);
  const bad = ["unauthorized", "inactive", "closed", "offline", "failed"].includes(state);
  const classes = ok
    ? "bg-emerald-50 text-emerald-700"
    : bad
      ? "bg-red-50 text-red-700"
      : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{String(value || "-").toUpperCase()}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-bold text-slate-900">{title}</div>
          <button onClick={onClose} type="button" className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 ${props.className || ""}`}
    />
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 ${props.className || ""}`}
    />
  );
}

function PrimaryButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${className}`}
    >
      {children}
    </button>
  );
}

function BarcodePreview({ value }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    try {
      setDataUrl(barcodeDataUrl(value, 560, 150));
    } catch {
      setDataUrl("");
    }
  }, [value]);

  return (
    <div className="mx-auto flex w-full max-w-[560px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {dataUrl ? <img src={dataUrl} alt="Generated vehicle barcode" className="h-auto w-full" /> : <span className="text-sm text-slate-500">Generating barcode...</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

function getAuthUser() {
  return readJSON(AUTH_KEY, null);
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "admin", password: "PUPBataan@123" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { actions } = useAppData();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (!form.username.trim() || !form.password.trim()) {
        throw new Error("Please enter a username and password.");
      }

      const response = await apiJSON("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      localStorage.setItem("pup_gate_token", response.access_token || `local-${uid()}`);
      localStorage.setItem("pup_gate_user", JSON.stringify(response.user));
      navigate("/", { replace: true });
    } catch (err) {
      const matched = DEMO_ACCOUNTS.find(
        (account) => account.username.toLowerCase() === form.username.trim().toLowerCase() && account.password === form.password
      );

      if (matched) {
        const profile = {
          id: 1,
          username: matched.username,
          full_name: matched.full_name,
          role: matched.role,
          email: matched.email,
        };
        localStorage.setItem("pup_gate_token", `local-${uid()}`);
        localStorage.setItem("pup_gate_user", JSON.stringify(profile));
        navigate("/", { replace: true });
        return;
      }

      setError(err?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#9b1022_0%,_#6f0010_35%,_#250307_100%)] p-5">
      <div className="mx-auto grid min-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl md:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-10 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0 2px, transparent 2.5px)", backgroundSize: "28px 28px" }} />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url(${pupLogo})`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "420px",
              filter: "drop-shadow(0 0 18px rgba(255,255,255,0.08))",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(17,24,39,0.20),rgba(127,29,29,0.08),rgba(15,23,42,0.25))]" />
          <div className="relative flex h-full flex-col">
            <div>
              <div className="text-3xl font-black tracking-tight">PUP BATAAN</div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-red-100">
                Automated Vehicle Gate Pass & Barrier System
              </div>
            </div>

            <div className="mt-12 max-w-lg">
              <h1 className="text-4xl font-black leading-tight">Secure campus access, built for vehicle stickers and barrier control.</h1>
              <p className="mt-5 text-sm leading-6 text-red-100">
                This updated version runs as a pure frontend demo on localhost. Login, pages, logs, and token validation all work locally without backend or database.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {["Admin, Guard, Operator roles", "Local login only", "Mock gate control", "QR / reports preview"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm backdrop-blur-sm">
                  <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-10 text-xs text-red-100">
              Default account: <span className="font-semibold text-white">admin / PUPBataan@123</span>
            </div>
          </div>
        </section>

        <section className="flex items-center p-8 md:p-12">
          <form className="w-full" onSubmit={submit}>
            <div className="mb-8 flex items-center md:hidden">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-slate-700">PUP Bataan</div>
                <div className="text-lg font-black text-slate-900">Vehicle Gate System</div>
              </div>
            </div>

            <div className="mb-2 text-sm font-bold uppercase tracking-[0.25em] text-slate-700">Secure Sign In</div>
            <h2 className="text-3xl font-black text-slate-900">Access the Control Panel</h2>
            <p className="mt-2 text-sm text-slate-500">Use the local demo account to continue.</p>

            <div className="mt-8">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <TextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>

            {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <PrimaryButton className="mt-6 w-full py-3" type="submit" disabled={busy}>
              <KeyRound className="h-4 w-4" />
              {busy ? "Signing in..." : "Sign In"}
            </PrimaryButton>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
              Try: <span className="font-semibold text-slate-700">admin / PUPBataan@123</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* App shell                                                                  */
/* -------------------------------------------------------------------------- */

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = getAuthUser();
  const [open, setOpen] = useState(false);

  if (!profile) return <Navigate to="/login" replace />;

  const allowed = NAV_ITEMS.filter((item) => item[3].includes(profile.role || "operator"));
  const title = allowed.find((item) => item[1] === location.pathname)?.[0] || "Dashboard";
  const { actions } = useAppData();

  const logout = () => {
    actions.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[280px] overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <div className="min-w-0">
            <div className="truncate text-sm font-black uppercase">PUP Bataan</div>
            <div className="truncate text-[11px] text-red-100">Automated Vehicle Gate Pass & Barrier System</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {allowed.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-red-100 hover:bg-white/8"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-3 bottom-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <CircleUserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{profile.full_name}</div>
              <div className="text-xs capitalize text-red-100">{profile.role}</div>
            </div>
            <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300">Online</div>
          </div>
        </div>
      </aside>

      {open && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <main className="lg:ml-[280px]">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <button className="mr-3 lg:hidden" onClick={() => setOpen(true)} type="button">
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="text-slate-700">Dashboard</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>

          <div className="ml-6 hidden max-w-xs flex-1 md:block">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">
              <Search className="h-4 w-4" />
              <span>Search anything...</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <button className="relative rounded-full border border-slate-200 p-2 text-slate-500" type="button" onClick={() => navigate("/logs")}>
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-600" />
            </button>

            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200">
                <CircleUserRound className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="text-sm font-semibold">{profile.full_name}</div>
                <div className="text-[11px] text-slate-500">{profile.role}</div>
              </div>
            </div>

            <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={logout} title="Sign out" type="button">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="p-4 lg:p-5">
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
            <span>Dashboard</span>
            <ChevronRight className="h-3 w-3" />
            <span>{title}</span>
          </div>

          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="vehicles" element={<StudentVehicles />} />
            <Route path="qr" element={<QRManagement />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="logs" element={<Logs />} />
            <Route path="gate" element={<GateControl />} />
            <Route path="reports" element={<Reports />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pages                                                                      */
/* -------------------------------------------------------------------------- */

function Dashboard() {
  const { state } = useAppData();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const entriesToday = state.logs.filter((log) => log.direction === "entry" && isToday(log.scanned_at)).length;
    const exitsToday = state.logs.filter((log) => log.direction === "exit" && isToday(log.scanned_at)).length;
    const unauthorizedToday = state.logs.filter((log) => log.status === "unauthorized" && isToday(log.scanned_at)).length;

    return {
      students: state.students.length,
      vehicles: state.vehicles.length,
      entries: entriesToday,
      exits: exitsToday,
      unauthorized: unauthorizedToday,
    };
  }, [state]);

  const chartData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day, index) => ({
      date: day,
      entries: 12 + index * 3,
      exits: 9 + index * 2,
    }));
  }, []);

  const statCards = [
    ["Total Students", stats.students, Users, "bg-blue-50 text-blue-700"],
    ["Registered Vehicles", stats.vehicles, Car, "bg-sky-50 text-sky-700"],
    ["Today's Entries", stats.entries, ChevronRight, "bg-emerald-50 text-emerald-700"],
    ["Today's Exits", stats.exits, LogOut, "bg-rose-50 text-rose-700"],
    ["Unauthorized", stats.unauthorized, ShieldX, "bg-amber-50 text-amber-700"],
  ];

  const recentLogs = state.logs.slice(0, 5);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.4fr_0.62fr]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map(([label, value, Icon, tone]) => (
            <Card key={label} className="p-4">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-black text-slate-900">{value}</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <Card className="p-4">
            <SectionTitle title="Entry / Exit Overview (Sample)" />
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="entryFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={MAROON} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={MAROON} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="entries" stroke="#16a34a" fillOpacity={1} fill="url(#entryFill)" />
                  <Area type="monotone" dataKey="exits" stroke="#dc2626" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Gate Status" />
            <div className="space-y-4">
              {[
                ["Main Gate", `Status: ${state.gate.status}`, state.gate.status === "open" ? "OPEN" : "CLOSED"],
                ["Relay Mode", state.gate.relay_mode.toUpperCase(), state.gate.relay_mode === "mock" ? "READY" : "CONNECTED"],
              ].map(([name, time, status]) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{name}</div>
                    <div className="mt-1 text-xs text-slate-500">{time}</div>
                  </div>
                  <Badge value={status} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Entries</h3>
            <button className="text-xs font-semibold text-slate-700" type="button" onClick={() => navigate("/logs")}>
              View All
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Gate</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentLogs.map((log) => {
                  const student = log.student_id ? state.students.find((s) => Number(s.id) === Number(log.student_id)) : null;
                  const vehicle = log.vehicle_id ? state.vehicles.find((v) => Number(v.id) === Number(log.vehicle_id)) : null;
                  return (
                    <tr key={log.id}>
                      <td className="px-3 py-2">{new Date(log.scanned_at).toLocaleTimeString()}</td>
                      <td className="px-3 py-2">{student?.full_name || "Unknown"}</td>
                      <td className="px-3 py-2">{student?.student_id || "N/A"}</td>
                      <td className="px-3 py-2">{vehicle?.brand_model || "N/A"}</td>
                      <td className="px-3 py-2 capitalize">{vehicle?.vehicle_type || "N/A"}</td>
                      <td className="px-3 py-2">{log.gate}</td>
                      <td className="px-3 py-2"><Badge value={log.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-4">
            <SectionTitle title="Vehicle Type Distribution" />
            <div className="flex items-center gap-4">
              <div className="h-44 flex-1">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Motorcycle", value: state.vehicles.filter((v) => v.vehicle_type === "motorcycle").length },
                        { name: "Car", value: state.vehicles.filter((v) => v.vehicle_type === "car").length },
                        { name: "Others", value: Math.max(0, 12 - state.vehicles.length) },
                      ]}
                      dataKey="value"
                      innerRadius={46}
                      outerRadius={72}
                    >
                      <Cell fill={MAROON} />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-sm">
                <div className="text-3xl font-black text-slate-900">{state.vehicles.length}</div>
                <div className="text-xs text-slate-500">Registered vehicles</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="System Overview" />
            <div className="space-y-3 text-sm">
              {[
                ["Database", "Removed"],
                ["Scanner", "Local"],
                ["Relay (Gate)", "Mock / Local"],
                ["System Uptime", "Running on localhost"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="Quick Status" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">Login</span><span className="font-semibold text-emerald-600">Working</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Routes</span><span className="font-semibold text-emerald-600">Working</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">Backend</span><span className="font-semibold text-emerald-600">Removed</span></div>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden p-3">
          <div className="flex items-center justify-between px-1 pb-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Live Scanner Preview</div>
              <div className="text-xs text-rose-600">● LOCAL</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-slate-950 p-2">
            <div className="aspect-[4/3] rounded-xl bg-[linear-gradient(180deg,rgba(22,24,28,0.15),rgba(22,24,28,0.85)),radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.08),transparent_60%),linear-gradient(135deg,#5d4b3a,#181818)] p-4 text-white">
              <div className="mb-4 flex items-center justify-between text-xs">
                <span className="rounded-full bg-black/40 px-2 py-1">LOCAL</span>
                <span className="rounded-full bg-black/40 px-2 py-1">Scan Preview</span>
              </div>
              <div className="mt-16 rounded-2xl border border-emerald-400/60 bg-emerald-500/10 p-4 text-center backdrop-blur">
                <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-emerald-500/20" />
                <div className="text-2xl font-black tracking-wide">READY</div>
              </div>
            </div>
          </div>
          <div className="rounded-b-2xl bg-emerald-600 px-4 py-2 text-center text-white">
            <div className="text-sm font-black">LOCAL DEMO</div>
          </div>

          <div className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-200">
                <CircleUserRound className="h-8 w-8 text-slate-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900">Juan Dela Cruz</div>
                <div className="text-xs text-slate-500">2021-12345 | BSIT - 3A</div>
              </div>
              <div className="rounded-xl border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">
                SCAN TYPE<br />
                <span className="font-bold text-slate-900">BARCODE</span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Vehicle Type", "Motorcycle"],
                ["Brand / Model", "Yamaha Aerox 155"],
                ["Color", "Black"],
                ["Barcode", "||||||||||||||||||"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500">Valid Until: 12/31/2026</div>
            <PrimaryButton className="mt-4 w-full justify-center py-3">
              <MoonStar className="h-4 w-4" />
              OPEN GATE
            </PrimaryButton>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle
            title="Recent Activities"
            action={
              <button className="text-xs font-semibold text-slate-700" type="button" onClick={() => navigate("/logs")}>
                View All
              </button>
            }
          />
          <div className="space-y-3">
            {state.gateEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${event.result === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{event.event_type}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(event.occurred_at).toLocaleTimeString()} • {event.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StudentVehicles() {
  const { state, actions } = useAppData();
  const [mode, setMode] = useState("vehicles");
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(null);

  const matchesState = (item) => {
    if (filterState === "active") return item.is_active;
    if (filterState === "inactive") return !item.is_active;
    return true;
  };

  const filteredStudents = state.students.filter((student) => matchesState(student) && `${student.student_id} ${student.full_name} ${student.course}`.toLowerCase().includes(search.toLowerCase()));
  const filteredVehicles = state.vehicles.filter((vehicle) => {
    const student = state.students.find((s) => Number(s.id) === Number(vehicle.student_id));
    const searchText = `${student?.full_name || ""} ${student?.student_id || ""} ${vehicle.brand_model} ${vehicle.plate_number}`.toLowerCase();
    return matchesState(vehicle) && searchText.includes(search.toLowerCase());
  });

  const openStudent = (item = { student_id: "", full_name: "", course: "", year: "", section: "", contact_number: "", is_active: true }) => {
    setMode("students");
    setForm(item);
    setModal("student");
  };

  const openVehicle = (item = { student_id: "", vehicle_type: "motorcycle", plate_number: "", brand_model: "", color: "", valid_until: "", is_active: true }) => {
    setMode("vehicles");
    setForm(item);
    setModal("vehicle");
  };

  const saveStudent = (event) => {
    event.preventDefault();
    actions.saveStudent(form);
    setModal(null);
  };

  const saveVehicle = (event) => {
    event.preventDefault();
    actions.saveVehicle({ ...form, student_id: Number(form.student_id) });
    setModal(null);
  };

  const remove = (kind, id) => {
    if (!window.confirm("Delete this record?")) return;
    if (kind === "students") actions.deleteStudent(id);
    if (kind === "vehicles") actions.deleteVehicle(id);
  };

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Student Vehicle Management"
        subtitle="Search, register, update, and manage plate-reference vehicles linked to student IDs."
        action={
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setSearch("")} type="button">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </SecondaryButton>
            <PrimaryButton onClick={() => (mode === "students" ? openStudent() : openVehicle())} type="button">
              <Plus className="h-4 w-4" />
              Add New
            </PrimaryButton>
          </div>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "vehicles" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`} onClick={() => setMode("vehicles")} type="button">
              Vehicles
            </button>
            <button className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "students" ? "bg-white text-slate-900 shadow" : "text-slate-500"}`} onClick={() => setMode("students")} type="button">
              Students
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <TextInput className="pl-9" placeholder="Search student, plate, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <SecondaryButton
              type="button"
              onClick={() => setFilterState((current) => (current === "all" ? "active" : current === "active" ? "inactive" : "all"))}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filterState === "all" ? "Filter" : filterState === "active" ? "Active" : "Inactive"}
            </SecondaryButton>
          </div>
        </div>

        {mode === "vehicles" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Photo</th>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((vehicle) => {
                  const student = state.students.find((s) => Number(s.id) === Number(vehicle.student_id));
                  return (
                    <tr key={vehicle.id}>
                      <td className="px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                          <CircleUserRound className="h-5 w-5 text-slate-500" />
                        </div>
                      </td>
                      <td className="px-3 py-2">{student?.student_id}</td>
                      <td className="px-3 py-2">{student?.full_name}</td>
                      <td className="px-3 py-2">{vehicle.brand_model}</td>
                      <td className="px-3 py-2 capitalize">{vehicle.vehicle_type}</td>
                      <td className="px-3 py-2"><Badge value={vehicle.is_active ? "active" : "inactive"} /></td>
                      <td className="px-3 py-2"><Barcode className="h-4 w-4 text-slate-500" /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button className="text-slate-700" onClick={() => openVehicle(vehicle)} type="button">Edit</button>
                          <button className="text-red-600" onClick={() => remove("vehicles", vehicle.id)} type="button">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Photo</th>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Full Name</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Vehicle Count</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-3 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200">
                        <CircleUserRound className="h-5 w-5 text-slate-500" />
                      </div>
                    </td>
                    <td className="px-3 py-2">{student.student_id}</td>
                    <td className="px-3 py-2">{student.full_name}</td>
                    <td className="px-3 py-2">{student.course}</td>
                    <td className="px-3 py-2">{state.vehicles.filter((vehicle) => Number(vehicle.student_id) === Number(student.id)).length}</td>
                    <td className="px-3 py-2"><Badge value={student.is_active ? "active" : "inactive"} /></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button className="text-slate-700" onClick={() => openStudent(student)} type="button">Edit</button>
                        <button className="text-red-600" onClick={() => remove("students", student.id)} type="button">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal === "student" && (
        <Modal title={`${form?.id ? "Edit" : "Add"} Student`} onClose={() => setModal(null)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveStudent}>
            {["student_id", "full_name", "course", "year", "section", "contact_number"].map((key) => (
              <div key={key} className={key === "full_name" ? "md:col-span-2" : ""}>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{key.replace("_", " ")}</label>
                <TextInput value={form?.[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Active</label>
              <SelectInput value={String(form?.is_active ?? true)} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </SelectInput>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setModal(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit"><Save className="h-4 w-4" /> Save Student</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {modal === "vehicle" && (
        <Modal title="Add / Edit Vehicle" onClose={() => setModal(null)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveVehicle}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Student</label>
              <SelectInput value={form?.student_id || ""} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
                <option value="">Select student</option>
                {state.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_id} - {student.full_name}
                  </option>
                ))}
              </SelectInput>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Vehicle Type</label>
              <SelectInput value={form?.vehicle_type || "motorcycle"} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
              </SelectInput>
            </div>
            {[
              ["plate_number", "Plate Number"],
              ["brand_model", "Brand / Model"],
              ["color", "Color"],
              ["valid_until", "Valid Until"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
                <TextInput
                  type={key === "valid_until" ? "date" : "text"}
                  value={form?.[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Active</label>
              <SelectInput value={String(form?.is_active ?? true)} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </SelectInput>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setModal(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit"><Save className="h-4 w-4" /> Save Vehicle</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function QRManagement() {
  const { state, actions } = useAppData();
  const [selected, setSelected] = useState("");
  const [barcodeData, setBarcodeData] = useState("");
  const [allBarcodeUrls, setAllBarcodeUrls] = useState({});
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    student_id: "",
    full_name: "",
    course: "",
    year: "",
    section: "",
    contact_number: "",
    vehicle: { vehicle_type: "motorcycle", plate_number: "", brand_model: "", color: "", valid_until: "" },
  });

  const issued = state.issuedToken;
  const selectedVehicle = state.vehicles.find((vehicle) => Number(vehicle.id) === Number(selected));
  const selectedStudent = selectedVehicle ? state.students.find((student) => Number(student.id) === Number(selectedVehicle.student_id)) : null;

  const issue = () => {
    if (!selected) return;
    actions.issueToken(selected);
  };

  const generateAll = () => {
    state.vehicles.forEach((vehicle) => actions.issueToken(vehicle.id));
  };

  const createNewStudent = (event) => {
    event.preventDefault();
    const record = actions.createStudentWithBarcode(newStudent);
    if (!record) return;
    setSelected(String(record.vehicle_id));
    setShowNewStudent(false);
    setNewStudent({
      student_id: "",
      full_name: "",
      course: "",
      year: "",
      section: "",
      contact_number: "",
      vehicle: { vehicle_type: "motorcycle", plate_number: "", brand_model: "", color: "", valid_until: "" },
    });
  };

  useEffect(() => {
    let cancelled = false;

    if (!issued?.token) {
      setBarcodeData("");
      return undefined;
    }

    try {
      setBarcodeData(barcodeDataUrl(issued.token));
    } catch {
      if (!cancelled) setBarcodeData("");
    }

    return () => {
      cancelled = true;
    };
  }, [issued?.token]);

  useEffect(() => {
    let cancelled = false;

    const tokens = (state.issuedTokens || []).filter((entry) => entry?.token);
    if (!tokens.length) {
      setAllBarcodeUrls({});
      return undefined;
    }

    try {
      const entries = tokens.map((entry) => [entry.token, barcodeDataUrl(entry.token, 360, 100)]);
      if (!cancelled) setAllBarcodeUrls(Object.fromEntries(entries));
    } catch {
      if (!cancelled) setAllBarcodeUrls({});
    }

    return () => {
      cancelled = true;
    };
  }, [state.issuedTokens]);

  const downloadFake = async (kind) => {
    if (!issued) return;

    if (kind === "pdf") {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 32;

      doc.setFillColor(247, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("PUP Bataan Vehicle Gate Pass", margin, 54);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Issued barcode token for gate validation", margin, 76);

      const barcodeUrl = barcodeDataUrl(issued.token, 560, 150);
      doc.addImage(barcodeUrl, "PNG", margin, 110, 420, 112);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Token", margin, 330);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(issued.token, margin, 348, { maxWidth: pageWidth - margin * 2 });

      doc.setFont("helvetica", "bold");
      doc.text("Vehicle", margin, 400);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedStudent?.full_name || ""} • ${selectedVehicle?.brand_model || ""}`, margin, 418, { maxWidth: pageWidth - margin * 2 });
      doc.text(`Plate: ${selectedVehicle?.plate_number || ""}`, margin, 436);

      doc.save("pup-vehicle-barcode.pdf");
      return;
    }

    const text = `Barcode token: ${issued.token}\nVehicle: ${selectedVehicle?.brand_model || "-"}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pup-vehicle-barcode.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <SectionTitle title="Barcode Management" subtitle="Generate and print secure barcodes attached to vehicle bodies." />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Barcode className="h-5 w-5" />
            </div>
            <Badge value="active" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-bold text-slate-900">Generate Secure Token</div>
            <SecondaryButton onClick={() => setShowNewStudent(true)} type="button">
              <Plus className="h-4 w-4" /> New Student
            </SecondaryButton>
          </div>
          <div className="mt-2 text-sm text-slate-500">A new token revokes the previous local barcode sticker.</div>
          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Select Vehicle</label>
            <SelectInput value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Choose a registered vehicle</option>
              {state.vehicles.map((vehicle) => {
                const student = state.students.find((s) => Number(s.id) === Number(vehicle.student_id));
                return (
                  <option key={vehicle.id} value={vehicle.id}>
                    {student?.student_id} - {student?.full_name} - {vehicle.brand_model}
                  </option>
                );
              })}
            </SelectInput>
          </div>
          <PrimaryButton className="mt-4 w-full" onClick={issue} type="button">
            <Star className="h-4 w-4" />
            Generate
          </PrimaryButton>
        </Card>

        <Card className="p-4">
          {issued ? (
            <div className="text-center">
              {barcodeData ? <img src={barcodeData} alt="Generated vehicle barcode" className="mx-auto h-auto w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" /> : <BarcodePreview value={issued.token} />}
              <div className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-400">Token hint</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900">{issued.token_hint}</div>
              <div className="mt-2 text-sm text-slate-500">
                {selectedStudent ? `${selectedStudent.full_name} • ${selectedVehicle?.brand_model}` : "Select a vehicle to generate a token."}
              </div>
              <div className="mt-5 flex justify-center gap-3">
                <SecondaryButton onClick={() => downloadFake("png")} type="button">
                  <Download className="h-4 w-4" /> PNG
                </SecondaryButton>
                <PrimaryButton onClick={() => downloadFake("pdf")} type="button">
                  <Download className="h-4 w-4" /> PDF
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center text-slate-400">Issue a token to preview the sticker.</div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">All vehicle barcodes</div>
                <div className="text-xs text-slate-500">Generate codes for every vehicle account so the scanner can validate them.</div>
              </div>
              <PrimaryButton onClick={generateAll} type="button">
                <Star className="h-4 w-4" /> Generate All
              </PrimaryButton>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {state.vehicles.map((vehicle) => {
                const student = state.students.find((item) => Number(item.id) === Number(vehicle.student_id));
                const record = (state.issuedTokens || []).find((entry) => Number(entry.vehicle_id) === Number(vehicle.id));

                return (
                  <div key={vehicle.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm">
                    <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{student?.student_id || "Student"}</div>
                    <div className="mt-1 text-sm font-black text-slate-900">{student?.full_name || "Unnamed student"}</div>
                    <div className="text-xs text-slate-500">{vehicle.brand_model} • {vehicle.plate_number}</div>
                    {record?.token ? (
                      <>
                        {allBarcodeUrls[record.token] ? (
                          <img src={allBarcodeUrls[record.token]} alt="Vehicle barcode" className="mt-3 h-auto w-full rounded-xl border border-slate-200 bg-white p-2" />
                        ) : (
                          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">Generating barcode…</div>
                        )}
                        <div className="mt-2 font-mono text-xs text-slate-700">{record.token_hint}</div>
                      </>
                    ) : (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">No barcode generated yet.</div>
                    )}
                    <PrimaryButton className="mt-3 w-full" onClick={() => actions.issueToken(vehicle.id)} type="button">
                      <Barcode className="h-4 w-4" /> Generate Barcode
                    </PrimaryButton>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
      {showNewStudent && (
        <Modal title="New Student with Barcode" onClose={() => setShowNewStudent(false)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={createNewStudent}>
            {["student_id", "full_name", "course", "year", "section", "contact_number"].map((key) => (
              <div key={key} className={key === "full_name" ? "md:col-span-2" : ""}>
                <label className="mb-2 block text-sm font-semibold capitalize text-slate-700">{key.replace("_", " ")}</label>
                <TextInput required value={newStudent[key]} onChange={(event) => setNewStudent({ ...newStudent, [key]: event.target.value })} />
              </div>
            ))}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Vehicle Type</label>
              <SelectInput value={newStudent.vehicle.vehicle_type} onChange={(event) => setNewStudent({ ...newStudent, vehicle: { ...newStudent.vehicle, vehicle_type: event.target.value } })}>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
              </SelectInput>
            </div>
            {["plate_number", "brand_model", "color", "valid_until"].map((key) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-semibold capitalize text-slate-700">{key.replace("_", " ")}</label>
                <TextInput required type={key === "valid_until" ? "date" : "text"} value={newStudent.vehicle[key]} onChange={(event) => setNewStudent({ ...newStudent, vehicle: { ...newStudent.vehicle, [key]: event.target.value } })} />
              </div>
            ))}
            <div className="md:col-span-2 flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setShowNewStudent(false)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit"><Barcode className="h-4 w-4" /> Create Student & Barcode</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Scanner() {
  const { actions } = useAppData();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanTimerRef = useRef(null);
  const lastScannedRef = useRef("");
  const [form, setForm] = useState({ token: "", direction: "entry" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Starting camera...");
  const [cameraError, setCameraError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const rawToken = event.currentTarget.elements.namedItem("token")?.value || form.token || "";
    const normalizedToken = normalizeToken(rawToken);

    setBusy(true);
    try {
      const res = actions.validateScan({ token: normalizedToken, direction: form.direction, gateName: "Main Gate", operator: "Web Scanner" });
      setResult(res || { authorized: false, status: "UNAUTHORIZED", reason: "No token available." });
      setForm({ token: "", direction: form.direction });
    } finally {
      setBusy(false);
    }
  };

  const openGate = () => {
    actions.openGate("Manual open from scanner page");
    setResult((current) => (current ? { ...current, reason: "Gate opened locally." } : current));
  };

  useEffect(() => {
    let mounted = true;
    let stream = null;
    let detector = null;

    const validateDecodedToken = (token) => {
      const normalized = normalizeToken(token);
      if (!normalized || normalized === lastScannedRef.current) return;

      lastScannedRef.current = normalized;
      setForm((current) => ({ ...current, token: normalized }));
      setCameraStatus("Barcode detected. Validating token...");

      const result = actions.validateScan({
        token: normalized,
        direction: form.direction,
        gateName: "Main Gate",
        operator: "Web Scanner",
      });

      setResult(result || { authorized: false, status: "UNAUTHORIZED", reason: "No token available." });
    };

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      detector?.detect(video).then((barcodes) => {
        if (barcodes[0]?.rawValue) validateDecodedToken(barcodes[0].rawValue);
      }).catch(() => {});
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!mounted) return;
        setCameraStatus("Camera is not supported in this browser.");
        setCameraError("Use Chrome, Edge, or another browser with webcam support.");
        return;
      }

      try {
        if (!("BarcodeDetector" in window)) {
          setCameraStatus("Barcode scanning is not supported in this browser.");
          setCameraError("Use Chrome or Edge with BarcodeDetector support, or enter the token manually.");
          return;
        }

        detector = new window.BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] });
        setCameraStatus("Starting camera...");
        setCameraError("");

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        scanTimerRef.current = window.setInterval(scanFrame, 500);

        setCameraStatus("Camera is live. Scan a barcode to auto-fill the token.");
      } catch (error) {
        if (!mounted) return;
        setCameraStatus("Camera unavailable");
        setCameraError(error?.message || "Permission to use the camera was denied.");
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [actions, form.direction]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.72fr]">
      <Card className="p-4">
        <SectionTitle title="Live Scanner (Frontend Demo)" subtitle="Validate a token locally without a backend." />
        <div className="relative overflow-hidden rounded-2xl bg-slate-950">
          <div className="aspect-[16/10] overflow-hidden bg-[linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.72)),radial-gradient(circle_at_center,rgba(255,255,255,.12),transparent_55%),linear-gradient(135deg,#6a543f,#141414)] text-white">
            <canvas ref={canvasRef} className="hidden" />
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold tracking-wide shadow-lg shadow-black/20">
              LIVE
            </div>
            <div className="absolute inset-7 rounded-2xl border border-white/30" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/45 p-3 text-xs backdrop-blur-md">
              <span className="font-semibold tracking-wide text-emerald-100">{cameraStatus}</span>
              <span className="text-slate-200">Camera starts automatically on this page.</span>
            </div>
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-6 text-center">
                <Camera className="h-10 w-10 text-emerald-300" />
                <div className="mt-3 text-sm font-semibold">Camera preview unavailable</div>
                <div className="mt-1 max-w-xs text-xs text-slate-200">{cameraError}</div>
              </div>
            )}
          </div>
        </div>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 md:flex-row">
          <SelectInput className="md:w-36" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
          </SelectInput>
          <TextInput name="token" className="flex-1 font-mono" placeholder="Paste or scan token..." value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
          <PrimaryButton type="submit" disabled={busy}>
            <Eye className="h-4 w-4" /> {busy ? "Validating..." : "Validate"}
          </PrimaryButton>
        </form>
      </Card>

      <Card className={`p-4 ${result?.authorized ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Scan Result</div>
        {result ? (
          <div className="mt-4">
            <div className={`rounded-xl px-3 py-2 text-center text-sm font-black ${result.authorized ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
              {result.status}
            </div>
            <div className="mt-4 rounded-xl bg-white p-4">
              <div className="text-lg font-black text-slate-900">{result.student?.full_name || "Unknown"}</div>
              <div className="text-xs text-slate-500">{result.student?.student_id || "N/A"} | {result.student?.course || "-"}</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Vehicle</span><span className="font-semibold">{result.vehicle?.brand_model || "-"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Color</span><span className="font-semibold">{result.vehicle?.color || "-"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Gate</span><span className="font-semibold">{result.gate?.name || "-"}</span></div>
              </div>
            </div>
            <PrimaryButton className="mt-4 w-full" type="button" onClick={openGate}>
              <MoonStar className="h-4 w-4" /> OPEN GATE
            </PrimaryButton>
          </div>
        ) : (
          <div className="mt-8 text-sm text-slate-500">Waiting for a scanned token.</div>
        )}
      </Card>
    </div>
  );
}

function Logs() {
  const { state } = useAppData();
  return (
    <Card className="p-4">
      <SectionTitle title="Entry / Exit Logs" subtitle="Time-stamped audit trail of accepted and rejected scans." />
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Date / Time</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Gate</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.logs.map((log) => {
              const student = log.student_id ? state.students.find((s) => Number(s.id) === Number(log.student_id)) : null;
              const vehicle = log.vehicle_id ? state.vehicles.find((v) => Number(v.id) === Number(log.vehicle_id)) : null;
              return (
                <tr key={log.id}>
                  <td className="px-3 py-2">{toLocalTime(log.scanned_at)}</td>
                  <td className="px-3 py-2">{student?.full_name || "Unknown"}</td>
                  <td className="px-3 py-2">{vehicle?.brand_model || "-"}</td>
                  <td className="px-3 py-2">{log.gate}</td>
                  <td className="px-3 py-2"><Badge value={log.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function GateControl() {
  const { state, actions } = useAppData();

  const open = () => actions.openGate("Manual control panel");
  const close = () => actions.closeGate("Manual close from control panel");

  return (
    <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
      <Card className="p-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <SquareActivity className="h-8 w-8" />
        </div>
        <div className="mt-4 text-2xl font-black">{state.gate.name}</div>
        <div className="mt-2"><Badge value={state.gate.status} /></div>
        <PrimaryButton className="mt-6 w-full justify-center" onClick={open} type="button">
          <MoonStar className="h-4 w-4" /> OPEN GATE
        </PrimaryButton>
        <SecondaryButton className="mt-3 w-full justify-center" onClick={close} type="button">
          CLOSE GATE
        </SecondaryButton>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Recent Gate Events" />
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.gateEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-3 py-2">{toLocalTime(event.occurred_at)}</td>
                  <td className="px-3 py-2">{event.operator}</td>
                  <td className="px-3 py-2">{event.event_type}</td>
                  <td className="px-3 py-2"><Badge value={event.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Reports() {
  const { state } = useAppData();
  const [period, setPeriod] = useState("daily");

  const summary = useMemo(() => {
    const base = period === "monthly" ? 30 : 7;
    return Array.from({ length: base }, (_, index) => ({
      date: period === "monthly" ? `Day ${index + 1}` : `D${index + 1}`,
      entries: 8 + (index % 5) * 2,
      exits: 5 + (index % 4) * 2,
      unauthorized: index % 3,
    }));
  }, [period]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-4">
        <SectionTitle
          title="Reports & Analytics"
          subtitle="Daily and monthly activity summary."
          action={
            <div className="flex gap-2">
              <SelectInput className="w-36" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </SelectInput>
              <PrimaryButton type="button" onClick={() => {
                const text = `Local frontend report (${period})\nRecords: ${state.logs.length}`;
                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `pup-gate-${period}-report.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4" />
                Export
              </PrimaryButton>
            </div>
          }
        />
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="entries" fill={MAROON} />
              <Bar dataKey="exits" fill="#d97706" />
              <Bar dataKey="unauthorized" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <SectionTitle title="Vehicle Type Stats" />
        <div className="h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={[
                  { name: "Motorcycle", value: state.vehicles.filter((v) => v.vehicle_type === "motorcycle").length },
                  { name: "Car", value: state.vehicles.filter((v) => v.vehicle_type === "car").length },
                ]}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
              >
                <Cell fill={MAROON} />
                <Cell fill="#d97706" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function UsersPage() {
  const { state, actions } = useAppData();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", password: "", role: "guard" });
  const [error, setError] = useState("");

  const save = (event) => {
    event.preventDefault();
    setError("");

    if (!form.username.trim() || !form.full_name.trim()) {
      setError("Please fill in the name and username.");
      return;
    }

    actions.saveUser({ ...form, is_active: true });
    setModal(false);
    setForm({ username: "", full_name: "", password: "", role: "guard" });
  };

  return (
    <>
      <Card className="p-4">
        <SectionTitle
          title="Users & Roles"
          subtitle="Admin, guard, and operator accounts."
          action={
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="button" onClick={() => setModal(true)}>
              <Plus className="h-4 w-4" /> Add User
            </button>
          }
        />
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-2">{user.full_name}</td>
                  <td className="px-3 py-2">{user.username}</td>
                  <td className="px-3 py-2 capitalize">{user.role}</td>
                  <td className="px-3 py-2"><Badge value={user.is_active ? "active" : "inactive"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal && (
        <Modal title="Create User" onClose={() => setModal(false)}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
              <TextInput value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <TextInput value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
              <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="guard">Guard</option>
                <option value="operator">Operator</option>
              </SelectInput>
            </div>
            {error && <div className="md:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="md:col-span-2 flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => setModal(false)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit"><Save className="h-4 w-4" /> Save User</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function SettingsPage() {
  const { state, actions } = useAppData();
  const [gate, setGate] = useState(state.gate);

  useEffect(() => {
    setGate(state.gate);
  }, [state.gate]);

  const save = (event) => {
    event.preventDefault();
    actions.saveGateSettings(gate);
  };

  return (
    <Card className="p-4">
      <SectionTitle title="System Settings" subtitle="Relay mode, COM port, and pulse duration." />
      <form className="grid gap-4 md:grid-cols-2" onSubmit={save}>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Relay Mode</label>
          <SelectInput value={gate.relay_mode} onChange={(e) => setGate({ ...gate, relay_mode: e.target.value })}>
            <option value="mock">Mock</option>
            <option value="real">Real</option>
          </SelectInput>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">COM Port</label>
          <TextInput value={gate.com_port} onChange={(e) => setGate({ ...gate, com_port: e.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Pulse Duration</label>
          <TextInput type="number" step="0.1" min="0.5" max="1" value={gate.pulse_seconds} onChange={(e) => setGate({ ...gate, pulse_seconds: e.target.value })} />
        </div>
        <div className="flex items-end justify-end">
          <PrimaryButton type="submit"><Save className="h-4 w-4" /> Save Settings</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </AppDataProvider>
  );
}
