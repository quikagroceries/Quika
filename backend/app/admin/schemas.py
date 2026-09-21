from pydantic import BaseModel, Field


class AdminLoginIn(BaseModel):
    email: str = Field(..., examples=["admin@qyka.com"])
    password: str = Field(..., min_length=1, examples=["hunter2"])
