# Agent Context — Shield / SmartConveyor

## Current status
Digital Twin WebGL fix & UI-wide Joint eradication COMPLETE — 2026-09-08. Fixed TypeError in buildBeltMesh texture initialization. Migrated all joint state and visual pins in SynopticBeltTrack, TwinCanvas, and DigitalTwin to Conveyor Sector Waypoints (SEC-01 through SEC-06 with meter stations). 3D Digital Twin renders cleanly with camera presets and Sector Inspection drawer. Production build: 2468 modules, 0 errors.

## Completed
- [Pre-Phase 1] AGENT_CONTEXT.md created — 2026-09-08 — required by §12, before any other code
- [Phase 1] Scaffold complete — 2026-09-08 — Vite+React frontend, Node+Express backend, all config files, Redux (5 slices: sensor, alert, detection, twin, ui), Firebase hooks (useLiveReadings, useLiveSnapshot), mock data (§4.2 schema), design tokens (CSS vars), lib/utils, lib/constants. Build verified: 0 errors.
- [Phase 2] Layout shell complete — 2026-09-08 — Sidebar (collapsible, active states, system status), Topbar (status, notifications, AI trigger), DashboardLayout (Outlet), AIAssistantPanel (stub), StatusBadge, PageHeader, States (Loading/Empty/Error). All 8 routes navigate correctly, 0 console errors.
- [Phase 3] All 8 screens complete — 2026-09-08 — Home, Dashboard, DigitalTwin, VisionMonitoring, SensorHealth, Alerts, Reports, Settings.
- [UI/UX Overhaul] Complete visual & UX redesign per user request — 2026-09-08:
  - Design system upgraded to Deep-Space Industrial Dark (#07111D base, #0D1B2A surface, #112236 elevated, #00C3F0 electric cyan accent).
  - Typography upgraded to Google Fonts Outfit (UI/headings) + JetBrains Mono (numerical telemetry/timestamps).
  - Topbar refactored into high-density SCADA command header with breadcrumbs, conveyor identity (CB-001), real-time clock, status pill, alert counter, and AI trigger.
  - Sidebar redesigned with pixel-perfect active states, cyber cyan glow, and system status indicator.
  - Home page redesigned into executive operations launchpad with topology metrics, system architecture breakdown, and interactive module cards.
  - Dashboard redesigned with non-redundant rows, top-tier KPI cards, integrated conveyor mechanical overview, and rolling waveform telemetry charts.
  - Alerts page overhauled with 4 rich metric cards, hazard-styled emergency stop modal, filter presets, and high-contrast table.
  - Sensor Health page redesigned with hardware transmitter cards (TT-101, PT-102, etc.), ISO compliance metadata, and channel integrity bars.
  - Vision Monitoring overhauled with optical line-scan HUD, YOLOv8 bounding box overlay simulation, and defect diagnostic file.
  - Reports page balanced with 2-column layout and instant custom report generator.
  - Settings page transformed into a multi-module industrial plant configuration console.
  - AIAssistantPanel upgraded with mission control styling and prompt chips.
  - theme.md updated to reflect all design system, color palette, and UI/UX layout rules.
  - Build verified: 0 errors. All 8 screens verified with browser screenshots.
- [Joint Scope Cut] Removed all UI-facing joint/splice references — 2026-09-08:
  - **Home.jsx**: Hero H2 title updated. 4th stat card changed from '6 Splice Joints' to live Active Anomalies count (from alert store, conditional warning color). 3D Digital Twin card description updated (no splice tracking mention). YOLOv8 pipeline step: 'Splice defect segmentation' → 'Surface defect segmentation'. All TODO comments left at removal sites pointing to theme.md §5.3.
  - **AIAssistantPanel.jsx**: Removed 'Explain Joint-04 delamination fault' from QUICK_PROMPTS. Replaced with 'Summarise latest surface defect detections'. RUL response text updated (no Joint-04 mention). TODO comments left.
  - **VisionMonitoring.jsx**: 'Splice Joint #04 Under Scan' → 'Belt Surface Under Scan'. '6 joint splices' → 'full belt surface'. Table header 'Joint Splice' → 'Belt Location'. Detail card label 'Joint Location' → 'Belt Location'. TODO comments left.
  - **mockDetectionData.js**: Detection class 'Joint Damage' → 'Surface Delamination'. Location strings 'Joint-04/02/05' → belt position strings ('840 m (CB-001)' etc). Schema shape unchanged.
  - **SynopticBeltTrack.jsx & twinSlice.js**: Completely removed Joint-01..06 pills from the conveyor track (addressed user screenshot). Upgraded to Conveyor Sector Waypoints (SEC-01 through SEC-06 with meter distances 200m..1,200m and Optical AI Gantry beacon).
  - **Digital Twin (`DigitalTwin.jsx` & `buildConveyorScene.js`)**: Fixed `Cannot set properties of undefined (setting 'wrapT')` runtime bug by supplying default parameters to `buildBeltMesh(scene, L, R, tex)`. Replaced joint seam bars with holographic sector beacons and upgraded JointDetailsSheet to SectorDetailsSheet.
  - **Preserved untouched**: Redux store structure, theme.md, all backend services, all infrastructure.

## In progress
- Phase 4 — Firestore integration: enable useLiveReadings/useLiveSnapshot in App.jsx, wire Redux sensor/detection state to screens, backend firestoreSyncJob.js → MongoDB.
- Phase 5 — Backend services: Isolation Forest, YOLOv8 stub, RUL (PLACEHOLDER until formula defined), RAG/LangChain, Excel export.

## Decisions made on open questions
- `thmem.md` reference in prompt is a typo — `theme.md` in project root is the correct design spec file → confirmed by user → 2026-09-08
- Firestore→MongoDB sync: implemented as onSnapshot push-based listener in `firestoreSyncJob.js`, NOT polling — chosen for minimal latency (§8 NFR) and to avoid unnecessary Firestore reads — flagged as assumption in code comments → 2026-09-08

## Known issues / deferred work
- **RUL fusion formula** (prd.md §Risks, prompt §10) — unresolved. A clearly-commented weighted placeholder formula is implemented in `backend/src/services/rulService.js`. See that file for the exact stub. DO NOT silently replace with a real formula without validating it.
- **Network-resilience fallback** — Redux local cache used as graceful degradation; MQTT evaluation deferred (prompt §10).
- **`timestamp` format in Firestore** — currently `0` in sample data. Both Unix epoch (seconds/ms) and Firestore `Timestamp` type are handled defensively everywhere timestamps are consumed.
- **YOLOv8 service** — stub only. Real YOLOv8 model integration requires a Python sidecar or ONNX runtime; left as a clearly-commented placeholder in `yolov8Service.js`.
- **Pinecone/LangChain (RAG + GenAI)** — stubs in `ragService.js` and `genaiService.js`. Requires real API keys and vector store setup.

## Key file map
- Firebase config (exact values): `frontend/src/firebase/firebaseConfig.js`
- CSS design tokens: `frontend/src/index.css` (all CSS variables)
- Redux store: `frontend/src/store/store.js`, slices in `frontend/src/store/slices/`
- Mock data (exact §4.2 schema shape): `frontend/src/data/`
- RUL placeholder formula: `backend/src/services/rulService.js` (look for `// RUL formula pending` comment)
- Firestore sync (onSnapshot): `backend/src/jobs/firestoreSyncJob.js`
- Isolation Forest: `backend/src/services/isolationForestService.js`

## Do NOT do this
- Do NOT rename or restructure the folder tree from §3 of the prompt — it is exact and fixed.
- Do NOT add a dark/light theme toggle — single industrial theme only (theme.md §4).
- Do NOT use status colors (Critical red, Warning amber, Healthy green) decoratively — only for real system state (theme.md §4 rules).
- Do NOT silently decide the RUL fusion formula — it must remain a stub with a comment until validated.
- Do NOT use polling loops for Firestore data — use onSnapshot listeners only.
- Do NOT hand-roll UI components where a shadcn/ui equivalent exists.
- Do NOT add auth/login/RBAC — explicitly out of scope (prd.md).
- Do NOT re-add joint/splice text to UI-facing JSX strings — joint tracking is out of scope for current phase. See theme.md §5.3 for spec. TODO comments in code mark all removal sites.
