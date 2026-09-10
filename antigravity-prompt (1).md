# Instructions for Antigravity

## 0. How to work on this project
Read `prd.md` and `thmem.md` in the project root **completely** before writing any code — do not skim. They are the binding spec:
- `prd.md` = what the system does (scope, functional/non-functional requirements, stack, open questions)
- `thmem.md` = how it looks (screens, layout, design tokens, component rules)

Work in phases, not all at once:
1. Scaffold (folder structure + configs) → confirm it builds/runs before continuing.
2. Layout shell (Sidebar, Topbar, DashboardLayout, routing) → confirm before continuing.
3. Screens, one at a time, in the order in §5 → wire each to mock data first.
4. Firestore integration (§4) → replace mock data with live reads screen by screen.
5. Backend services (Isolation Forest job, YOLOv8 call, RUL, RAG/GenAI) → last, since the frontend must work end-to-end on mock data before real pipelines are wired in.

Do not guess field names, paths, or config values — everything you need is given explicitly below or in prd.md/thmem.md. If something is genuinely missing, stop and ask rather than inventing a plausible-looking default. Do not silently resolve a conflict between prd.md and thmem.md — flag it.

Maintain `AGENT_CONTEXT.md` in the project root from the very first phase — see §12 for exactly what it must contain and when to update it. This project may be picked up by a different AI agent/tool partway through, so this file is how continuity survives that handoff. Update it at the end of every phase, not just at the end of the project.

---

## 1. Project summary
**SmartConveyor / Shield** — predictive maintenance web app for conveyor belt joint rupture/damage detection in iron ore mining. Fuses real-time sensor telemetry, computer-vision defect detection, and GenAI reasoning into one dashboard for a mine technician (not an admin/manager) — replacing manual, reactive inspection with early, explainable warnings.

---

