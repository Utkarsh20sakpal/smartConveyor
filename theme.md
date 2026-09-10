SMARTCONVEYOR — 

Build a complete, production-quality frontend web application for:

SmartConveyor — Intelligent Monitoring and Prediction of Conveyor Belt Joint Rupture and Damages in Iron Ore Mining Industry

The application is an industrial monitoring and control dashboard for monitoring conveyor belts, detecting belt/joint damage, viewing sensor health, visualizing a digital twin, managing alerts, generating reports, and interacting with an AI assistant.

---



---

2. TECHNOLOGY STACK

Use:

- React
- Vite
- JavaScript/JSX
- Tailwind CSS
- shadcn/ui
- React Router
- Lucide React icons
- Recharts for charts
- Three.js for the existing Digital Twin
- Existing project libraries should be preserved.
- Animations  Gsap 
 - react 4 layer Architecture and redux for state managagement

Do not introduce unnecessary UI libraries.

shadcn/ui should be the primary UI component system.

---

3. DESIGN DIRECTION

The design is engineered as a:

Modern, Unique & Pleasing Industrial Conveyor Monitoring Suite (Industrial SaaS HMI)

Tailored specifically for mission-critical iron ore overland conveyor predictive maintenance (1,200 m closed loop system).

The UI feels:

- Professional & Enterprise-grade: High-fidelity industrial instrumentation without harsh visual noise.
- Pleasing & Low-Fatigue: Eliminates harsh pitch-black vs. blinding-white contrast with a balanced Midnight Titanium palette for multi-hour control room shifts.
- Unclustered & Spacious: Generous visual breathing room, balanced 4-tier dashboard hierarchy, and fluid card padding.
- Modern & Thematic: Built around an interactive **Synoptic Conveyor Belt Highway** visualizer showing the continuous 1,200 m closed loop and 6 interactive splice joints (Joint-01 to Joint-06).
- Distinctive & Refined Typography: Custom **Sora** display font for headings and brand elements, paired with **Space Grotesk** for technical badges and **JetBrains Mono** for numerical telemetry.

---

4. COLOR SYSTEM (LOW-FATIGUE MIDNIGHT TITANIUM)

Use a balanced Midnight Titanium & Deep Obsidian Slate dark theme. It eliminates eye fatigue by moderating extreme contrasts while retaining crisp edge definitions and luminous accents.

Base foundation:

- Canvas Background: #0C1019 (Deep Obsidian Slate with subtle ambient radial illumination)
- Card Surface: #141B28 (Warm Midnight Titanium container with soft 1px inset specular highlight)
- Elevated Surface: #1A2334 (Active states, modals, popovers, and hover states)
- Sidebar / Topbar: #0E131F (Calm structural framing with subtle glassmorphic backdrop filter)
- Border / Outline: rgba(255, 255, 255, 0.08) (Refined translucent boundaries, no harsh metal wireframes)
- Subtle Dividers: rgba(255, 255, 255, 0.04)
- Grid Lines (charts): rgba(255, 255, 255, 0.03)

Accent colors:

- Primary Accent: #38BDF8 (Luminous Sky Cyan)
- Secondary Accent: #818CF8 (Soft Indigo / Periwinkle)
- Accent Dim / Fill: rgba(56, 189, 248, 0.08)
- Accent Glow: rgba(56, 189, 248, 0.18)
- Accent Border: rgba(56, 189, 248, 0.25)

Text colors:

- Main Headings / Primary: #E2E8F0 (Soft natural off-white, eliminates glare of 100% pure white)
- Secondary / Labels: #94A3B8 (Warm slate for descriptions, metrics units, and breadcrumbs)
- Muted / Captions: #64748B (Tertiary metadata and hardware indices)
- Accent Text: #38BDF8 (Interactive states, active tabs, and telemetry highlights)

Status colors (strictly physical condition):

- Healthy / Nominal: #10B981 (Fresh Emerald Green)
- Warning / Degraded: #F59E0B (Warm Amber)
- Critical / Fault: #F43F5E (Modern Rose Red)

