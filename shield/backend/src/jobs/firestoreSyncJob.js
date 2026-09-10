/**
 * firestoreSyncJob.js
 * Real-time push from Firestore → MongoDB using onSnapshot (NOT polling).
 *
 * ASSUMPTION (prompt §10, open question):
 *   Firestore→MongoDB sync is implemented as an onSnapshot push-based listener.
 *   This was chosen for minimal latency (NFR §8) and to avoid unnecessary Firestore reads.
 *   prd.md leaves the sync mechanism open — if a different approach is chosen later,
 *   remove this note and update AGENT_CONTEXT.md.
 *
 * What this job does:
 *   1. Listens to /devices/CB_001/live/latest via onSnapshot.
 *   2. On each change, appends the reading to MongoDB (SensorReading model).
 *   3. The 20-minute rolling window for Isolation Forest retraining is maintained
 *      by isolationForestRetrainJob.js, which reads from MongoDB, not Firestore.
 */

// TODO: import Firestore Admin SDK and SensorReading model when wiring backend
// import { db } from '../config/firebaseAdmin.js';
// import SensorReading from '../models/SensorReading.js';

export function startFirestoreSyncJob() {
  console.log('[firestoreSyncJob] STUB — wire Firestore Admin SDK and SensorReading model');
  // Real implementation:
  // const docRef = db.doc('devices/CB_001/live/latest');
  // docRef.onSnapshot(snapshot => {
  //   if (!snapshot.exists) return;
  //   const data = snapshot.data();
  //   SensorReading.create({ ...data, syncedAt: Date.now() });
  // });
}
