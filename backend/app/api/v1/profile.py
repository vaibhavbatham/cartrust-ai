from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import UserRead, ProfileUpdate, ProfileRead
from app.api.deps import get_current_user
from app.services.auth_service import AuthService
from app.models.user import User

router = APIRouter(tags=['Profile'])

@router.get('/me', response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    roles = [ur.role.name for ur in current_user.roles if ur.role]
    p_read = None
    if current_user.profile:
        p_read = ProfileRead.from_orm(current_user.profile)
    return UserRead(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        mobile_number=current_user.mobile_number,
        email_verified=current_user.email_verified,
        phone_verified=current_user.phone_verified,
        is_active=current_user.is_active,
        roles=roles,
        profile=p_read,
        created_at=current_user.created_at
    )

@router.patch('/me', response_model=ProfileRead)
def update_me(data: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = AuthService.update_profile(db, current_user.id, data)
    return ProfileRead.from_orm(profile)
