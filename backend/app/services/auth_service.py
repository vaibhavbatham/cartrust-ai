import uuid
import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.models.user import User, Role, UserRole, Profile, RefreshToken, AuditLog
from app.schemas.auth import UserRegister
from app.schemas.user import ProfileUpdate

class AuthService:
    @staticmethod
    def register_user(db: Session, data: UserRegister) -> User:
        existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
        if existing:
            raise ValueError('A user with this email already exists')

        verification_token = str(uuid.uuid4())
        user = User(
            email=data.email.lower().strip(),
            hashed_password=hash_password(data.password),
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
            mobile_number=data.mobile_number,
            email_verified=False,
            phone_verified=False,
            verification_token=verification_token,
            is_active=True
        )
        db.add(user)
        db.flush()

        # Default role: CUSTOMER
        customer_role = db.query(Role).filter(Role.name == 'CUSTOMER').first()
        if not customer_role:
            customer_role = Role(name='CUSTOMER', description='Standard customer/buyer role')
            db.add(customer_role)
            db.flush()

        user_role = UserRole(user_id=user.id, role_id=customer_role.id)
        db.add(user_role)

        # Create initial profile
        profile = Profile(
            user_id=user.id,
            full_name=f'{user.first_name} {user.last_name}',
            country='India',
            preferred_language='English'
        )
        db.add(profile)

        # Audit log
        audit = AuditLog(
            actor_id=user.id,
            actor_email=user.email,
            action='USER_REGISTER',
            resource_type='USER',
            resource_id=user.id,
            metadata_json=f'{{"email": "{user.email}", "verification_token": "{verification_token}"}}'
        )
        db.add(audit)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def verify_email(db: Session, token: str) -> bool:
        user = db.query(User).filter(User.verification_token == token).first()
        if not user:
            return False
        user.email_verified = True
        user.verification_token = None
        db.add(AuditLog(
            actor_id=user.id,
            actor_email=user.email,
            action='EMAIL_VERIFIED',
            resource_type='USER',
            resource_id=user.id
        ))
        db.commit()
        return True

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            db.add(AuditLog(
                actor_id=user.id,
                actor_email=email,
                action='LOGIN_FAILED',
                resource_type='AUTH',
                resource_id=user.id
            ))
            db.commit()
            return None

        db.add(AuditLog(
            actor_id=user.id,
            actor_email=user.email,
            action='LOGIN_SUCCESS',
            resource_type='AUTH',
            resource_id=user.id
        ))
        db.commit()
        return user

    @staticmethod
    def create_user_tokens(db: Session, user: User) -> Dict[str, Any]:
        roles = [ur.role.name for ur in user.roles if ur.role]
        token_data = {'sub': user.id, 'email': user.email, 'roles': roles}
        access_token = create_access_token(token_data)
        refresh_token_str = create_refresh_token(token_data)

        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        rt = RefreshToken(user_id=user.id, token=refresh_token_str, expires_at=expires_at)
        db.add(rt)
        db.commit()

        onboarding_done = bool(user.profile and user.profile.city and user.profile.purpose)
        return {
            'access_token': access_token,
            'refresh_token': refresh_token_str,
            'token_type': 'bearer',
            'expires_in': settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            'user_id': user.id,
            'email': user.email,
            'roles': roles,
            'email_verified': user.email_verified,
            'phone_verified': user.phone_verified,
            'onboarding_completed': onboarding_done
        }

    @staticmethod
    def refresh_user_token(db: Session, refresh_token_str: str) -> Dict[str, Any]:
        try:
            payload = decode_token(refresh_token_str)
            if payload.get('type') != 'refresh':
                raise ValueError('Invalid token type')
        except Exception:
            raise ValueError('Invalid or expired refresh token')

        rt = db.query(RefreshToken).filter(RefreshToken.token == refresh_token_str, RefreshToken.is_revoked == False).first()
        if not rt:
            raise ValueError('Refresh token has been revoked or is invalid')

        user = db.query(User).filter(User.id == rt.user_id, User.is_active == True).first()
        if not user:
            raise ValueError('User not found or inactive')

        # Revoke old refresh token (rotation)
        rt.is_revoked = True
        db.commit()

        return AuthService.create_user_tokens(db, user)

    @staticmethod
    def update_profile(db: Session, user_id: str, profile_in: ProfileUpdate) -> Profile:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            profile = Profile(user_id=user_id)
            db.add(profile)

        for field, value in profile_in.dict(exclude_unset=True).items():
            setattr(profile, field, value)

        db.commit()
        db.refresh(profile)
        return profile
