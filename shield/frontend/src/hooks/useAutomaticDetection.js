import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
    setLatestDetection,
    setLoading,
    setError,
} from "../store/slices/detectionSlice";

import { addAlert } from "../store/slices/alertSlice";

import {
    analyzeDetectionImage,
    base64ToImageFile,
} from "../services/detectionService";


// ================================================================
// YOLO CLASS → UI LABEL
// ================================================================

const VISION_LABELS = {
    "Lubang Besar": "Large Hole",
    "Lubang Kecil": "Small Hole",
    "Sambungan Belt": "Belt Joint",
    "Sobekan Besar": "Large Tear",
    "Sobekan Kecil": "Small Tear",
};


// ================================================================
// YOLO CLASS → ALERT SEVERITY
// ================================================================

const VISION_SEVERITY = {
    "Lubang Besar": "CRITICAL",
    "Sobekan Besar": "CRITICAL",

    "Lubang Kecil": "WARNING",
    "Sobekan Kecil": "WARNING",
    "Sambungan Belt": "WARNING",
};


// ================================================================
// ALERT DEDUPLICATION
// ================================================================
//
// ESP32-CAM sends a snapshot approximately every 10 seconds.
//
// Without deduplication:
//
// 10:00:00 → Small Hole → Alert
// 10:00:10 → Small Hole → Alert
// 10:00:20 → Small Hole → Alert
// 10:00:30 → Small Hole → Alert
//
// This would create unnecessary duplicate alerts.
//
// We therefore suppress the same continuing defect for 60 seconds.
//

const ALERT_DEDUPE_MS = 60 * 1000;


// ================================================================
// CREATE DETECTION FINGERPRINT
// ================================================================
//
// The bounding box can move slightly between frames.
//
// We quantize the center position so small movements do not create
// a completely new alert.
//

function getDetectionFingerprint(detection) {
    const bbox = detection?.bbox;

    if (!bbox) {
        return detection?.class_name || "UNKNOWN";
    }

    const centerX =
        ((Number(bbox.x1) + Number(bbox.x2)) / 2) || 0;

    const centerY =
        ((Number(bbox.y1) + Number(bbox.y2)) / 2) || 0;

    const gridX = Math.round(centerX / 100);
    const gridY = Math.round(centerY / 100);

    return `${detection.class_name || "UNKNOWN"}:${gridX}:${gridY}`;
}


// ================================================================
// CREATE ALERT OBJECT
// ================================================================

function createVisionAlert(detection, snapshotTimestamp) {
    const className = detection?.class_name;

    if (!className || !VISION_SEVERITY[className]) {
        return null;
    }

    const label =
        VISION_LABELS[className] || className;

    const confidence =
        Number(detection?.confidence);

    return {
        id:
            `VISION-${snapshotTimestamp}-` +
            `${detection.class_id ?? "X"}-` +
            `${Math.round(
                (detection.confidence ?? 0) * 10000
            )}`,

        timestamp:
            snapshotTimestamp || Date.now(),

        type:
            `${label} Detected`,

        source:
            "VISION_AI",

        severity:
            VISION_SEVERITY[className],

        status:
            "ACTIVE",

        description:
            `YOLOv8 detected ${label.toLowerCase()} on conveyor belt CB-001.` +
            (
                Number.isFinite(confidence)
                    ? ` Confidence: ${(confidence * 100).toFixed(0)}%.`
                    : ""
            ),

        // Keep original YOLO class name.
        detectionClass:
            className,

        confidence:
            Number.isFinite(confidence)
                ? Number((confidence * 100).toFixed(2))
                : null,

        classId:
            detection.class_id ?? null,

        // Preserve YOLO image coordinates.
        // These are image coordinates, NOT physical conveyor coordinates.
        bbox:
            detection.bbox ?? null,

        deviceId:
            "CB-001",
    };
}


// ================================================================
// AUTOMATIC DETECTION HOOK
// ================================================================

