import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class DocumentRead(BaseModel):
    id: str
    vehicle_id: str
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    status: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class InvoiceItemRead(BaseModel):
    id: str
    description: str
    part_name: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    class Config:
        from_attributes = True

class InvoiceRead(BaseModel):
    id: str
    vehicle_id: str
    document_id: Optional[str] = None
    invoice_number: str
    vendor_name: str
    vendor_id: Optional[str] = None
    invoice_date: datetime.date
    odometer_reading: Optional[int] = None
    subtotal: float
    tax: float
    total_amount: float
    verification_status: str
    issuer_verification_notes: Optional[str] = None
    items: List[InvoiceItemRead] = []
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class EvidenceRead(BaseModel):
    id: str
    vehicle_id: str
    event_id: Optional[str] = None
    document_id: Optional[str] = None
    evidence_type: str
    title: str
    description: Optional[str] = None
    verification_status: str
    confidence_score: float
    source: str
    provenance: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class EvidenceVerificationCreate(BaseModel):
    verification_method: str
    new_status: str
    notes: Optional[str] = None
