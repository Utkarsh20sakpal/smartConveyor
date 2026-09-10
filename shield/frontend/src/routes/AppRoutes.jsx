import { Routes, Route, Navigate } from 'react-router-dom'


import DashboardLayout from '../components/layout/DashboardLayout'

import Home from '../pages/Home'
import Dashboard from '../pages/Dashboard'
import DigitalTwin from '../pages/DigitalTwin'
import VisionMonitoring from '../pages/VisionMonitoring'
import SensorHealth from '../pages/SensorHealth'
import Alerts from '../pages/Alerts'
import Reports from '../pages/Reports'
import Settings from '../pages/Settings'

import { useAutomaticDetection } from '../hooks/useAutomaticDetection'
import { useLiveReadings } from '../firebase/useLiveReadings'
import { useLiveSnapshot } from '../firebase/useLiveSnapshot'


export default function AppRoutes() {

  /*
   * ============================================================
   * START LIVE SENSOR TELEMETRY
   * ============================================================
   *
   * This hook creates the Firestore onSnapshot listener for:
   *
   * devices/CB_001/live/latest
   *
   * It must be mounted somewhere that remains alive while the
   * user navigates between pages.
   *
   * AppRoutes is a good place because it stays mounted while
   * React Router changes the current page.
   *
   * The hook itself does not render anything.
   */
  useLiveReadings()
  useLiveSnapshot()
  useAutomaticDetection()


  return (
    <Routes>

      {/* ========================================================
          MAIN APPLICATION LAYOUT
          ======================================================== */}

      <Route element={<DashboardLayout />}>

        {/* ======================================================
            ROOT
            ====================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/home"
              replace
            />
          }
        />


        {/* ======================================================
            HOME
            ====================================================== */}

        <Route
          path="/home"
          element={<Home />}
        />


        {/* ======================================================
            DASHBOARD
            ====================================================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        {/* ======================================================
            DIGITAL TWIN
            ====================================================== */}

        <Route
          path="/digital-twin"
          element={<DigitalTwin />}
        />


        {/* ======================================================
            VISION MONITORING
            ====================================================== */}

        <Route
          path="/vision-monitoring"
          element={<VisionMonitoring />}
        />


        {/* ======================================================
            SENSOR HEALTH
            ====================================================== */}

        <Route
          path="/sensor-health"
          element={<SensorHealth />}
        />


        {/* ======================================================
            ALERTS
            ====================================================== */}

        <Route
          path="/alerts"
          element={<Alerts />}
        />


        {/* ======================================================
            REPORTS
            ====================================================== */}

        <Route
          path="/reports"
          element={<Reports />}
        />


        {/* ======================================================
            SETTINGS
            ====================================================== */}

        <Route
          path="/settings"
          element={<Settings />}
        />

      </Route>

    </Routes>
  )
}