export function useAutomaticDetection() {
    const dispatch = useDispatch();

    // --------------------------------------------------------------
    // Latest ESP32-CAM snapshot from Redux
    // --------------------------------------------------------------

    const latestSnapshot = useSelector(
        (state) =>
            state.detection.latestSnapshot
    );


    // --------------------------------------------------------------
    // Prevent processing the same snapshot twice
    // --------------------------------------------------------------

    const lastProcessedTimestampRef =
        useRef(null);


    // --------------------------------------------------------------
    // Prevent overlapping YOLO requests
    // --------------------------------------------------------------

    const processingRef =
        useRef(false);


    // --------------------------------------------------------------
    // Remember recently generated vision alerts
    //
    // Map:
    //
    // fingerprint → timestamp when alert was created
    // --------------------------------------------------------------

    const recentVisionAlertsRef =
        useRef(new Map());


    // ==============================================================
    // PROCESS NEW SNAPSHOT
    // ==============================================================

    useEffect(() => {
        const imageBase64 =
            latestSnapshot?.image_base64;

        const timestamp =
            latestSnapshot?.timestamp;


        // ------------------------------------------------------------
        // No usable snapshot
        // ------------------------------------------------------------

        if (
            !imageBase64 ||
            !timestamp
        ) {
            return;
        }


        // ------------------------------------------------------------
        // Snapshot already processed
        // ------------------------------------------------------------

        if (
            lastProcessedTimestampRef.current === timestamp
        ) {
            return;
        }


        // ------------------------------------------------------------
        // Another inference is already running
        // ------------------------------------------------------------

        if (processingRef.current) {
            return;
        }


        // ============================================================
        // RUN YOLO INFERENCE
        // ============================================================

        const processSnapshot = async () => {
            processingRef.current = true;

            try {

                // --------------------------------------------------------
                // Detection loading state
                // --------------------------------------------------------

                dispatch(setLoading(true));


                // --------------------------------------------------------
                // Convert Firestore Base64 → File
                // --------------------------------------------------------

                const file =
                    base64ToImageFile(
                        imageBase64,
                        `snapshot-${timestamp}.jpg`
                    );


                // --------------------------------------------------------
                // Send image:
                //
                // React
                //   ↓
                // Node /api/detections/analyze
                //   ↓
                // FastAPI /predict/image
                //   ↓
                // YOLOv8
                // --------------------------------------------------------

                const result =
                    await analyzeDetectionImage(file);


                // --------------------------------------------------------
                // Store latest YOLO result
                // --------------------------------------------------------

                dispatch(
                    setLatestDetection(result)
                );


                // ========================================================
                // YOLO → ALERTS
                // ========================================================

                const detections =
                    Array.isArray(result?.detections)
                        ? result.detections
                        : [];


                const now =
                    Date.now();


                // --------------------------------------------------------
                // Remove expired deduplication entries
                // --------------------------------------------------------

                for (
                    const [
                        fingerprint,
                        lastCreatedAt
                    ]
                    of recentVisionAlertsRef.current
                ) {

                    if (
                        now - lastCreatedAt >
                        ALERT_DEDUPE_MS
                    ) {
                        recentVisionAlertsRef.current.delete(
                            fingerprint
                        );
                    }
                }


                // --------------------------------------------------------
                // Create alerts for new detections
                // --------------------------------------------------------

                for (
                    const detection
                    of detections
                ) {

                    const fingerprint =
                        getDetectionFingerprint(
                            detection
                        );


                    const lastCreatedAt =
                        recentVisionAlertsRef.current.get(
                            fingerprint
                        ) || 0;


                    // ------------------------------------------------------
                    // Same continuing defect:
                    // don't create another alert.
                    // ------------------------------------------------------

                    if (
                        now - lastCreatedAt <
                        ALERT_DEDUPE_MS
                    ) {
                        continue;
                    }


                    // ------------------------------------------------------
                    // Convert YOLO detection → application alert
                    // ------------------------------------------------------

                    const alert =
                        createVisionAlert(
                            detection,
                            timestamp
                        );


                    if (!alert) {
                        continue;
                    }


                    // ------------------------------------------------------
                    // Add alert to Redux
                    // ------------------------------------------------------

                    dispatch(
                        addAlert(alert)
                    );


                    // ------------------------------------------------------
                    // Remember this alert for deduplication
                    // ------------------------------------------------------

                    recentVisionAlertsRef.current.set(
                        fingerprint,
                        now
                    );


                    console.log(
                        "[AutomaticDetection] Vision alert created:",
                        alert
                    );
                }


                // --------------------------------------------------------
                // Mark this snapshot as successfully processed
                // --------------------------------------------------------

                lastProcessedTimestampRef.current =
                    timestamp;


                // --------------------------------------------------------
                // Debug information
                // --------------------------------------------------------

                console.log(
                    "[AutomaticDetection] YOLO result:",
                    {
                        timestamp,
                        count:
                            result?.count ?? 0,
                        detections,
                        inference_ms:
                            result?.inference_ms ?? null,
                    }
                );

            } catch (error) {

                // --------------------------------------------------------
                // YOLO / backend / FastAPI failure
                // --------------------------------------------------------

                console.error(
                    "[AutomaticDetection] Inference failed:",
                    error
                );


                dispatch(
                    setError(
                        error?.message ||
                        "Automatic image detection failed."
                    )
                );

            } finally {

                // --------------------------------------------------------
                // Always release processing lock
                // --------------------------------------------------------

                processingRef.current =
                    false;


                dispatch(
                    setLoading(false)
                );
            }
        };


        processSnapshot();

    }, [
        latestSnapshot,
        dispatch,
    ]);
}