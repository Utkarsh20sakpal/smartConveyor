# Shield — Intelligent Monitoring and Prediction of Conveyor Belt Joint Rupture and Damage in Iron Ore Mining

## Background
In the iron ore mining industry, conveyor belt systems are the backbone of material transportation, moving ore from mining faces to crushing, screening, stockyard, and dispatch areas. Belt joints are especially vulnerable to failure from excessive tension, misalignment, wear, overloading, and maintenance deficiencies — and are continuously exposed to heavy loads, dust, moisture, and frequent start-stop cycles, which gradually cause cracks, edge damage, rubber weakening, and splice failure.

Inspection today is mostly manual and done at fixed intervals, so early-stage degradation is easy to miss. Maintenance is largely reactive or schedule-based — repairs happen only after visible damage or breakdown — which drives unexpected shutdowns, emergency repairs, and higher costs. The operational impact spans several dimensions:

- **Production** — loss of ore transportation capacity
- **Maintenance** — increased repair and spare-part cost
- **Safety** — risk of accidents during belt rupture
- **Energy** — higher power consumption from misalignment and friction
- **Asset life** — reduced conveyor and pulley lifespan
- **Sustainability** — material spillage and wastage

As mining moves toward Industry 4.0 and smart mining, there's a growing need for intelligent, real-time, predictive systems that proactively flag belt health deterioration before it becomes catastrophic failure.

## Problem Statement
Conventional maintenance approaches — manual, interval-based inspection and reactive repair — are insufficient to ensure reliable conveyor operation in modern iron ore mining. There is no unified system today that fuses sensor telemetry, visual inspection, and predictive modeling to give technicians early, explainable warning of an impending belt joint failure.

Shield addresses this by combining real-time sensor anomaly detection, computer-vision-based defect detection, and Remaining Useful Life (RUL) estimation into a single monitoring system, with GenAI-generated, human-readable alerts and reports.

**Note on scope relative to the full problem statement:** the broader PS envisions a full smart-mining solution — IoT sensor fleets, AI vision with thermal imaging, drone/camera inspection, a full digital twin simulation, and integration with existing SCADA/PLC systems. Shield implements the software/AI decision layer of that vision — sensor + vision anomaly detection, RUL estimation, and a lightweight digital twin visualization, fed by data assumed to already exist in Firestore. Drone inspection, thermal imaging hardware, and SCADA/PLC integration are treated as out of scope for this build (see below) but are natural extensions if this were taken to full deployment.

## Goals / Objectives
- Detect sensor and visual anomalies early enough to enable preventive (not reactive) maintenance.
- Fuse sensor, vision, and GenAI reasoning so the system catches things a single modality would miss — and can distinguish real belt defects from sensor faults (e.g. humidity, dust interference).
- Give technicians clear, explainable alerts (what's wrong, why, and how to prevent it) rather than raw model output.
- Keep the system lightweight and reliable enough to run in a low-connectivity mine environment.

## Scope

**In scope**
1. Home page — project overview and a guide to using the web app.
2. Dashboard — all required real-time monitoring elements.
3. Alert page — GenAI-generated alerts (via RAG) explaining what failure may occur, why, and how to prevent it. Includes a rolling log of the last 5 minutes of readings, exportable to Excel with normal readings in green and problem readings in red, timestamped. No components beyond what's needed for this purpose.
4. Trends & Maintenance page — historical trends and maintenance-related views.
5. Digital Twin page — visual representation driven by live readings and parameters.

**Out of scope**
- Authentication / login
- Role-based access control
- Any non-essential informational content
- Drone-based physical inspection systems
- Thermal imaging hardware / dedicated smart cameras (vision defect detection uses standard photos via YOLOv8, not thermal sensors)
- Direct integration with existing SCADA / PLC systems
- Physical IoT sensor deployment (assumes sensor data is already flowing into Firestore)

**Assumptions**
- Sensor hardware is already deployed and streaming data.
- Firestore is reachable from the ingestion layer, at least intermittently.

**Constraints**
- Must run effectively in a low-connectivity mine environment.
- Built as a personal/portfolio-scale project — no dedicated infra budget, so architecture choices favor lightweight, self-managed components.

## Target Users
Technicians in an iron ore mine responsible for monitoring conveyor belt health.

## Functional Requirements
1. Fetch real-time sensor readings and periodic photos from Firestore.
2. Run an Isolation Forest model on sensor readings to predict anomalies. MongoDB stores the last 20 minutes of readings; the model retrains on this window every 20 minutes, then the window is cleared to keep the DB lean.
3. Run a custom YOLOv8 model on conveyor belt photos to detect defects, producing: (1) the raw YOLOv8 detection output (what the defect is), and (2) a severity score (how much it's likely to affect the system).
4. Calculate Remaining Useful Life (RUL) using: Isolation Forest output, YOLOv8 output, and raw sensor readings. **(Open — see Risks below: the fusion formula for combining these three inputs into a single RUL estimate is still being defined.)**
5. Build a digital twin from live sensor readings and parameters.
6. Run a RAG pipeline (trained on project/machine/anomaly-type context) that feeds a GenAI layer to generate alerts and daily reports in plain language.

## Non-Functional Requirements
1. Secure connection to Firestore, with appropriate access controls on data in transit and at rest.
2. Minimal latency on data fetch; reusable components to keep the frontend lightweight.
3. Reliability — proper state management, input validation, and robust error handling throughout.
4. Resilience to intermittent connectivity — the system should degrade gracefully rather than fail outright if the mine network drops (e.g. buffering, retry logic, or a lightweight local fallback for critical checks).

## Design / UX Considerations
1. Industrial-use interface, not a consumer app — no unnecessary components, straightforward navigation, optimized for a technician's workflow.
2. React, 4-layer architecture, Redux for state management.
3. GSAP for smooth, purposeful animation (not decorative).

## Technical Considerations
1. Pinecone for the RAG vector store.
2. MERN stack.
3. JS-based Isolation Forest implementation.
4. YOLOv8 for computer vision/defect detection.
5. REST API backend with a clean, organized folder structure.
6. LangChain for the GenAI layer.
7. Firebase for real-time ingest; sync/pipeline into MongoDB as the system of record for the retraining window (needs a defined sync mechanism — see Open Questions).
8. Low-bandwidth network handling — evaluate MQTT for sensor transport given mine connectivity constraints.

## Risks / Open Questions
- **RUL fusion formula is undefined** — how Isolation Forest output, YOLOv8 severity score, and raw readings combine into one RUL estimate still needs to be designed and validated.
- **Firebase → MongoDB sync mechanism** not yet specified (batch sync? change stream? scheduled job?).
- **Network resilience approach** not yet decided — needs a concrete fallback strategy (edge buffering, local inference, MQTT QoS levels) for connectivity drops.
- Confirm mine type (iron ore vs. coal) is consistent across all project materials.

## Success Metrics (draft — refine once RUL logic is finalized)
- Anomaly detection lead time before failure (target TBD).
- False positive/negative rate on sensor + vision fusion.
- RUL estimate accuracy against actual failure events (once validation data exists).
- Alert generation latency from anomaly detection to technician notification.