## 2. Stack
- **Frontend:** React + Vite (JS/JSX), Tailwind CSS, shadcn/ui (use it wherever a component exists — don't hand-roll), React Router, Lucide React icons, Recharts, Three.js (Digital Twin), GSAP, Redux
- **Backend:** Node.js + Express, REST API, layered structure (routes → controllers → services → models)
- **Database:** MongoDB — rolling 20-minute sensor window for Isolation Forest retraining
- **Realtime source:** Firebase Firestore (see §4 — exact config and schema below)
- **ML/AI:** JS-based Isolation Forest (sensor anomaly), custom YOLOv8 (visual defect detection), Pinecone (RAG vector store), LangChain (GenAI alert/report generation)

---

## 3. Folder structure
Scaffold exactly this. Don't restructure it mid-build.

```
shield/
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css                      # Tailwind + design tokens
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn primitives
│   │   │   ├── layout/                    # Sidebar, Topbar, DashboardLayout
│   │   │   ├── dashboard/                 # KPICard, SensorCard, HealthGauge, RULCard, ConveyorOverview, SensorChart, RecentAlerts
│   │   │   ├── digital-twin/
│   │   │   │   ├── TwinCanvas.jsx
│   │   │   │   ├── scene/                 # buildConveyorGeometry.js, buildBeltMesh.js, buildSensorGantries.js, buildOreStream.js, SpliceJoint.js, cameraPresets.js
│   │   │   │   ├── useAnimationLoop.js
│   │   │   │   ├── useRaycastSelection.js
│   │   │   │   ├── JointInspector.jsx
│   │   │   │   ├── JointDetailsSheet.jsx
│   │   │   │   ├── HistoricalScrubber.jsx
│   │   │   │   └── TwinControls.jsx
│   │   │   ├── vision/                    # VisionViewer, DetectionOverlay, DetectionInfo, DetectionHistoryTable
│   │   │   ├── alerts/                    # AlertStats, AlertFilters, AlertTable, AcknowledgeDialog, EmergencyStopDialog
│   │   │   ├── reports/                   # ReportStats, ReportFilters, ReportList, GenerateReportDialog
│   │   │   ├── settings/                  # GeneralTab, ConveyorTab, SensorsTab, NotificationsTab, SystemTab
│   │   │   ├── ai-assistant/              # AIAssistantTrigger, AIAssistantPanel
│   │   │   └── common/                    # StatusBadge, LoadingState, EmptyState, ErrorState, PageHeader
│   │   ├── pages/                         # Home, Dashboard, DigitalTwin, VisionMonitoring, SensorHealth, Alerts, Reports, Settings
│   │   ├── routes/AppRoutes.jsx
│   │   ├── store/                         # Redux: store.js + slices/ (sensorSlice, alertSlice, detectionSlice, twinSlice, uiSlice)
│   │   ├── services/                      # api.js + sensorService, alertService, detectionService, reportService, assistantService
│   │   ├── firebase/
│   │   │   ├── firebaseConfig.js          # see §4.1 — exact values given
│   │   │   ├── useLiveReadings.js         # onSnapshot listener on /devices/CB_001/live/latest
│   │   │   └── useLiveSnapshot.js         # onSnapshot listener on /devices/CB_001/snapshots/latest
│   │   ├── data/                          # mock data, same shape as real Firestore docs (see §4.2)
│   │   ├── hooks/                         # useSensorData, useAlerts, useDebounce
│   │   └── lib/                           # utils.js (cn, formatters), constants.js (tokens, enums)
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── components.json
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/                        # db.js (Mongo), firebaseAdmin.js, env.js
│   │   ├── routes/                        # sensorRoutes, alertRoutes, detectionRoutes, twinRoutes, reportRoutes, assistantRoutes
│   │   ├── controllers/                   # one per route file above
│   │   ├── services/
│   │   │   ├── firestoreIngestService.js  # reads /devices/CB_001/live/latest + /snapshots/latest
│   │   │   ├── isolationForestService.js  # anomaly scoring + 20-min retrain
│   │   │   ├── yolov8Service.js           # defect class + severity from image_base64
│   │   │   ├── rulService.js              # RUL fusion — PLACEHOLDER, formula unresolved (prd.md)
│   │   │   ├── ragService.js              # Pinecone retrieval
│   │   │   ├── genaiService.js            # LangChain alert/report generation
│   │   │   └── excelExportService.js      # alert log → color-coded Excel
│   │   ├── models/                        # SensorReading, Alert, Detection, Joint, Report
│   │   ├── jobs/
│   │   │   ├── isolationForestRetrainJob.js
│   │   │   └── firestoreSyncJob.js        # Firestore → MongoDB, PLACEHOLDER strategy (prd.md open question)
│   │   ├── middleware/                    # errorHandler.js, validateRequest.js
│   │   └── utils/logger.js
│   └── package.json
│
├── prd.md
├── thmem.md
├── AGENT_CONTEXT.md                        # living handoff file — see §12
└── README.md
```

---

## 4. Firestore — exact config and schema (use these values, don't invent your own)

### 4.1 Firebase config
Create `frontend/src/firebase/firebaseConfig.js`:
```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAm3BqAwmWBz__C7SAKOhDhADxiVDE38No",
  authDomain: "conveyorbelt-pdm.firebaseapp.com",
  projectId: "conveyorbelt-pdm",
  storageBucket: "conveyorbelt-pdm.firebasestorage.app",
  messagingSenderId: "442274925279",
  appId: "1:442274925279:web:afea81ae499e7315e5376a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```
This is a Firebase **web client config** — it's meant to be public (access control is enforced by Firestore Security Rules, not by hiding this key), so it's fine as-is in the repo. Do not add environment-variable indirection for this unless you're also setting up actual Firestore Security Rules — don't create false security theater around it.

### 4.2 Firestore document paths and schema

**Sensor readings** — `/devices/CB_001/live/latest`
```json
{
  "device_id": "CB_001",
  "edge_health": 0,
  "features": {
    "current_rms": 0,
    "temp_belt": 0,
    "temp_motor": 0,
    "vib_rms": 0
  },
  "timestamp": 0
}
```

**Camera snapshots** — `/devices/CB_001/snapshots/latest`
```json
{
  "device_id": "CB_001",
  "image_base64": "",
  "resolution": "QVGA",
  "timestamp": 0
}
```

Notes for implementation:
- Both are single documents at a fixed path (`.../latest`), not a growing collection — use `onSnapshot(doc(db, ...))` for a live listener, not a collection query. Each new reading **overwrites** `latest`; it does not append.
- `features` is the anomaly-detection input vector for Isolation Forest — map `current_rms`, `temp_belt`, `temp_motor`, `vib_rms` directly to model input, in that field order unless the model was trained with a different order (check the model artifact if one exists).
- `edge_health` is a pre-computed health score from the edge device itself — treat it as a signal to display/consider, not something the frontend recalculates.
- `image_base64` will be a base64-encoded image string at QVGA resolution (320×240) — decode accordingly for the Vision Monitoring viewer and for YOLOv8 input.
- `timestamp` is currently `0` in the sample data — confirm whether this will be a Unix epoch (seconds or ms) or a Firestore `Timestamp` type once real data starts flowing, and handle both defensively (don't assume one format and crash on the other).
- Since `live/latest` and `snapshots/latest` are overwritten in place, the frontend/backend — not Firestore — is responsible for **keeping history**: every time `firestoreSyncJob.js` observes a change, append it to MongoDB (for the 20-minute Isolation Forest window) rather than relying on Firestore to hold a log.
- Build `firestoreSyncJob.js` as a Firestore `onSnapshot` listener (real-time push), not a polling loop — this matters both for the "minimal latency" non-functional requirement and for not hammering Firestore reads.

---

## 5. Design system (must match thmem.md exactly — do not deviate)
- Colors: Background `#214366`, Surface `#151C23`, Elevated Surface `#1B242D`, Border `#2A3742`, Grid Line `#23303A`, Primary Accent `#22D3EE`, Secondary Accent `#38BDF8` (minor UI only), Main Text `#E7EDF2`, Muted Text `#8B9AA8`, Data Viz Neutral `#64748B`, Healthy `#22C55E`, Warning `#F59E0B`, Critical `#EF4444`, Overlay Scrim `rgba(15,20,25,0.7)` — define as CSS variables, never hardcode hex in components.
- Status colors represent real state only — never decorative. Always pair color with a label/icon, never color alone.
- Typography: Inter (or similar) for UI text; monospace/tabular numerals for all technical values (readings, RUL, timestamps, confidence, IDs).
- Compact spacing, 4–6px radius, thin borders, subtle transitions, information-dense but not cluttered. No theme toggle. No excessive shadows/gradients/animation.

---

## 6. Screens — build in this order
1. **Home** — project overview + usage guide.
2. **Dashboard** — Page Header → KPI Cards (Machine Health, Conveyor Status, Active Alerts, RUL) → Conveyor Overview → Sensor Monitoring cards (Temperature/Vibration/Current/etc., sourced from `features`) → Health Gauge → RUL card → Recharts trend charts (Temperature, Vibration, Current) → Recent Alerts + "View All."
3. **Digital Twin** — procedural Three.js scene: steel truss/pillars/guardrails, Head Drive Station, Tail Loading Station, 3-roll troughing idlers + return rollers, ore lump stream, 3 sensor gantries (Optical Line-Scan, Ultrasonic Core Scanner, Tri-Axial Vibration), closed-loop 35°-troughed belt (custom `BufferGeometry`, procedural canvas texture). Kinematics: 4-section loop (top strand w/ catenary sag, head arc, return strand, tail arc), 60fps delta-time loop advancing UVs/rollers by belt speed, 6 splice joints (Joint-01…06) with correct position/orientation. Joint status colors: OPTIMAL `#10B981`, ELEVATED_WEAR `#F59E0B`, CRITICAL_DELAMINATION `#EF4444` (pulsing halo) — mutate materials in place, never rebuild geometry. Camera: orbit controls + 5 lerped presets (Orbit, Head Discharge, Tail Hopper, Top-Down Synoptic, Follow Splice). Click-to-select via raycasting → Joint Details `Sheet` (status, health %, last inspection, detected issues, confidence, recommended action) or full inspector (RUL w/ trend arrow, rupture risk bar, 72h sparkline, live transducer readouts, AI recommendation). LIVE/HISTORICAL toggle with 72h scrubber, 1x/5x/20x playback, O(1) indexed lookup. Full cleanup on unmount (cancel RAF, dispose renderer/textures/geometries).
4. **Vision Monitoring** — image viewer (decoded `image_base64`) + detection info panel (class, confidence, severity) + detection history table. Built for real YOLOv8 wiring — bounding box + class + confidence + severity overlay. No fake/simulated detections beyond clearly-labeled placeholder mock data.
5. **Sensor Health** — per-sensor online/offline status, trend charts, detail cards (reading, health %, last update, trend) — sourced from the same `features` fields.
6. **Alerts** — stats row (Total/Critical/Warning/Acknowledged), filters (severity/status/date/search), alert table. Acknowledge flow requires confirmation before status updates. Emergency Stop = destructive-styled button behind a confirmation dialog — never a single-click destructive action.
7. **Reports** — stats, filters, report list, "Generate Report" (types: Conveyor Performance, Damage Detection, Sensor Health, Alert History, Maintenance).
8. **Settings** — tabs: General, Conveyor, Sensors, Notifications (toggle switches), System.

Global: AI Assistant accessible from Sidebar/Topbar on every screen (not a dedicated route).

---

## 7. Functional logic
1. **Ingest:** live listener on `/devices/CB_001/live/latest` (readings) and `/devices/CB_001/snapshots/latest` (photos) — see §4.2.
2. **Sensor anomaly detection:** JS Isolation Forest on the `features` vector. MongoDB holds a rolling 20-minute window (populated by `firestoreSyncJob.js`); retrain every 20 minutes on that window, then clear it.
3. **Vision defect detection:** YOLOv8 on the decoded snapshot image → defect class + severity score → feeds Vision Monitoring.
4. **RUL estimation:** fuse Isolation Forest output + YOLOv8 output + raw `features` into one RUL value. **Formula is unresolved in prd.md** — implement a clearly commented placeholder (simple weighted heuristic) that's trivial to swap.
5. **Digital twin:** driven by live `features` + joint state.
6. **RAG + GenAI:** Pinecone-backed retrieval + LangChain generation for human-readable alerts (what/why/prevention) and daily reports. Alerts log = last 5 minutes of readings, exportable to Excel (green = normal, red = problem, timestamped).

---

## 8. Non-functional requirements
- Secure Firestore access (rules-based, not security-through-obscurity on the client config).
- Minimal latency: use `onSnapshot` listeners, not polling, anywhere real-time data is needed.
- Robust state management (Redux), validation, error handling — every data component needs Loading/Success/Empty/Error states.
- Graceful degradation on connectivity loss (mine environment) — buffering/retry, not hard failure. Evaluate MQTT for sensor transport if/when this moves off Firestore-only ingest.

---

## 9. Explicitly out of scope
No auth/login, no RBAC, no drone inspection, no thermal imaging hardware, no direct SCADA/PLC integration, no physical IoT sensor deployment work (data is assumed to already be flowing into Firestore, per §4).

---

## 10. Known open questions — placeholder, don't silently decide
- RUL fusion formula (§7.4)
- Firestore → MongoDB sync strategy — use `onSnapshot` push-based sync (per §4.2) as the default approach, but flag it as an assumption in code comments since prd.md leaves this open
- Network-resilience fallback strategy for connectivity drops
- `timestamp` format in Firestore docs (currently `0` in sample data — handle both epoch and Firestore `Timestamp` defensively, per §4.2)

---

## 11. Quality bar (what "working well" means here)
- Every screen must run cleanly against mock data with zero console errors before Firestore is wired in.
- Mock data must match the exact schema in §4.2 — not an approximation — so swapping in live data later requires no shape changes.
- Don't leave TODO stubs for anything in this prompt without a comment explaining what's missing and why (e.g. "RUL formula pending — see prd.md").
- After each phase (§0), briefly summarize what was built and what's left before continuing, so I can catch drift early instead of at the end.

---

## 12. `AGENT_CONTEXT.md` — persistent handoff file (required)
Different AI coding agents/tools may work on this project at different times — this file is the only thing guaranteed to carry context between them, since chat history and IDE session state don't transfer. Treat it as seriously as the code itself.

**Rules:**
- Create it in the project root in phase 1, before any other code.
- Update it at the end of **every phase** (§0) and any time you make a decision on one of the open questions in §10 — not just at the end of a session.
- Never delete history from it — append/update sections, don't wipe prior entries. If something becomes stale, mark it superseded rather than removing it, so a future agent can see what changed and why.
- Write it for an agent with zero prior context on this conversation — it should be able to read only `prd.md`, `thmem.md`, and `AGENT_CONTEXT.md` and know exactly where the project stands, with no access to this prompt or any chat history.

**Required sections:**

```markdown
# Agent Context — Shield / SmartConveyor

## Current status
[One paragraph: what phase the project is in, what's working, what's mid-build right now]

## Completed
- [Phase/feature] — [date] — [1-line summary of what was built and where]

## In progress
- [What's currently being worked on, and the exact next step to resume it]

## Decisions made on open questions
- [Open question from prd.md/prompt §10] → [decision made] → [reasoning] → [date]
  (e.g. "Firestore→MongoDB sync: implemented as onSnapshot push-based listener,
   not polling — chosen for latency + to avoid unnecessary Firestore reads — 2026-XX-XX")

## Known issues / deferred work
- [Anything intentionally stubbed, skipped, or left for later, and why]

## Key file map
- [Where the important logic lives, if it's not obvious from the folder structure alone
   — e.g. "RUL placeholder formula: backend/src/services/rulService.js, line ~40"]

## Do NOT do this
- [Any dead end already tried and rejected, so a new agent doesn't repeat it]
```

Keep entries concise — this file is for orientation, not a full changelog. If it starts exceeding a few hundred lines, condense older "Completed" entries into short summaries rather than deleting them.
