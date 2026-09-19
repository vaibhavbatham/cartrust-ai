import uuid
from sqlalchemy import Column, String, Integer, Float, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class ServiceEvent(Base):
    __tablename__ = 'service_events'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    provider_id = Column(String(36), ForeignKey('providers.id', ondelete='SET NULL'), nullable=True)
    service_date = Column(Date, nullable=False)
    odometer_reading = Column(Integer, nullable=False)
    service_type = Column(String(100), nullable=False)
    work_performed = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    labor_cost = Column(Float, default=0.0)
    parts_cost = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    status = Column(String(50), default='COMPLETED')
    invoice_id = Column(String(36), ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True)
    document_id = Column(String(36), ForeignKey('documents.id', ondelete='SET NULL'), nullable=True)
    record_source = Column(String(50), default='USER_PROVIDED', nullable=False)
    verification_status = Column(String(50), default='UNVERIFIED', nullable=False)

    vehicle = relationship('Vehicle', back_populates='service_events')
    provider = relationship('Provider')
    invoice = relationship('Invoice')
    document = relationship('Document')

class MaintenanceEvent(Base):
    __tablename__ = 'maintenance_events'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    component = Column(String(100), nullable=False)
    event_date = Column(Date, nullable=False)
    odometer_reading = Column(Integer, nullable=False)
    action_taken = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)

    vehicle = relationship('Vehicle', back_populates='maintenance_events')

class InsuranceEvent(Base):
    __tablename__ = 'insurance_events'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    provider_id = Column(String(36), ForeignKey('providers.id', ondelete='SET NULL'), nullable=True)
    claim_number = Column(String(100), nullable=False)
    claim_date = Column(Date, nullable=False)
    claim_type = Column(String(100), default='COLLISION')
    damage_area = Column(String(100), nullable=False)
    severity = Column(String(50), default='MODERATE')
    claim_amount = Column(Float, default=0.0)
    repair_status = Column(String(50), default='REPAIRED')

    vehicle = relationship('Vehicle', back_populates='insurance_events')
    provider = relationship('Provider')

class InspectionEvent(Base):
    __tablename__ = 'inspection_events'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    provider_id = Column(String(36), ForeignKey('providers.id', ondelete='SET NULL'), nullable=True)
    inspection_date = Column(Date, nullable=False)
    odometer_reading = Column(Integer, nullable=False)
    inspection_center_name = Column(String(150), nullable=True)
    overall_result = Column(String(50), default='PASS')
    brake_condition = Column(String(50), default='GOOD')
    tire_condition = Column(String(50), default='GOOD')
    suspension_condition = Column(String(50), default='GOOD')
    engine_condition = Column(String(50), default='GOOD')
    remarks = Column(Text, nullable=True)

    vehicle = relationship('Vehicle', back_populates='inspection_events')
    provider = relationship('Provider')

class VehicleTimeline(Base):
    __tablename__ = 'vehicle_timeline'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    event_date = Column(Date, nullable=False)
    event_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    odometer = Column(Integer, nullable=True)
    source = Column(String(100), nullable=False)
    evidence_id = Column(String(36), ForeignKey('evidence.id', ondelete='SET NULL'), nullable=True)
    verification_status = Column(String(50), default='UNVERIFIED', nullable=False)
    confidence_score = Column(Float, default=0.5, nullable=False)

    vehicle = relationship('Vehicle', back_populates='timeline_events')
    evidence_ref = relationship('Evidence')
