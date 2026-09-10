import { Router } from 'express';
const router = Router();
// TODO: implement twinRoutes endpoints
router.get('/', (_req, res) => res.json({ message: 'twinRoutes stub' }));
export default router;
