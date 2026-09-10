from typing import Any

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    task: str | None = None
    classes: dict[str, Any] | None = None