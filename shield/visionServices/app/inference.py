import time
import logging

import numpy as np
from PIL import Image

from .model import load_model

logger = logging.getLogger("shield-vision")

CONF_THRESHOLD = 0.25
IOU_THRESHOLD = 0.45

CLASS_NAMES = {
    0: "Lubang Besar",
    1: "Lubang Kecil",
    2: "Sambungan Belt",
    3: "Sobekan Besar",
    4: "Sobekan Kecil",
}

def calculate_iou(box, boxes):
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])

    intersection = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)

    box_area = max(0, box[2] - box[0]) * max(0, box[3] - box[1])
    boxes_area = np.maximum(0, boxes[:, 2] - boxes[:, 0]) * np.maximum(
        0, boxes[:, 3] - boxes[:, 1]
    )

    union = box_area + boxes_area - intersection

    return intersection / np.maximum(union, 1e-6)


def non_max_suppression(boxes, scores, class_ids):
    if len(boxes) == 0:
        return []

    boxes = np.asarray(boxes, dtype=np.float32)
    scores = np.asarray(scores, dtype=np.float32)
    class_ids = np.asarray(class_ids, dtype=np.int32)

    keep = []

    for class_id in np.unique(class_ids):
        class_indices = np.where(class_ids == class_id)[0]
        order = class_indices[np.argsort(scores[class_indices])[::-1]]

        while len(order) > 0:
            current = order[0]
            keep.append(current)

            if len(order) == 1:
                break

            remaining = order[1:]

            ious = calculate_iou(
                boxes[current],
                boxes[remaining],
            )

            order = remaining[ious <= IOU_THRESHOLD]

    return keep


def predict_image(image: Image.Image):
    logger.info("[Inference] Starting ONNX prediction")

    session = load_model()

    start_time = time.perf_counter()

    resized = image.resize((320, 320))

    input_array = np.asarray(
        resized,
        dtype=np.float32,
    )

    input_array = input_array.transpose(2, 0, 1)
    input_array = np.expand_dims(input_array, axis=0)
    input_array /= 255.0

    input_name = session.get_inputs()[0].name

    outputs = session.run(
        None,
        {input_name: input_array},
    )

    inference_ms = round(
        (time.perf_counter() - start_time) * 1000,
        2,
    )

    predictions = outputs[0][0].transpose(1, 0)

    original_width, original_height = image.size

    scale_x = original_width / 320
    scale_y = original_height / 320

    boxes = []
    scores = []
    class_ids = []

    for prediction in predictions:
        x_center, y_center, width, height = prediction[:4]

        class_scores = prediction[4:]
        class_id = int(np.argmax(class_scores))
        confidence = float(class_scores[class_id])

        if confidence < CONF_THRESHOLD:
            continue

        x1 = (x_center - width / 2) * scale_x
        y1 = (y_center - height / 2) * scale_y
        x2 = (x_center + width / 2) * scale_x
        y2 = (y_center + height / 2) * scale_y

        boxes.append([x1, y1, x2, y2])
        scores.append(confidence)
        class_ids.append(class_id)

    keep_indices = non_max_suppression(
        boxes,
        scores,
        class_ids,
    )

    detections = []

    for index in keep_indices:
        class_id = class_ids[index]

        detections.append({
            "class_id": class_id,
            "class_name": CLASS_NAMES.get(
                class_id,
                str(class_id),
            ),
            "confidence": round(
                float(scores[index]),
                4,
            ),
            "bbox": {
                "x1": round(float(boxes[index][0]), 2),
                "y1": round(float(boxes[index][1]), 2),
                "x2": round(float(boxes[index][2]), 2),
                "y2": round(float(boxes[index][3]), 2),
            },
        })

    logger.info(
        "[Inference] Returning %d detections",
        len(detections),
    )

    return {
        "success": True,
        "model": {
            "name": "best.onnx",
            "task": "detect",
        },
        "image": {
            "width": int(original_width),
            "height": int(original_height),
        },
        "inference_ms": inference_ms,
        "detections": detections,
        "count": len(detections),
    }