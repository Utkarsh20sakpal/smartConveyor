import { Router } from 'express';
import { handleListAlerts, handleAcknowledgeAlert } from '../controllers/alertController.js';

const router = Router();

router.get('/',                    handleListAlerts);
router.post('/:id/acknowledge',    handleAcknowledgeAlert);

export default router;

