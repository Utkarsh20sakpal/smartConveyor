from pathlib import Path

import onnxruntime as ort

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "best.onnx"

session = None


def load_model():
    global session

    if session is not None:
        return session

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"ONNX model not found: {MODEL_PATH}"
        )

    session = ort.InferenceSession(
        str(MODEL_PATH),
        providers=["CPUExecutionProvider"],
    )

    return session