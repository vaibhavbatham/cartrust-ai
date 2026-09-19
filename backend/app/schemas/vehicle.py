import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class VehicleBase(BaseModel):
    vin: str = Field(..., min_length=5, max_length=50)
    registration_number: Optional[str] = None
    make: str
    model: str
    variant: Optional[str] = None
    year: int = Field(..., ge=1990, le=2030)
    fuel_type: str
    transmission: str
    current_odometer: int = Field(0, ge=0)
    ownership_status: Optional[str] = 'FIRST'

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    current_odometer: Optional[int] = None
    ownership_status: Optional[str] = None

class VehicleRead(VehicleBase):
    id: str
    golden_vehicle_id: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    history_coverage_pct: Optional[float] = 0.0
    verified_evidence_count: Optional[int] = 0
    open_alerts_count: Optional[int] = 0
    class Config:
        from_attributes = True

class VehicleSearchQuery(BaseModel):
    query: str
