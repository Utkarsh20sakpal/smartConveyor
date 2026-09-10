/**
 * useLiveReadings.js
 *
 * Listens to:
 * /devices/CB_001/live/latest
 *
 * Responsibilities:
 * 1. Receive live telemetry from Firestore.
 * 2. Normalize the timestamp.
 * 3. Determine whether the telemetry is fresh or stale.
 * 4. Never replace a valid reading with fake zero values.
 * 5. Keep the last known reading when Firestore goes offline.
 *
 * Connection states:
 *
 * LOADING
 * ONLINE
 * STALE
 * ERROR
 * OFFLINE
 */

import { useEffect, useRef } from "react";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { useDispatch } from "react-redux";

import { db } from "./firebaseConfig";

import {
  setLiveReading,
  setConnectionStatus,
} from "../store/slices/sensorSlice";

import {
  setRULState,
  setRULLoading,
  setRULError,
} from "../store/slices/rulSlice";


// ================================================================
// CONFIGURATION
// ================================================================

/*
 * How old can a telemetry reading be before we consider it stale?
 *
 * 60 seconds is a reasonable value for the current demo.
 *
 * Example:
 *
 * Reading timestamp = 19:30:00
 * Current time       = 19:30:20
 *
 * Age = 20 seconds
 * => ONLINE
 *
 * Reading timestamp = 19:30:00
 * Current time       = 19:31:30
 *
 * Age = 90 seconds
 * => STALE
 */
const STALE_AFTER_MS = 60 * 1000;


/*
 * Backend API base URL.
 *
 * In Vite dev mode the frontend proxies /api/* to http://localhost:3001
 * (or the configured VITE_BACKEND_URL).  In production this should point
 * to the actual deployed backend.
 */
const rawBackendUrl =
  (typeof import.meta !== "undefined" && (import.meta.env?.VITE_BACKEND_URL || import.meta.env?.VITE_API_URL)) ||
  "http://localhost:3001";
const BACKEND_URL = String(rawBackendUrl).replace(/\/+$/, "");


// ================================================================
// TIMESTAMP NORMALIZER
// ================================================================

/**
 * Converts different timestamp formats into milliseconds.
 *
 * Supported formats:
 *
 * 1. Firestore Timestamp
 * 2. JavaScript Date
 * 3. Unix timestamp in seconds
 * 4. Unix timestamp in milliseconds
 * 5. ISO date string
 * 6. Firestore serialized timestamp:
 *    { seconds, nanoseconds }
 * 7. Firestore serialized timestamp:
 *    { _seconds, _nanoseconds }
 *
 * Returns:
 *
 * number -> milliseconds
 * null   -> invalid timestamp
 */
function normalizeTimestamp(timestamp) {

  // --------------------------------------------------------------
  // No timestamp
  // --------------------------------------------------------------

  if (
    timestamp === null ||
    timestamp === undefined
  ) {
    return null;
  }


  // --------------------------------------------------------------
  // Firestore Timestamp
  // --------------------------------------------------------------

  if (
    typeof timestamp?.toMillis === "function"
  ) {

    const milliseconds =
      timestamp.toMillis();

    return Number.isFinite(milliseconds)
      ? milliseconds
      : null;
  }


  // --------------------------------------------------------------
  // JavaScript Date
  // --------------------------------------------------------------

  if (
    timestamp instanceof Date
  ) {

    const milliseconds =
      timestamp.getTime();

    return Number.isFinite(milliseconds)
      ? milliseconds
      : null;
  }


  // --------------------------------------------------------------
  // Numeric timestamp
  // --------------------------------------------------------------

  if (
    typeof timestamp === "number" &&
    Number.isFinite(timestamp)
  ) {

    /*
     * Unix timestamps are commonly stored as:
     *
     * seconds:
     * 1725900000
     *
     * milliseconds:
     * 1725900000000
     *
     * Anything smaller than 1e11 is treated as seconds.
     */
    if (timestamp < 100000000000) {

      return timestamp * 1000;

    }

    return timestamp;
  }


  // --------------------------------------------------------------
  // String timestamp
  // --------------------------------------------------------------

  if (
    typeof timestamp === "string"
  ) {

    const parsed =
      Date.parse(timestamp);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }


  // --------------------------------------------------------------
  // Serialized Firestore Timestamp
  // --------------------------------------------------------------

  if (
    typeof timestamp === "object"
  ) {

    /*
     * Firebase/Admin SDK style:
     *
     * {
     *   seconds: 1234567890,
     *   nanoseconds: 123456789
     * }
     */

    if (
      typeof timestamp.seconds === "number"
    ) {

      return (
        timestamp.seconds * 1000
      ) + (
          (timestamp.nanoseconds || 0) / 1000000
        );
    }


    /*
     * Some serialized Firebase objects use:
     *
     * {
     *   _seconds: 1234567890,
     *   _nanoseconds: 123456789
     * }
     */

    if (
      typeof timestamp._seconds === "number"
    ) {

      return (
        timestamp._seconds * 1000
      ) + (
          (timestamp._nanoseconds || 0) / 1000000
        );
    }
  }


  // --------------------------------------------------------------
  // Invalid timestamp
  // --------------------------------------------------------------

  return null;
}


