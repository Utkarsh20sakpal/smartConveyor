/**
 * reportRoutes.js
 *
 * POST /api/reports/generate  → streams PDF / CSV / JSON file download
 * GET  /api/reports/list      → returns the report registry JSON
 */

import { Router } from 'express';
import { handleGenerateReport, handleListReports } from '../controllers/reportController.js';

const router = Router();

router.get('/',                    handleListReports);
router.get('/list',                handleListReports);
router.get('/download/:filename',  handleGenerateReport);
router.get('/download',            handleGenerateReport);
router.get('/generate',            handleGenerateReport);
router.post('/generate',           handleGenerateReport);

export default router;