Rules:
- Never use 100% stark white (#FFFFFF) for body paragraphs; use soft #E2E8F0 and #94A3B8.
- Never use pitch-black (#000000 or #0A0E17); use warm Midnight Slate (#0C1019 / #141B28) with subtle specular highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.08)`).
- Tabular figures (JetBrains Mono) for all numerical telemetry and timestamps.

---

5. TYPOGRAPHY STACK

- Primary Display & Headings: **Sora** (Google Font, geometric curves with futuristic precision, .font-display)
- Subsystem & Badge Font: **Space Grotesk** (Google Font, distinctive technical character, .font-tech)
- Telemetry & Tabular Font: **JetBrains Mono** (Google Font, fixed-width monospace, .font-mono)

Typography hierarchy:
- Display Headings (H1, H2): Sora, semibold/bold, tracking-tight, soft off-white (#E2E8F0)
- Section Titles & Module Headers: Sora, font-semibold (15–18px)
- Badges, Status Tags, Tabs: Space Grotesk, font-medium/semibold (11–13px)
- Telemetry Readings, RUL Hours, RPM, Temperatures: JetBrains Mono (14–28px, tabular figures)
- Body text & descriptions: Sora, regular, text-slate-400 (13–14px)

---

6. GENERAL UI & STRUCTURAL PRINCIPLES

- **Conveyor Synoptic Highway**: Anchors the entire dashboard around the physical 1,200 m closed loop conveyor with 6 interactive splice joints (Joint-01 to 06) and live animated chevron motion.
- **4-Tier Operations Command Deck**:
  - Tier 1: Synoptic Conveyor Highway & loop position indicator
  - Tier 2: Machine Health & Reliability Indices + Transducer Array (TT-101, TT-102, VT-201, CT-301)
  - Tier 3: Waveform telemetry (Vibration RMS, Thermal Drift)
  - Tier 4: Anomaly triage & live incident feed
- **Visual Breathing Room**: Spacious padding (p-5, p-6, gap-5, gap-6) prevents cognitive overload.
- **Soft Modern Contours**: 14–20px border radius (rounded-xl, rounded-2xl) with subtle top-edge illumination.
- **Micro-Interactions**: Gentle hover elevation, soft cyan glow on active pills, smooth transitions.

---



7. APPLICATION STRUCTURE

Create the following application screens:

/Home
/dashboard
/digital-twin
/vision-monitoring
/sensor-health
/alerts
/reports
/settings

The AI Assistant should be available globally rather than necessarily being a separate full page.

---


---

7.1 - HOME PAGE — EXECUTIVE OPERATIONS LAUNCHPAD

The Home page serves as the mission control landing portal and high-level operational launchpad. It provides an executive summary of conveyor mechanical specifications, real-time data architecture pipeline, and an interactive module grid to navigate the application.

Layout Structure:
- Header: Title, subtitle, live status badge (`ONLINE`), and direct "Open Telemetry Dashboard →" CTA button.
- Mechanical Hero Banner (Deep-space gradient `#0D1B2A` to `#112236` with 1px border):
  * Operational Metadata: Deployment site (`Kiriburu Iron Ore Complex · CV-101`), Project Shield SCADA Tier 2 badge.
  * Mechanical Conveyor Specifications: Belt Length (`1,200 m` Steel Cord ST-3150), Belt Velocity (`2.40 m/s`), Tonnage Throughput (`1,850 TPH` Hematite), Active Joint Splices (`6 Vulcanized`).
  * 4-Tier System Architecture: Edge Sensor Stream (MQTT/Modbus), Anomaly Core (Isolation Forest), Computer Vision (YOLOv8 Line-Scan), GenAI Reasoning (LangChain + Pinecone RAG).
- Operational Modules Grid: 6 high-density interactive cards (Condition Dashboard, 3D Digital Twin, Vision Inspection, Sensor Fleet Health, Incident Alert Log, Compliance Reports) featuring category tags (`REAL-TIME`, `KINEMATICS`, `YOLOV8 AI`, etc.), hover elevation, and direct access links.
- Technology Stack Footer: Reusable banner summarizing React 18, Vite, Redux Toolkit, Three.js, Recharts, Tailwind CSS, Firebase, and Node.js.

---

8. MAIN APPLICATION LAYOUT

Structure:
┌─────────────────────────────────────────────────────────────┐
│                        TOPBAR (HMI Command Header)          │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│   SIDEBAR     │              PAGE CONTENT                   │
│ (Collapsible  │         (Full-Width Balanced Grid)          │
│ 60px / 220px) │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘

Component: `DashboardLayout.jsx`
- Layout Container: Full viewport height (`h-screen w-screen overflow-hidden`), dark canvas (`--color-background: #07111D`).
- Responsive Main Canvas: `overflow-y-auto p-4` with unified design tokens.
- Slide-over Co-Pilot: Integrated slide-over drawer (`AIAssistantPanel.jsx`) triggered from the Topbar.

---

9. SIDEBAR SPECIFICATION

Component: `Sidebar.jsx`
- Dimensions: Collapsible width (220px expanded, 60px collapsed icon-only) with smooth CSS bezier transition.
- Header:
  * Brand Logo: 32x32px gradient container (`#00C3F0` to `#0099C9`) with Lucide `Shield` icon and subtle cyan glow (`box-shadow: 0 0 12px rgba(0, 195, 240, 0.2)`).
  * Brand Typography: "SmartConveyor" (Outfit font, bold) and "Shield v0.1 · CB_001" subtitle.
  * Collapse Toggle: Chevron button to collapse/expand.
- Navigation Items:
  1. Home (`/home` · Lucide `Home`)
  2. Dashboard (`/dashboard` · Lucide `LayoutDashboard`)
  3. Digital Twin (`/digital-twin` · Lucide `Box`)
  4. Vision Monitoring (`/vision-monitoring` · Lucide `Camera`)
  5. Sensor Health (`/sensor-health` · Lucide `Activity`)
  6. Alerts (`/alerts` · Lucide `Bell` with live red counter pill)
  7. Reports (`/reports` · Lucide `FileText`)
  8. Settings (`/settings` · Lucide `Settings`)
- Active State Styling:
  * Left accent indicator bar (3px solid `#00C3F0`).
  * Subtle gradient background (`rgba(0, 195, 240, 0.08)`).
  * Glowing cyan indicator dot on the trailing edge.
- Footer Section:
  * Pulsing system health beacon (`SYSTEM ONLINE`).
  * Operator Identity card (`Technician · CB_001 Operator`).

---

10. TOPBAR SPECIFICATION

Component: `Topbar.jsx`
- Height: 56px (14 rem) fixed HMI header with subtle bottom border (`#1A3048`) and elevation shadow.
- Left Cluster:
  * Breadcrumb Path: Section pill badge (e.g. `OPERATIONS`, `DIAGNOSTICS`, `INCIDENTS`) + chevron + bold page title.
  * Conveyor Identity Tag: `CB-001 Primary Pit Arterial (1.2 km)` with live green status dot.
- Right Cluster:
  * Digital Clock: Real-time 24-hour clock with live seconds counter and time zone (`UTC+05:30`).
  * System Status Badge: Pulsing emerald beacon (`ONLINE` in `--color-healthy`).
  * Alert Quick-Access Button: Bell icon with pulsating badge count for active critical alerts.
  * AI Co-Pilot Button: Cyan gradient button (`#00C3F0` tint) with glowing robot icon to open slide-over assistant.

---



12. DASHBOARD

12. DASHBOARD (OPERATIONAL TELEMETRY CONSOLE)

The Dashboard is the primary operational screen for real-time condition monitoring, anomaly scoring, and predictive maintenance tracking.

5-Tier SCADA Layout Hierarchy:
┌─────────────────────────────────────────────────────────────┐
│ 1. HIGH-LEVEL KPI STRIP (4 Instrument Cards)                │
├──────────────────────────────┬──────────────────────────────┤
│ 2. CONVEYOR OVERVIEW (8 cols)│ HEALTH GAUGE & RUL (4 cols)  │
├──────────────────────────────┴──────────────────────────────┤
│ 3. REAL-TIME SENSOR CHANNELS (4 Edge Transducer Cards)      │
├─────────────────────────────────────────────────────────────┤
│ 4. ROLLING TELEMETRY WAVEFORMS (3 Recharts Area Charts)     │
├─────────────────────────────────────────────────────────────┤
│ 5. RECENT OPERATIONAL ALERTS & INCIDENTS (Triage Log)       │
└─────────────────────────────────────────────────────────────┘

---

13. DASHBOARD PAGE HEADER

Component: `PageHeader.jsx`
- Title: "Live Conveyor Telemetry & Health"
- Subtitle: "Real-time sensor fusion, Isolation Forest anomaly scoring, and predictive RUL tracking"
- Status Badge: System health pill (`ONLINE` with pulsing green beacon).
- Actions Slot: Sync timestamp (`Sync: HH:MM:SS`) and `LIVE TELEMETRY` channel indicator.
- Divider: Gradient cyan underline (`linear-gradient(90deg, rgba(0,195,240,0.4) 0%, rgba(26,48,72,0.6) 30%, transparent 100%)`).

---

14. KPI CARDS SPECIFICATION

Component: `KPICard.jsx`
- Container: Surface background (`#0D1B2A`) with border (`#1A3048`), hover elevation, and top color indicator bar (2px solid accent/status color).
- Metrics:
  1. Overall Machine Health: `96.4%` (Green accent, Subtitle: "Nominal threshold > 80%").
  2. Belt Motion State: `RUNNING` (Cyan accent, Subtitle: "2.4 m/s Nominal").
  3. Active Alarm Log: `02 EVENTS` (Red/Amber accent, Subtitle: "1 Critical Priority").
  4. Remaining Useful Life: `147 HOURS` (Amber accent, Subtitle: "Estimated Time to Splice Service").
- Data Styling: JetBrains Mono bold figures (28px) with status badges in high-contrast pills.

---

15. CONVEYOR OVERVIEW CARD

Component: `ConveyorOverview.jsx`
- Primary Machinery Card: Spans 8 grid columns.
- Identity: "CONVEYOR C-01" with status badge (`RUNNING`), operating condition badge (`STATE: NORMAL`), and facility subtitle ("Primary Heavy-Duty Overland Infeed Belt · Kiriburu Pit No. 2").
- Primary Telemetry Triad:
  * Surface Velocity: `2.4 m/s` (Nominal rating).
  * Dynamic Load: `72%` (Hematite ore).
  * Aggregate Health: `96.4%` (Multi-modal sensor health index).
- Auxiliary Mechanical Strip (Bottom 4 columns):
  * Drive Motor: `450 kW ABB AC`
  * Belt Tension: `142.5 kN (Nominal)`
  * Shift Tonnage: `14,280 Tons`
  * Inspection Camera: `SYNCED 30 FPS`

---

16. REAL-TIME SENSOR CHANNELS

Component: `SensorCard.jsx`
- 4 Instrument Cards spanning the width:
  1. Belt Surface Temp: `25.4 °C` · Range: 10°C – 60°C · Trend: UP ↗
  2. Drive Pulley Vib (RMS): `3.21 mm/s` · Range: 0 – 10 mm/s · Trend: STABLE →
  3. Motor Phase Current: `0.031 A` · Range: 0.01 – 0.10 A · Trend: DOWN ↘
  4. Winding Temp (Motor): `38.7 °C` · Range: 20°C – 80°C · Trend: STABLE →
- Card Details: Sensor channel icon, status pill, bold JetBrains Mono reading, trend symbol with text label, and sync timestamp.

---

16. SENSOR MONITORING

Create sensor cards for:

Temperature

Temperature
25.4 °C
● NORMAL

Vibration

Vibration
3.21
● NORMAL

Current

Current
0.031 A
● NORMAL

Each sensor card should display:

- Sensor icon
- Sensor name
- Current reading
- Unit
- Status
- Trend
- Last updated
- Optional mini sparkline

Create a reusable:

"SensorCard"

component.

---

17. HEALTH GAUGE

Create a professional health gauge.

Example:

        ╭────────╮
      ╱            ╲
     │     96.4%    │
     │    HEALTH    │
      ╲            ╱
        ╰────────╯

       ● HEALTHY

The gauge should visually communicate:

- Healthy
- Warning
- Critical

Do not use excessive animation.

---

18. RUL COMPONENT

Create a Remaining Useful Life card.

Example:

REMAINING USEFUL LIFE

147 HOURS

████████████████░░░░

Estimated operating time remaining

Confidence: 91%

Use:

- Card
- Progress
- Badge

---

19. SENSOR TREND CHARTS

Use Recharts.

Create separate charts for:

Temperature

Show temperature over time.

Vibration

Show vibration over time.

Current

Show current over time.

Each chart should include:

- Chart title
- Current value
- Time axis
- Tooltip
- Grid
- Status indication where appropriate

Use realistic mock data initially.

Do not create fake alerts from random values.

---

20. RECENT ALERTS

Create a compact alert section on Dashboard.

Show:

Recent Alerts

10:42   Joint Damage       CRITICAL
10:35   High Vibration     WARNING
09:51   Temperature        WARNING
09:22   Sensor Offline     CRITICAL

Each row should include:

- Time
- Alert type
- Severity
- Status
- View action

Provide:

"View All Alerts"

button.

---

21. DIGITAL TWIN SCREEN

Create the Digital Twin page 

Layout:

Digital Twin

┌────────────────────────────────────────────┐
│                                            │
│           THREE.JS CONVEYOR                │
│              3D VIEW                       │
│                                            │
│                                            │
└────────────────────────────────────────────┘

Conveyor Status      RUNNING
Health               96.4%
Speed                2.4 m/s

Include:

- 3D conveyor visualization
- Conveyor status
- Machine health
- Speed
- Control buttons
- Selected joint information

---

22. DIGITAL TWIN CONTROLS

Act as a Senior 3D WebGL / Three.js Engineer and Full-Stack React Architect. 

Build a complete, real-time, interactive 3D Digital Twin for an industrial ore mining conveyor belt system (e.g., NMDC 1200m ST-5400 steel cord conveyor) using React and Three.js.

=============================================================================
CORE REQUIREMENTS & SPECIFICATIONS
=============================================================================

1. PROCEDURAL 3D CONVEYOR GEOMETRY & ENVIRONMENT:
   - Construct the entire conveyor procedurally without external 3D CAD dependencies:
     * Structural steel truss stringers, vertical support pillars, and yellow safety guardrails.
     * Head Drive Station with rotating drive pulley, motor gearbox, and ore discharge hood.
     * Tail Loading Station with rotating tail pulley, impact bed, and overhead ore feed hopper chute.
     * 3-Roll Troughing Idler Sets along the top carrying strand (center roll horizontal, two wing rolls at +35° and -35° trough angles) and flat horizontal return rollers on the bottom strand.
     * Dynamic Stream of Iron Ore Lumps riding on the carrying strand that recycle at the discharge end.
     * Stationary Sensor Gantries: (1) Optical Line-Scan AI Gantry with downward visible laser sheet, (2) Ultrasonic Core Scanner Bridge, (3) Tri-Axial Vibration Station on bearing housings.
   - Closed-Loop 35° Troughed Rubber Belt Ribbon:
     * Generate custom BufferGeometry with 5 transverse vertices across the width to form a 35° trough curve on the top strand and a flat profile on the return strand.
     * Procedural canvas texture featuring dark vulcanized rubber, chevron cleats, steel cord ribs, and cyan alignment lines.

2. MATHEMATICAL KINEMATICS & CONTINUOUS LOOP PHYSICS:
   - Model the closed loop of total length L_total = 2*L + 2*PI*R across 4 piecewise sections:
     (1) Top carrying strand (-L/2 to +L/2 with catenary idler sag),
     (2) Head discharge 180° arc (+L/2),
     (3) Bottom return strand (+L/2 to -L/2),
     (4) Tail hopper 180° arc (-L/2).
   - In the 60 FPS animation loop, advance belt texture UV coordinates and rotate rollers based on belt speed (m/s).
   - Propagate 6 vulcanized splice joints ('Joint-01' through 'Joint-06') along the path, matching position and orientation quaternions from tangent and normal vectors.
   - Trigger laser scan and LED glow intensity when moving joints pass under sensor gantries.

3. SPLICE JOINT ENTITIES & DYNAMIC HEALTH STATES:
   - Each joint includes: (a) Transverse Seam Bar, (b) Floating HUD Status Pin, (c) Pulsing Alert Halo Ring.
   - Status color coding:
     * OPTIMAL (Green / 0x10B981) - Healthy splice.
     * ELEVATED_WEAR (Amber / 0xF59E0B) - Moderate wear, warning glow.
     * CRITICAL_DELAMINATION (Red / 0xEF4444) - Severe delamination, pulsing halo, energetic flash.
   - Support in-place material updates without tearing down or recreating 3D geometries.

4. CAMERA RIG & 5 OPERATIONAL VIEW PRESETS:
   - Spherical orbit controls (left-click drag to rotate, wheel to zoom).
   - Smooth camera lerp transitions for 5 view modes:
     (1) Orbit (Isometric default),
     (2) Head Discharge (drive station & chute),
     (3) Tail Hopper (loading zone),
     (4) Top-Down Synoptic (full belt overview),
     (5) Follow Splice (dynamically tracks the selected moving joint along the loop).

5. INTERACTIVE RAYCASTING & SPLICE DIAGNOSTIC INSPECTOR:
   - Raycasting on pointer click to select any joint in the 3D viewport.
   - Dedicated side inspector card showing:
     * Diagnostic Status Badge & Splice Name.
     * Estimated Remaining Useful Life (RUL in days & hours) with degrading/improving trend arrows.
     * Rupture Risk Index progress bar.
     * 72-Hour Health Degradation SVG Sparkline with an active timeline needle.
     * Physical Transducer Array (Ultrasonic Thickness mm, Thermal Core °C, Vibration mm/s, Acoustic dB).
     * AI Maintenance Prescription Recommendations.

6. 72-HOUR HISTORICAL TIME-TRAVEL SCRUBBER:
   - Toggle between 'LIVE STREAM' and 'HISTORICAL PLAYBACK'.
   - Horizontal timeline slider spanning 72 hours ago to Present.
   - Play/Pause continuous clock with 1x, 5x, and 20x speed multipliers.
   - Instant O(1) indexed lookup of historical telemetry to update 3D joint health and colors in place.

7. PERFORMANCE & LIFECYCLE BEST PRACTICES:
   - Delta-time based animation smoothing.
   - Mutate existing materials/positions in-place (no re-renders/leaks).
   - Comprehensive unmount cleanup (cancel requestAnimationFrame, remove listeners, dispose renderer and textures).

---

23. JOINT DETAILS

When a conveyor joint is selected:

Open a right-side:

"Sheet"

Display:

JOINT J-04

Status
● WARNING

Health
82%

Last Inspection
08 Sep 2026

Detected Issues
Surface Damage

Confidence
93%

Recommended Action
Schedule maintenance inspection

The Sheet should not cover the entire application.

---

24. VISION MONITORING SCREEN

Component: `VisionMonitoring.jsx`
Dedicated high-speed computer vision splice surveillance suite designed for real-time line-scan inspection and YOLOv8 defect segmentation.

Layout Hierarchy (12-Column Responsive Grid):
- Page Header: Title, subtitle, and live camera status badge (`CAM_01 ACTIVE · 30 FPS`).
- Row 1: Optical Camera Viewport (8 Columns) + Defect Diagnostic File (4 Columns)
  * Optical Viewport:
    - Top Status Bar: Line-scan camera ID (`BASLER-4K-GIGE`), resolution `1920 × 1080 @ 30 FPS`, shutter `1/4000s (Anti-Motion Blur)`, and pulsing `LIVE STREAM` indicator.
    - Viewport Container: Dark industrial viewport with vulcanized splice joint visual marker and simulated steel cord texture.
    - YOLOv8 Bounding Box: Interactive defect bounding box with defect class tag, confidence percentage (`Joint Damage 94%`), animated reticle crosshair, coordinate readout (`[X: 1142, Y: 430]`), and surface area measurement (`142 mm² Delamination`).
    - HUD Telemetry Watermarks: Latency (`14.2 ms`), model version (`YOLOv8x-OreDefect-v4.1`), Edge TPU temperature (`48.2°C`), and ISO timestamp.
  * Defect Diagnostic File:
    - Defect classification summary with rubber delamination description.
    - Neural confidence gauge (`94%`) and splice location (`Joint-04`).
    - Estimated defect growth rate (`+1.2 mm / 100 operating hrs`).
    - Actionable maintenance recommendation prescription and "Dispatch Work Order" CTA button.
- Row 2: Historical Vision Defect Log Table (Full Width):
  * Table Columns: Detection Time, Defect Classification, Conveyor Joint, Neural Confidence, Severity, Status, and "Inspect Frame" action button.
  * Interactivity: Clicking any row immediately projects that defect into the optical HUD inspector.

---

28. SENSOR HEALTH & TRANSDUCER DIAGNOSTICS SCREEN

Component: `SensorHealth.jsx`
Dedicated telemetry surveillance console for physical instrumentation, calibration schedules, and channel integrity.

Layout Hierarchy:
- Page Header: Title, subtitle, and sync status badge (`4/4 CHANNELS SYNCHRONIZED`).
- Row 1: 4 Hardware Transmitter Cards:
  1. `TT-101` — Belt Surface Temperature (`25.4 °C`, Infrared Pyrometer, Warn: ≥32°C, Crit: ≥40°C).
  2. `TT-102` — Drive Motor Winding Temp (`38.7 °C`, PT100 RTD 4-Wire, Warn: ≥42°C, Crit: ≥50°C).
  3. `VT-201` — Bearing Housing Vibration (`3.2 mm/s RMS`, Tri-Axial Piezoelectric, Warn: ≥4 mm/s, Crit: ≥6 mm/s).
  4. `CT-301` — Motor Phase A Current (`0.031 A`, Hall-Effect CT Sensor, Warn: ≥0.04 A, Crit: ≥0.06 A).
  * Card Details: Transmitter tag, hardware label, live status (`ONLINE`), large numeric value, status badge, and set-point trip limits.
- Row 2: Rolling Continuous Telemetry Waveforms (2x2 Grid):
  * 4 Recharts Area Charts showing 60-minute rolling trends with zero packet loss indicators.
- Row 3: Physical Transducer Calibration & Health Specifications (2x2 Grid):
  * Transducer channel integrity progress bar (`Health %`).
  * Field calibration metadata: Physical mounting location, communication protocol/bus (Modbus TCP IP67, 4-20mA, IEPE), Signal-to-Noise ratio (SNR in dB), and certified calibration date.

---

29. ALERTS & INCIDENT MANAGEMENT SCREEN

Component: `Alerts.jsx`
Real-time multi-modal anomaly dispatch, incident triage, and emergency interlock controls.

Layout Hierarchy:
- Page Header: Title, subtitle, and hazardous Emergency Stop trigger button.
- Row 1: 4 Incident KPI Cards:
  * Total Incidents (Shift 24h Log).
  * Critical Faults (Immediate Action Required · Red highlight).
  * Degraded / Warning (Threshold Exceeded · Amber highlight).
  * Active Unreviewed (Pending Operator Acknowledgment).
- Row 2: Incident Search & Filter Toolbar:
  * Free-text search input (filters by defect, sensor ID, or joint location).
  * Severity and Status dropdown filters.
  * Quick Filter Presets: `All`, `🔴 Active Criticals`, `🟡 Active Warnings`, `🟢 Resolved Incidents`.
- Row 3: Incident Log Table:
  * Table Columns: Timestamp, Incident Classification, Source Subsystem, Severity Badge, State Badge, Operational Diagnosis, and Triage Action.
  * Row Styling: Critical active rows highlight with a subtle red tint.
  * Triage Action: "Acknowledge" button opens confirmation dialog to mark alert as reviewed.
- Safety Controls:
  * Emergency Stop Dialog: Prominent hazardous modal detailing the 450 kW drive motor breaker trip, mechanical caliper disc brake engagement, and chute choke warnings.

---

33. COMPLIANCE & PERFORMANCE REPORTS SCREEN

Component: `Reports.jsx`
Automated shift telemetry aggregation, ISO compliance auditing, and export compiler.

Layout Hierarchy:
- Page Header: Title, subtitle, and `DAILY AUDIT ACTIVE` status badge.
- Row 1: 4 Report Audit Metric Cards:
  * Archived Reports, Current Shift Generated, Verified for Mining Audit (`99.4%`), and Storage Used (`4.8 MB`).
- Row 2: Balanced 2-Column Section (8 Cols / 4 Cols):
  * Left Column (8 cols) — Generated Report Index:
    - Search bar and category filter tabs (`All Reports`, `Performance`, `Damage Detection`, `Sensor Health`, `Alert History`).
    - High-contrast table with Document ID, Report Name, Generation Date, Status Badge, File Size, and Export Download action.
    - Security footer with SHA-256 checksum verification note.
  * Right Column (4 cols) — Instant Custom Report Compiler:
    - Dataset type selector (Conveyor Performance, Damage Detection, Sensor Health, Alert History, Maintenance).
    - Audit time interval selector (Current Shift, Past 24h, Trailing 7 Days, Month-to-Date).
    - Format selector buttons: PDF Report, CSV Telemetry, JSON Stream.
    - Direct "Compile & Export" CTA button with compilation feedback toast.

---

34. PLANT & SCADA SETTINGS SCREEN

Component: `Settings.jsx`
Multi-module enterprise configuration console for plant identification, machinery limits, sensor thresholds, and network endpoints.

Layout Hierarchy:
- Page Header: Title, subtitle, Reset Defaults button, and "Apply Configuration" action button.
- Left Navigation Rail (3 Columns):
  * Module Tabs:
    1. General & Plant (Brand name, mine facility, shift roster, measurement standards).
    2. Conveyor Machinery (Nominal speed, length, speed safety envelope, rated TPH).
    3. Transducers & Limits (Warning and critical trip set-points for temperatures and vibrations).
    4. Incident Dispatch (Siren toggles, warning alerts, audible alarms, email digests).
    5. SCADA Gateway & Cloud (Local MQTT broker URI, Firestore telemetry sync).
  * Local Edge Gateway Diagnostic Card:
    - Model: Advantech UNO-2484G
    - Firmware: v2.4.1-LTS
    - Memory: 2.1 / 16 GB (13%)
    - Modbus Polling: 100 ms
- Right Form Panel (9 Columns):
  * Structured cards with unit badges, toggle switches, helper text, and input validation.

---

35. AI CO-PILOT / ASSISTANT PANEL

Component: `AIAssistantPanel.jsx`
Slide-over mission control drawer accessible from the Topbar across all application views.

Features:
- Fixed width: 384px (`w-96`) with high elevation backdrop shadow (`-8px 0 32px rgba(0,0,0,0.5)`).
- Header: Robot icon with cyan glow, status beacon (`LangChain + Pinecone RAG`), and close button.
- Message History: High-contrast message bubbles with distinct styling for operator and AI Co-Pilot.
- Quick Question Chips: One-click inquiry shortcuts (e.g. "Explain Joint-04 delamination fault", "Why is Belt Temp trending upwards?").
- Input Bar: Fixed-bottom text field with keyboard Enter submission and instant diagnostic response synthesis.

---



36. REUSABLE COMPONENTS

Create reusable components rather than duplicating UI.

Recommended structure:

components/
│
├── ui/
│   ├── button
│   ├── card
│   ├── badge
│   ├── input
│   ├── table
│   ├── dialog
│   ├── sheet
│   ├── tabs
│   ├── select
│   ├── progress
│   ├── slider
│   ├── tooltip
│   ├── separator
│   └── scroll-area
│
├── layout/
│   ├── Sidebar
│   ├── Topbar
│   └── DashboardLayout
│
├── dashboard/
│   ├── KPICard
│   ├── SensorCard
│   ├── HealthGauge
│   ├── RULCard
│   ├── SensorChart
│   └── RecentAlerts
│
├── alerts/
│   ├── AlertTable
│   ├── AlertStats
│   └── AlertFilters
│
├── vision/
│   ├── VisionViewer
│   ├── DetectionOverlay
│   ├── DetectionInfo
│   └── DetectionTable
│
└── common/
    ├── StatusBadge
    ├── LoadingState
    ├── EmptyState
    ├── ErrorState
    └── PageHeader

---

37. SHADCN/UI COMPONENT MAPPING

Use shadcn components wherever appropriate:

Cards
→ Card

Buttons
→ Button

Status labels
→ Badge

Tables
→ Table

Confirmation
→ Dialog

Side panels
→ Sheet

Tabs
→ Tabs

Dropdowns
→ Select / DropdownMenu

Progress
→ Progress

Timeline/playback
→ Slider

Forms
→ Input + Label + Form

Notifications
→ Sonner/Toast

Tooltips
→ Tooltip

Separators
→ Separator

Scrollable areas
→ ScrollArea

Do not create custom versions when a suitable shadcn component already exists.

---

38. DATA ARCHITECTURE FOR FRONTEND

For now, create mock data separately from components.

Example conceptual structure:

data/
├── dashboardData.js
├── sensorData.js
├── alertData.js
├── detectionData.js
└── reportData.js

Components should receive data through props.

Do not hardcode the same value in multiple components.

Example:

dashboardData
      ↓
Dashboard
      ↓
KPICard
SensorCard
Chart

This makes later API/Firebase integration easier.

---

39. FRONTEND STATES

Every data-driven component should consider:

Loading

Show skeleton.

Success

Show actual content.

Empty

Show meaningful empty state.

Error

Show error message and retry option.

Example:

Loading
   ↓
Success

or:

Loading
   ↓
Error
   ↓
Retry

---

40. INTERACTIONS

Implement frontend interactions such as:

- Sidebar navigation
- Active navigation state
- Tabs
- Dropdowns
- Filters
- Search
- Dialog opening/closing
- Sheet opening/closing
- Alert acknowledgement UI
- Emergency stop confirmation
- Chart tooltips
- Sensor selection
- Joint selection
- AI Assistant opening
- AI message input
- Loading states
- Toast notifications

Interactions should feel smooth but restrained.

---

41. RESPONSIVE DESIGN

Desktop is the primary target because this is an industrial control dashboard.

Still support:

- Laptop
- Tablet
- Mobile

On smaller screens:

- Collapse sidebar
- Stack cards
- Make tables horizontally scrollable
- Resize charts
- Convert multi-column layouts into one column
- Keep important status information visible

Never allow content to overflow the viewport unnecessarily.

---

42. ACCESSIBILITY

Use:

- Semantic HTML
- Proper button elements
- Labels for inputs
- Keyboard navigation
- Visible focus states
- Accessible dialog labels
- Accessible tooltips
- Good text contrast

Do not rely only on color to communicate status.

For example:

● CRITICAL

rather than only displaying a red color.

---

43. ANIMATIONS

Use subtle animations only.

Allowed:

- Fade
- Slide
- Hover
- Loading pulse
- Status indicator pulse
- Smooth sidebar transition
- Sheet/dialog transitions



The application should feel like professional industrial software.

---

44. PERFORMANCE

Keep the frontend performant.
Important:
Reuse components
Avoid unnecessary re-renders
Lazy-load large pages where useful
Avoid excessive chart rendering
Avoid unnecessary animations
Keep Three.js isolated from unrelated UI updates
Do not load huge assets unnecessarily