// ================================================================
// SENSOR VALUE VALIDATION
// ================================================================

/**
 * Checks whether the Firestore document contains
 * the telemetry fields required by the dashboard.
 *
 * IMPORTANT:
 *
 * We DO NOT reject zero values.
 *
 * For example:
 *
 * current_rms = 0
 *
 * can be a legitimate value if the motor is stopped.
 *
 * Therefore validation is based on the existence and
 * numeric type of the fields, not whether they are > 0.
 */
function isValidReading(data) {

  if (!data) {
    return false;
  }


  if (
    typeof data !== "object"
  ) {
    return false;
  }


  if (
    !data.features ||
    typeof data.features !== "object"
  ) {
    return false;
  }


  const {
    current_rms,
    temp_belt,
    temp_motor,
    vib_rms,
  } = data.features;


  /*
   * Every required feature must be a finite number.
   */
  const validFeatures =
    Number.isFinite(Number(current_rms)) &&
    Number.isFinite(Number(temp_belt)) &&
    Number.isFinite(Number(temp_motor)) &&
    Number.isFinite(Number(vib_rms));


  if (!validFeatures) {
    return false;
  }


  /*
   * edge_health is also expected to be numeric.
   */
  if (
    !Number.isFinite(
      Number(data.edge_health)
    )
  ) {

    return false;
  }


  return true;
}


// ================================================================
// HOOK
// ================================================================

