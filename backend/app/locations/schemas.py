from pydantic import BaseModel, Field


class TrackLocationIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    latitude: float | None = None
    longitude: float | None = None


class PopularLocationOut(BaseModel):
    label: str
    count: int
    latitude: float | None = None
    longitude: float | None = None
