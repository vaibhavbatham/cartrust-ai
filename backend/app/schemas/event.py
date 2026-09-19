import datetime
from typing import Optional, List
from pydantic import BaseModel

class TimelineEventRead(BaseModel):
    id: str
    vehicle_id: str
    event_date: datetime.date
    event_type: str
    title: str
    description: Optional[str] = None
    odometer: Optional[int] = None
    source: str
    evidence_id: Optional[str] = None
    verification_status: str
    confidence_score: float
    provenance: Optional[str] = None
    class Config:
        from_attributes = True

class ServiceEventCreate(BaseModel):
    service_date: datetime.date
    odometer_reading: int
    service_type: str
    description: Optional[str] = None
    labor_cost: float = 0.0
    parts_cost: float = 0.0
    total_amount: float = 0.0

class ServiceEventRead(ServiceEventCreate):
    id: str
    vehicle_id: str
    provider_id: Optional[str] = None
    provider_name: Optional[str] = None
    status: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class MaintenanceEventCreate(BaseModel):
    component: str
    event_date: datetime.date
    odometer_reading: int
    action_taken: str
    notes: Optional[str] = None

class MaintenanceEventRead(MaintenanceEventCreate):
    id: str
    vehicle_id: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class InsuranceEventRead(BaseModel):
    id: str
    vehicle_id: str
    claim_number: str
    claim_date: datetime.date
    claim_type: str
    damage_area: str
    severity: str
    claim_amount: float
    repair_status: str
    provider_name: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class InspectionEventRead(BaseModel):
    id: str
    vehicle_id: str
    inspection_date: datetime.date
    odometer_reading: int
    inspection_center_name: Optional[str] = None
    overall_result: str
    brake_condition: str
    tire_condition: str
    suspension_condition: str
    engine_condition: str
    remarks: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class OdometerReadingRead(BaseModel):
    id: str
    reading: int
    reading_date: datetime.date
    source: str
    is_flagged: bool
    flag_reason: Optional[str] = None
    class Config:
        from_attributes = True