export function useLiveReadings() {

  const dispatch = useDispatch();

  /**
   * Tracks whether a POST /api/sensors/rul/estimate request is
   * currently in-flight to avoid flooding the backend.
   */
  const rulCallInFlight = useRef(false);

  useEffect(() => {

    // ============================================================
    // FIRESTORE DOCUMENT
    // ============================================================

    /*
     * Exact Firestore path:
     *
     * devices
     *   └── CB_001
     *       └── live
     *           └── latest
     */
    const docRef = doc(
      db,
      "devices",
      "CB_001",
      "live",
      "latest"
    );


    // ============================================================
    // INITIAL STATUS
    // ============================================================

    dispatch(
      setConnectionStatus("LOADING")
    );


    // ============================================================
    // SNAPSHOT LISTENER
    // ============================================================

    const unsubscribe = onSnapshot(

      docRef,

      /*
       * ----------------------------------------------------------
       * SUCCESS CALLBACK
       * ----------------------------------------------------------
       */

      (snapshot) => {

        /*
         * Document doesn't exist.
         */
        if (!snapshot.exists()) {

          console.warn(
            "[useLiveReadings] Firestore document does not exist:"
          );

          console.warn(
            "devices/CB_001/live/latest"
          );


          /*
           * IMPORTANT:
           *
           * We don't create a fake zero reading.
           *
           * The Redux state remains whatever valid reading
           * it had previously.
           */
          dispatch(
            setConnectionStatus("OFFLINE")
          );

          return;
        }


        // --------------------------------------------------------
        // READ FIRESTORE DATA
        // --------------------------------------------------------

        const data =
          snapshot.data();


        console.log(
          "[useLiveReadings] Firestore reading:",
          data
        );


        // --------------------------------------------------------
        // VALIDATE SENSOR DATA
        // --------------------------------------------------------

        if (!isValidReading(data)) {

          console.warn(
            "[useLiveReadings] Invalid telemetry received:",
            data
          );


          /*
           * Do NOT overwrite the previous valid reading.
           */
          dispatch(
            setConnectionStatus("STALE")
          );

          return;
        }


        // --------------------------------------------------------
        // NORMALIZE TIMESTAMP
        // --------------------------------------------------------

        const timestamp =
          normalizeTimestamp(
            data.timestamp
          );


        /*
         * A live telemetry reading MUST have
         * a valid timestamp.
         */
        if (timestamp === null) {

          console.warn(
            "[useLiveReadings] Telemetry has no valid timestamp:",
            data
          );


          /*
           * Do not accept it as a new live reading.
           */
          dispatch(
            setConnectionStatus("STALE")
          );

          return;
        }


        // --------------------------------------------------------
        // CALCULATE AGE
        // --------------------------------------------------------

        const now =
          Date.now();


        const age =
          now - timestamp;


        console.log(
          "[useLiveReadings] Telemetry age:",
          age,
          "ms"
        );


        // --------------------------------------------------------
        // FUTURE TIMESTAMP CHECK
        // --------------------------------------------------------

        /*
         * Small clock differences are acceptable.
         *
         * But if the timestamp is significantly in the future,
         * something is wrong with the producer clock.
         */
        const FUTURE_TOLERANCE_MS =
          10 * 1000;


        if (
          timestamp >
          now + FUTURE_TOLERANCE_MS
        ) {

          console.warn(
            "[useLiveReadings] Telemetry timestamp is in the future:",
            new Date(timestamp)
          );


          /*
           * Don't accept suspicious telemetry.
           */
          dispatch(
            setConnectionStatus("STALE")
          );

          return;
        }


        // --------------------------------------------------------
        // STALE CHECK
        // --------------------------------------------------------

        if (
          age > STALE_AFTER_MS
        ) {

          console.warn(
            "[useLiveReadings] Telemetry is stale. Age:",
            age,
            "ms"
          );


          /*
           * VERY IMPORTANT:
           *
           * Do not call setLiveReading().
           *
           * This preserves the last known valid reading.
           */
          dispatch(
            setConnectionStatus("STALE")
          );

          return;
        }


        // --------------------------------------------------------
        // ACCEPT FRESH READING
        // --------------------------------------------------------

        const reading = {

          device_id:
            data.device_id ??
            "CB_001",

          edge_health:
            Number(data.edge_health),

          features: {

            current_rms:
              Number(
                data.features.current_rms
              ),

            temp_belt:
              Number(
                data.features.temp_belt
              ),

            temp_motor:
              Number(
                data.features.temp_motor
              ),

            vib_rms:
              Number(
                data.features.vib_rms
              ),

          },

          /*
           * Store normalized milliseconds.
           */
          timestamp,

        };


        // --------------------------------------------------------
        // SAVE VALID READING
        // --------------------------------------------------------

        dispatch(
          setLiveReading(reading)
        );


        // --------------------------------------------------------
        // CONNECTION STATUS
        // --------------------------------------------------------

        /*
         * Firestore has delivered a valid,
         * timestamped and fresh reading.
         *
         * Therefore the telemetry stream is actually LIVE.
         */
        dispatch(
          setConnectionStatus("ONLINE")
        );


        // --------------------------------------------------------
        // DEBUG
        // --------------------------------------------------------

        console.log(
          "[useLiveReadings] LIVE telemetry accepted:",
          reading
        );


        // --------------------------------------------------------
        // FORWARD READING TO BACKEND RUL ENGINE
        // --------------------------------------------------------

        /*
         * Each fresh Firestore reading is sent to the backend
         * authoritative RUL engine.
         *
         * We skip if a request is already in-flight.
         */
        if (!rulCallInFlight.current) {
          rulCallInFlight.current = true;
          dispatch(setRULLoading());

          fetch(`${BACKEND_URL}/api/sensors/rul/estimate`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(reading),
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
              }
              return res.json();
            })
            .then((data) => {
              if (data?.ok && data?.state) {
                dispatch(
                  setRULState({
                    state:   data.state,
                    history: data.history ?? [],
                  })
                );
              }
            })
            .catch((err) => {
              console.warn(
                "[useLiveReadings] RUL estimate request failed:",
                err.message
              );
              dispatch(setRULError(err.message));
            })
            .finally(() => {
              rulCallInFlight.current = false;
            });
        }

      },


      /*
       * ----------------------------------------------------------
       * ERROR CALLBACK
       * ----------------------------------------------------------
       */

      (error) => {

        console.error(
          "[useLiveReadings] Firestore error:",
          error
        );


        /*
         * IMPORTANT:
         *
         * We do NOT clear liveReading here.
         *
         * If Firestore goes offline, the dashboard should
         * continue showing the last known sensor values.
         */
        dispatch(
          setConnectionStatus("ERROR")
        );

      }

    );


    // ============================================================
    // CLEANUP
    // ============================================================

    return () => {

      console.log(
        "[useLiveReadings] Unsubscribing from Firestore"
      );

      unsubscribe();

    };

  }, [dispatch]);

}


// ================================================================
// OPTIONAL EXPORT
// ================================================================

/*
 * Exported only for testing / debugging if needed.
 *
 * The hook itself remains the normal application API.
 */
export {
  normalizeTimestamp,
  isValidReading,
  STALE_AFTER_MS,
};