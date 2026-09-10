from pathlib import Path
from ultralytics import YOLO


MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "best.pt"

model = None


def load_model():
    global model

    if model is not None:
        return model

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"YOLO model not found: {MODEL_PATH}"
        )

    model = YOLO(str(MODEL_PATH))

    return model