import time
import logging

from .model import load_model

logger = logging.getLogger("shield-vision")


def predict_image(image):
    logger.info("[Inference] Starting prediction")

    logger.info("[Inference] Loading YOLO model")
    model = load_model()
    logger.info("[Inference] YOLO model loaded")

    start_time = time.perf_counter()

    logger.info("[Inference] Calling model.predict()")

    results = model.predict(
        source=image,
        conf=0.25,
        verbose=False,
    )

    logger.info("[Inference] model.predict() completed")

    inference_ms = round(
        (time.perf_counter() - start_time) * 1000,
        2,
    )

    logger.info(
        "[Inference] Prediction completed in %.2f ms",
        inference_ms,
    )

    result = results[0]

    detections = []

    for box in result.boxes:
        class_id = int(box.cls[0].item())
        confidence = float(box.conf[0].item())

        x1, y1, x2, y2 = box.xyxy[0].tolist()

        class_name = result.names[class_id]

        detections.append(
            {
                "class_id": class_id,
                "class_name": class_name,
                "confidence": round(confidence, 4),
                "bbox": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2),
                },
            }
        )

    height, width = result.orig_shape

    logger.info(
        "[Inference] Returning %d detections",
        len(detections),
    )

    return {
        "success": True,
        "model": {
            "name": "best.pt",
            "task": model.task,
        },
        "image": {
            "width": int(width),
            "height": int(height),
        },
        "inference_ms": inference_ms,
        "detections": detections,
        "count": len(detections),
    }