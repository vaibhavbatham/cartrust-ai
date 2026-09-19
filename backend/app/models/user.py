import uuid
import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = 'users'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    mobile_number = Column(String(30), nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    google_id = Column(String(100), unique=True, index=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)

    profile = relationship('Profile', back_populates='user', uselist=False, cascade='all, delete-orphan')
    roles = relationship('UserRole', back_populates='user', cascade='all, delete-orphan')
    ownerships = relationship('VehicleOwnership', back_populates='user')
    refresh_tokens = relationship('RefreshToken', back_populates='user', cascade='all, delete-orphan')

class Role(Base):
    __tablename__ = 'roles'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

class UserRole(Base):
    __tablename__ = 'user_roles'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role_id = Column(String(36), ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)

    user = relationship('User', back_populates='roles')
    role = relationship('Role')

class Profile(Base):
    __tablename__ = 'profiles'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    full_name = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), default='India', nullable=True)
    preferred_language = Column(String(50), default='English', nullable=True)
    purpose = Column(String(100), nullable=True)
    profile_image_url = Column(String(500), nullable=True)

    user = relationship('User', back_populates='profile')

class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = Column(String(500), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)

    user = relationship('User', back_populates='refresh_tokens')

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    actor_id = Column(String(36), nullable=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    correlation_id = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)
