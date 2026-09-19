import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Provider(Base):
    __tablename__ = 'providers'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(150), nullable=False)
    provider_type = Column(String(50), nullable=False)
    registration_number = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    contact_email = Column(String(150), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    api_endpoint = Column(String(255), nullable=True)

    provider_users = relationship('ProviderUser', back_populates='provider', cascade='all, delete-orphan')

class ProviderUser(Base):
    __tablename__ = 'provider_users'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    provider_id = Column(String(36), ForeignKey('providers.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), default='STAFF', nullable=False)

    provider = relationship('Provider', back_populates='provider_users')
    user = relationship('User')
