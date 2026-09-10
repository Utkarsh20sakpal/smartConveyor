from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .model import load_model
from .inference import predict_image


app = FastAPI(
    title="Shield Vision Service",
    version="1.0.0",
)


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


@app.get("/health")
def health():
    try:
        loaded_model = load_model()

        return {
            "status": "ok",
            "model_loaded": True,
            "task": loaded_model.task,
            "classes": loaded_model.names,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Model unavailable: {str(exc)}",
        )


@app.post("/predict/image")
async def predict(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image type. Use JPEG, PNG, or WebP.",
        )

    try:
        contents = await file.read()

        image = Image.open(BytesIO(contents)).convert("RGB")

    except UnidentifiedImageError:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file.",
        )

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to read image.",
        )

    try:
        return predict_image(image)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(exc)}",
        )