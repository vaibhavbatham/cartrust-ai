import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

class RoleRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = 'India'
    preferred_language: Optional[str] = 'English'
    purpose: Optional[str] = None
    profile_image_url: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class ProfileRead(ProfileBase):
    id: str
    user_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True

class UserRead(BaseModel):
    id: str
    email: EmailStr
    first_name: str
    last_name: str
    mobile_number: Optional[str] = None
    email_verified: bool
    phone_verified: bool
    is_active: bool
    roles: List[str] = []
    profile: Optional[ProfileRead] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True
