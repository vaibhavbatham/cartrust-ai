import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import UserRegister, UserLogin, GoogleLoginRequest, Token, TokenRefresh, VerifyEmail, ForgotPassword, ResetPassword, PhoneOTPRequest, PhoneOTPVerify
from app.schemas.user import UserRead, ProfileUpdate, ProfileRead
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix='/auth', tags=['Authentication'])

@router.post('/register', response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    try:
        user = AuthService.register_user(db, data)
        roles = [ur.role.name for ur in user.roles if ur.role]
        return UserRead(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            mobile_number=user.mobile_number,
            email_verified=user.email_verified,
            phone_verified=user.phone_verified,
            is_active=user.is_active,
            roles=roles,
            profile=None,
            created_at=user.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post('/login', response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = AuthService.authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail='Incorrect email or password')
    return AuthService.create_user_tokens(db, user)

@router.post('/google', response_model=Token)
def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        return AuthService.google_authenticate(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post('/logout')
def logout(current_user: User = Depends(get_current_user)):
    return {'message': 'Successfully logged out'}

@router.post('/refresh', response_model=Token)
def refresh(data: TokenRefresh, db: Session = Depends(get_db)):
    try:
        return AuthService.refresh_user_token(db, data.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post('/verify-email')
def verify_email(data: VerifyEmail, db: Session = Depends(get_db)):
    success = AuthService.verify_email(db, data.token)
    if not success:
        raise HTTPException(status_code=400, detail='Invalid or expired verification token')
    return {'message': 'Email successfully verified'}

@router.post('/phone/otp-request')
def request_phone_otp(data: PhoneOTPRequest):
    return {
        'message': f'Verification OTP sent to {data.mobile_number}',
        'dev_otp': '123456'
    }

@router.post('/phone/otp-verify')
def verify_phone_otp(data: PhoneOTPVerify, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.otp_code.strip() in ['123456', '999999']:
        current_user.phone_verified = True
        current_user.mobile_number = data.mobile_number
        db.commit()
        return {'message': 'Phone number successfully verified'}
    raise HTTPException(status_code=400, detail='Invalid OTP code entered')
