/**
 * detectionController.js
 *
 * GET  /api/detections/latest
 * GET  /api/detections/history
 * POST /api/detections/analyze
 *
 * Express acts as the application API layer.
 * Actual YOLO inference is performed by the Python FastAPI
 * vision service.
 */
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';

const VISION_SERVICE_URL =
  process.env.VISION_SERVICE_URL || 'http://127.0.0.1:8000';

console.log(
  "[DetectionController] VISION_SERVICE_URL:",
  VISION_SERVICE_URL
);

// Temporary in-memory history.
// MongoDB persistence can be added after the end-to-end pipeline works.
const detectionHistory = [];

/**
 * POST /api/detections/analyze
 *
 * Expected request:
 * multipart/form-data
 * field name: file
 */
export async function handleAnalyzeDetection(req, res, next) {
  try {
    if (!req.body?.imageBase64 && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required.',
      });
    }

    const form = new FormData();

    if (req.file) {
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype || 'image/jpeg',
      });
    } else {
      // Base64 fallback for later frontend integration.
      const match = req.body.imageBase64.match(
        /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/
      );

      if (!match) {
        return res.status(400).json({
          success: false,
          message:
            'imageBase64 must be a valid JPEG, PNG, or WebP data URL.',
        });
      }

      const buffer = Buffer.from(match[2], 'base64');

      form.append('file', buffer, {
        filename: 'upload.jpg',
        contentType: match[1],
      });
    }

    const response = await axios.post(
      `${VISION_SERVICE_URL}/predict/image`,
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: 10 * 1024 * 1024,
        maxContentLength: 10 * 1024 * 1024,
        timeout: 30000,
      }
    );

    const result = response.data;

    const detectionRecord = {
      id: `DET-${Date.now()}`,
      timestamp: Date.now(),
      detections: result.detections || [],
      count: result.count || 0,
      image: result.image || null,
      inference_ms: result.inference_ms ?? null,
      model: result.model || null,
    };

    detectionHistory.unshift(detectionRecord);

    // Keep only the latest 100 records.
    if (detectionHistory.length > 100) {
      detectionHistory.pop();
    }

    return res.json({
      success: true,
      ...detectionRecord,
    });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 502).json({
        success: false,
        message: 'Vision service returned an error.',
        detail: err.response.data,
      });
    }

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Vision service is unavailable.',
      });
    }

    next(err);
  }
}

/**
 * GET /api/detections/latest
 */
export function handleGetLatestDetection(_req, res, next) {
  try {
    res.json(detectionHistory[0] ?? null);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/detections/history
 */
export function handleGetDetectionHistory(_req, res, next) {
  try {
    res.json({
      detections: detectionHistory,
      count: detectionHistory.length,
    });
  } catch (err) {
    next(err);
  }
}