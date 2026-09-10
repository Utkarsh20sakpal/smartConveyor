import { configureStore } from "@reduxjs/toolkit";
import sensorReducer    from "./slices/sensorSlice";
import alertReducer     from "./slices/alertSlice";
import detectionReducer from "./slices/detectionSlice";
import twinReducer      from "./slices/twinSlice";
import uiReducer        from "./slices/uiSlice";
import rulReducer       from "./slices/rulSlice";

const store = configureStore({
  reducer: {
    sensor:    sensorReducer,
    alert:     alertReducer,
    detection: detectionReducer,
    twin:      twinReducer,
    ui:        uiReducer,
    rul:       rulReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Firestore Timestamp objects are non-serializable — we normalize them before storing.
        // Timestamps in Redux are stored as Unix ms numbers (from parseTimestamp in utils.js).
        ignoredActions: [
          "sensor/setLiveReading",
          "detection/setLatestSnapshot",
          "rul/setRULState",
        ],
      },
    }),
});

export default store;
