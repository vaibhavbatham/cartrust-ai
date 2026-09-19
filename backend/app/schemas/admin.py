import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AdminDashboardStats(BaseModel):
    total_users: int
    total_vehicles: int
    total_providers: int
    total_evidence: int
    open_dq_issues: int
    unverified_evidence: int
    active_alerts: int
    pipeline_status: str

class ProviderCreate(BaseModel):
    name: str
    provider_type: str
    registration_number: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    api_endpoint: Optional[str] = None

class ProviderRead(ProviderCreate):
    id: str
    is_active: bool
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class AuditLogRead(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    correlation_id: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True
