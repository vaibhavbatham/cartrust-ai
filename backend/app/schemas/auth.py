import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator

class UserRegister(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    mobile_number: Optional[str] = Field(None, max_length=30)
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    terms_accepted: bool = Field(...)

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v

    @field_validator('terms_accepted')
    @classmethod
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('Terms and conditions must be accepted')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    google_id: Optional[str] = None
    avatar_url: Optional[str] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    expires_in: int
    user_id: str
    email: str
    roles: List[str]
    email_verified: bool
    phone_verified: bool
    onboarding_completed: bool

class TokenRefresh(BaseModel):
    refresh_token: str

class VerifyEmail(BaseModel):
    token: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v

class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

class PhoneOTPRequest(BaseModel):
    mobile_number: str

class PhoneOTPVerify(BaseModel):
    mobile_number: str
    otp_code: str
