import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class InvoiceItemBase(BaseModel):
    description: str
    part_name: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    total_price: float = 0.0

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemRead(InvoiceItemBase):
    id: str

    class Config:
        from_attributes = True

class InvoiceReviewRequest(BaseModel):
    invoice_number: str
    vendor_name: str
    customer_name: Optional[str] = None
    category: str = "SERVICE"
    work_performed: Optional[str] = None
    invoice_date: datetime.date
    odometer_reading: Optional[int] = None
    subtotal: float = 0.0
    tax: float = 0.0
    total_amount: float = 0.0
    items: List[InvoiceItemBase] = []
    notes: Optional[str] = None

class InvoiceRead(BaseModel):
    id: str
    vehicle_id: str
    document_id: Optional[str] = None
    invoice_number: str
    vendor_name: str
    customer_name: Optional[str] = None
    category: str = "SERVICE"
    work_performed: Optional[str] = None
    record_source: str = "AI_EXTRACTED"
    invoice_date: datetime.date
    odometer_reading: Optional[int] = None
    subtotal: float = 0.0
    tax: float = 0.0
    total_amount: float = 0.0
    verification_status: str
    issuer_verification_notes: Optional[str] = None
    items: List[InvoiceItemRead] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ManualServiceRecordCreate(BaseModel):
    service_date: datetime.date
    service_center: str
    service_type: str = "General Service"
    work_performed: str
    odometer_reading: int = Field(..., ge=0)
    total_amount: float = Field(..., ge=0)
    labor_cost: Optional[float] = 0.0
    parts_cost: Optional[float] = 0.0
    notes: Optional[str] = None
