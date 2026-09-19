import re
import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

def normalize_plate(plate: Optional[str]) -> Optional[str]:
    if not plate:
        return None
    return re.sub(r'[^A-Za-z0-9]', '', plate).upper()

INDIAN_PLATE_REGEX = r'^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$'
BHARAT_PLATE_REGEX = r'^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$'

def validate_indian_plate(plate: str) -> bool:
    norm = normalize_plate(plate)
    if not norm:
        return False
    return bool(re.match(INDIAN_PLATE_REGEX, norm) or re.match(BHARAT_PLATE_REGEX, norm))

class VehicleBase(BaseModel):
    vin: Optional[str] = Field(None, min_length=5, max_length=50)
    registration_number: Optional[str] = None
    make: str
    model: str
    variant: Optional[str] = None
    year: int = Field(..., ge=1990, le=2030)
    registration_year: Optional[int] = Field(None, ge=1990, le=2030)
    fuel_type: str
    transmission: str
    mileage_efficiency: Optional[str] = None
    current_odometer: int = Field(0, ge=0)
    engine_details: Optional[str] = None
    ownership_status: Optional[str] = 'FIRST'
    price: Optional[float] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    rc_number: Optional[str] = None

    @field_validator('vin', 'variant', 'mileage_efficiency', 'engine_details', 'location', 'image_url', 'rc_number', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str):
            stripped = v.strip()
            return stripped if stripped else None
        return v

class VehicleCreate(VehicleBase):
    registration_number: str = Field(..., description="Indian vehicle registration number, e.g. MP04AB1234")

    @field_validator('registration_number')
    @classmethod
    def validate_and_normalize_registration(cls, v):
        if not v or not v.strip():
            raise ValueError("Registration / number plate is required.")
        norm = normalize_plate(v)
        if not validate_indian_plate(norm):
            raise ValueError(
                f"Invalid Indian registration format '{v}'. "
                "Supported formats include MP04AB1234, DL01AB1234, MH12CD5678, or Bharat series 22BH1234AA."
            )
        return norm

class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    registration_year: Optional[int] = None
    mileage_efficiency: Optional[str] = None
    engine_details: Optional[str] = None
    price: Optional[float] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    rc_number: Optional[str] = None
    current_odometer: Optional[int] = None
    ownership_status: Optional[str] = None

class VehicleRead(VehicleBase):
    id: str
    golden_vehicle_id: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None
    history_coverage_pct: Optional[float] = 0.0
    verified_evidence_count: Optional[int] = 0
    open_alerts_count: Optional[int] = 0

    class Config:
        from_attributes = True

class VehicleSearchQuery(BaseModel):
    query: str

class VehiclePlateValidation(BaseModel):
    input_plate: str
    normalized_plate: str
    is_valid: bool
    exists: bool
    message: str
    vehicle_id: Optional[str] = None
