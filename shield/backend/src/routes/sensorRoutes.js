import { Router } from 'express';
import {
  handleGetLatest,
  handleGetHistory,
  handleRULState,
  handleRULEstimate,
} from '../controllers/sensorController.js';

const router = Router();

router.get('/latest',       handleGetLatest);
router.get('/history',      handleGetHistory);

// ── Authoritative RUL endpoints ──────────────────────────────
// GET  /api/sensors/rul          — latest RUL state + history
// POST /api/sensors/rul/estimate — push fresh telemetry, get result
router.get('/rul',          handleRULState);
router.post('/rul/estimate', handleRULEstimate);

export default router;
