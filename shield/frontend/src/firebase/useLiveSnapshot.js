/**
 * useLiveSnapshot.js
 *
 * Listens to:
 * /devices/CB_001/snapshots/latest
 *
 * Expected Firestore document:
 * {
 *   device_id: "CB_001",
 *   image_base64: "...",
 *   resolution: "QVGA",
 *   timestamp: ...
 * }
 */

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useDispatch } from "react-redux";

import { db } from "./firebaseConfig";
import { setLatestSnapshot } from "../store/slices/detectionSlice";
import { parseTimestamp } from "../lib/utils";

export function useLiveSnapshot() {
  const dispatch = useDispatch();

  useEffect(() => {
    const docRef = doc(
      db,
      "devices",
      "CB_001",
      "snapshots",
      "latest"
    );

    console.log(
      "[useLiveSnapshot] Listening to:",
      "devices/CB_001/snapshots/latest"
    );

    const unsubscribe = onSnapshot(
      docRef,

      // ==========================================================
      // FIRESTORE SNAPSHOT RECEIVED
      // ==========================================================

      (snapshot) => {
        console.log(
          "[useLiveSnapshot] Firestore update received:",
          {
            exists: snapshot.exists(),
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites:
              snapshot.metadata.hasPendingWrites,
          }
        );

        if (!snapshot.exists()) {
          console.warn(
            "[useLiveSnapshot] Document does not exist."
          );

          return;
        }

        const data = snapshot.data();

        console.log(
          "[useLiveSnapshot] Snapshot data:",
          {
            device_id: data.device_id,
            resolution: data.resolution,
            imageLength:
              data.image_base64?.length ?? 0,
            timestamp: data.timestamp,
          }
        );

        let parsedTimestamp = parseTimestamp(data.timestamp);

        // ESP32 sends ISO timestamps such as:
        // "2026-09-10T17:44:12Z"
        //
        // If parseTimestamp() does not recognize the string,
        // fall back to the native JavaScript Date parser.

        if (
          !parsedTimestamp &&
          typeof data.timestamp === "string"
        ) {
          const nativeDate = new Date(data.timestamp);

          if (!Number.isNaN(nativeDate.getTime())) {
            parsedTimestamp = nativeDate;
          }
        }

        const timestampMs =
          parsedTimestamp?.getTime() ?? null;

        console.log(
          "[useLiveSnapshot] Parsed timestamp:",
          parsedTimestamp,
          timestampMs
        );
        // ========================================================
        // SEND SNAPSHOT TO REDUX
        // ========================================================

        dispatch(
          setLatestSnapshot({
            device_id:
              data.device_id ?? "CB_001",

            image_base64:
              data.image_base64 ?? "",

            resolution:
              data.resolution ?? "QVGA",

            timestamp:
              parsedTimestamp?.getTime() ?? null,
          })
        );

        console.log(
          "[useLiveSnapshot] Redux snapshot dispatched:",
          {
            hasImage:
              Boolean(data.image_base64),

            imageLength:
              data.image_base64?.length ?? 0,

            timestamp:
              parsedTimestamp?.getTime() ?? null,
          }
        );
      },

      // ==========================================================
      // FIRESTORE ERROR
      // ==========================================================

      (error) => {
        console.error(
          "[useLiveSnapshot] Firestore error:",
          error
        );
      }
    );

    // ============================================================
    // CLEANUP
    // ============================================================

    return () => {
      console.log(
        "[useLiveSnapshot] Listener unsubscribed."
      );

      unsubscribe();
    };
  }, [dispatch]);
}