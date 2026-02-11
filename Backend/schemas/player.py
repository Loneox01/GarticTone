from pydantic import BaseModel
from typing import Optional

class Player(BaseModel):
    nickname: str
    assigned_prompt: Optional[str] = None
    ready: bool = False
    index: int = -1