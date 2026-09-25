from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    role_name: str = "VISITOR"

class UserOut(UserBase):
    id: int
    role: RoleOut
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_name: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role_name: str
