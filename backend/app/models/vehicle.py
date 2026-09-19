import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Vehicle(Base):
    __tablename__ = 'vehicles'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vin = Column(String(50), unique=True, index=True, nullable=False)
    registration_number = Column(String(50), index=True, nullable=True)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    variant = Column(String(100), nullable=True)
    year = Column(Integer, nullable=False)
    fuel_type = Column(String(50), nullable=False)
    transmission = Column(String(50), nullable=False)
    current_odometer = Column(Integer, default=0, nullable=False)
    ownership_status = Column(String(50), default='FIRST', nullable=True)
    registration_year = Column(Integer, nullable=True)
    mileage_efficiency = Column(String(50), nullable=True)
    engine_details = Column(String(200), nullable=True)
    price = Column(Float, nullable=True)
    location = Column(String(200), nullable=True)
    image_url = Column(Text, nullable=True)
    rc_number = Column(String(100), nullable=True)
    golden_vehicle_id = Column(String(50), index=True, nullable=True)
    created_by_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    engine_capacity = Column(String(50), nullable=True)
    engine_type = Column(String(100), nullable=True)
    seating_capacity = Column(Integer, default=5, nullable=True)
    color = Column(String(50), nullable=True)
    body_type = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    ownerships = relationship('VehicleOwnership', back_populates='vehicle', cascade='all, delete-orphan')
    odometer_readings = relationship('OdometerReading', back_populates='vehicle', cascade='all, delete-orphan', order_by='OdometerReading.reading_date')
    service_events = relationship('ServiceEvent', back_populates='vehicle', cascade='all, delete-orphan')
    maintenance_events = relationship('MaintenanceEvent', back_populates='vehicle', cascade='all, delete-orphan')
    insurance_events = relationship('InsuranceEvent', back_populates='vehicle', cascade='all, delete-orphan')
    inspection_events = relationship('InspectionEvent', back_populates='vehicle', cascade='all, delete-orphan')
    evidence = relationship('Evidence', back_populates='vehicle', cascade='all, delete-orphan')
    documents = relationship('Document', back_populates='vehicle', cascade='all, delete-orphan')
    timeline_events = relationship('VehicleTimeline', back_populates='vehicle', cascade='all, delete-orphan')
    quality_issues = relationship('DataQualityIssue', back_populates='vehicle', cascade='all, delete-orphan')
    alerts = relationship('Alert', back_populates='vehicle', cascade='all, delete-orphan')
    reports = relationship('Report', back_populates='vehicle', cascade='all, delete-orphan')

class VehicleOwnership(Base):
    __tablename__ = 'vehicle_ownership'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=True, nullable=False)

    vehicle = relationship('Vehicle', back_populates='ownerships')
    user = relationship('User', back_populates='ownerships')

class VehicleSourceMapping(Base):
    __tablename__ = 'vehicle_source_mappings'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    golden_vehicle_id = Column(String(50), index=True, nullable=False)
    source_system = Column(String(100), nullable=False)
    source_vehicle_id = Column(String(100), nullable=False)
    match_method = Column(String(50), nullable=False)
    match_confidence = Column(Float, default=1.0, nullable=False)
    review_status = Column(String(50), default='CONFIRMED', nullable=False)

class OdometerReading(Base):
    __tablename__ = 'odometer_readings'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    reading = Column(Integer, nullable=False)
    reading_date = Column(Date, nullable=False)
    source = Column(String(100), nullable=False)
    evidence_id = Column(String(36), nullable=True)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(String(255), nullable=True)

    vehicle = relationship('Vehicle', back_populates='odometer_readings')
