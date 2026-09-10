import { Router } from 'express';
import multer from 'multer';

import {
    handleGetLatestDetection,
    handleGetDetectionHistory,
    handleAnalyzeDetection,
} from '../controllers/detectionController.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error('Only JPEG, PNG, and WebP images are allowed.')
            );
        }

        cb(null, true);
    },
});

router.get('/latest', handleGetLatestDetection);

router.get('/history', handleGetDetectionHistory);

router.post(
    '/analyze',
    upload.single('file'),
    handleAnalyzeDetection
);

export default router;