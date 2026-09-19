from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login')
oauth2_optional = OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login', auto_error=False)

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get('sub')
        token_type: str = payload.get('type')
        if user_id is None or token_type != 'access':
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def get_optional_user(db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_optional)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id: str = payload.get('sub')
        if not user_id or payload.get('type') != 'access':
            return None
        return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except Exception:
        return None

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = [r.upper() for r in allowed_roles]

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        user_roles = [ur.role.name.upper() for ur in current_user.roles if ur.role]
        if current_user.is_superuser or 'ADMIN' in user_roles:
            return current_user
        for role in self.allowed_roles:
            if role in user_roles:
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f'User does not have necessary role permission. Required one of: {self.allowed_roles}'
        )
