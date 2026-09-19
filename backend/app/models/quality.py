import uuid
import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class DataQualityIssue(Base):
    __tablename__ = 'data_quality_issues'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=True)
    record_id = Column(String(100), nullable=True)
    rule = Column(String(100), nullable=False)
    severity = Column(String(50), default='MEDIUM', nullable=False)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    status = Column(String(50), default='OPEN', nullable=False)

    vehicle = relationship('Vehicle', back_populates='quality_issues')

class Alert(Base):
    __tablename__ = 'alerts'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    alert_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default='WARNING', nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)

    vehicle = relationship('Vehicle', back_populates='alerts')
    user = relationship('User')
