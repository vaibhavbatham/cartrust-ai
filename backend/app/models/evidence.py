import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = 'documents'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    uploaded_by_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    ocr_extracted_text = Column(Text, nullable=True)
    ocr_metadata_json = Column(Text, nullable=True)
    document_category = Column(String(50), default='SERVICE', nullable=False)
    status = Column(String(50), default='UPLOADED', nullable=False)

    vehicle = relationship('Vehicle', back_populates='documents')
    uploader = relationship('User')
    invoices = relationship('Invoice', back_populates='document', cascade='all, delete-orphan')

class Invoice(Base):
    __tablename__ = 'invoices'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    document_id = Column(String(36), ForeignKey('documents.id', ondelete='SET NULL'), nullable=True)
    invoice_number = Column(String(100), nullable=False)
    vendor_name = Column(String(150), nullable=False)
    vendor_id = Column(String(100), nullable=True)
    customer_name = Column(String(150), nullable=True)
    category = Column(String(50), default='SERVICE', nullable=False)
    work_performed = Column(String(255), nullable=True)
    record_source = Column(String(50), default='AI_EXTRACTED', nullable=False)
    invoice_date = Column(Date, nullable=False)
    odometer_reading = Column(Integer, nullable=True)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    verification_status = Column(String(50), default='NEEDS_REVIEW', nullable=False)
    issuer_verification_notes = Column(Text, nullable=True)
    raw_ocr_payload = Column(Text, nullable=True)

    document = relationship('Document', back_populates='invoices')
    items = relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')

class InvoiceItem(Base):
    __tablename__ = 'invoice_items'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    invoice_id = Column(String(36), ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False)
    description = Column(String(255), nullable=False)
    part_name = Column(String(150), nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)

    invoice = relationship('Invoice', back_populates='items')

class Evidence(Base):
    __tablename__ = 'evidence'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    vehicle_id = Column(String(36), ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False)
    event_id = Column(String(36), nullable=True)
    document_id = Column(String(36), ForeignKey('documents.id', ondelete='SET NULL'), nullable=True)
    evidence_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    verification_status = Column(String(50), default='UNVERIFIED', nullable=False)
    confidence_score = Column(Float, default=0.5, nullable=False)
    source = Column(String(100), nullable=False)
    provenance = Column(Text, nullable=True)

    vehicle = relationship('Vehicle', back_populates='evidence')
    document = relationship('Document')
    verifications = relationship('EvidenceVerification', back_populates='evidence', cascade='all, delete-orphan')

class EvidenceVerification(Base):
    __tablename__ = 'evidence_verifications'

    id = Column(String(36), primary_key=True, default=gen_uuid)
    evidence_id = Column(String(36), ForeignKey('evidence.id', ondelete='CASCADE'), nullable=False)
    verified_by_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    verification_method = Column(String(50), nullable=False)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    evidence = relationship('Evidence', back_populates='verifications')
    verifier = relationship('User')
