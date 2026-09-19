import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class OdometerAnalysis(BaseModel):
    rollback_detected: bool
    status: str
    total_readings: int
    anomalies: List[Dict[str, Any]] = []
    explanation: str

class MaintenanceScheduleItem(BaseModel):
    component: str
    recommended_interval_km: int
    recommended_interval_months: int
    last_serviced_date: Optional[datetime.date] = None
    last_serviced_odometer: Optional[int] = None
    distance_since_service: Optional[int] = None
    months_since_service: Optional[int] = None
    status: str # 'DUE_SOON', 'OVERDUE', 'OK', 'NO_EVIDENCE', 'NOT_ENOUGH_DATA'
    confidence: str # 'KNOWN', 'REPORTED', 'INFERRED', 'UNKNOWN'
    evidence_notes: str

class VehicleIntelligenceSummary(BaseModel):
    vehicle_id: str
    vin: str
    history_coverage_pct: float
    maintenance_evidence_rating: str # 'HIGH', 'MODERATE', 'LOW', 'NONE'
    odometer_consistency_status: str # 'CONSISTENT', 'WARNING', 'ANOMALY_DETECTED'
    accident_summary: str
    verified_claims_count: int
    data_conflicts_count: int
    open_alerts_count: int
    ml_maintenance_risk_score: float # 0.0 to 1.0
    ml_maintenance_risk_level: str # 'LOW', 'MEDIUM', 'HIGH'
    record_anomaly_score: float
    record_anomaly_flag: bool
    category_breakdown: Dict[str, Any]

class VehicleCompareRequest(BaseModel):
    vehicle_ids: List[str]

class VehicleCompareItem(BaseModel):
    vehicle_id: str
    registration_number: Optional[str] = None
    vin: str
    make: str
    model: str
    variant: Optional[str] = None
    year: int
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    engine_details: Optional[str] = None
    engine_capacity: Optional[str] = None
    engine_type: Optional[str] = None
    seating_capacity: Optional[int] = 5
    color: Optional[str] = None
    body_type: Optional[str] = None
    mileage: int
    price: Optional[float] = None
    location: Optional[str] = None
    service_records_count: int = 0
    repair_records_count: int = 0
    verified_invoices_count: int = 0
    total_maintenance_expenditure: float = 0.0
    latest_service_date: Optional[str] = None
    latest_odometer_reading: int = 0
    accident_claims_count: int = 0
    history_coverage_pct: float = 0.0
    maintenance_evidence_rating: str = 'NONE'
    verified_claims_count: int = 0
    odometer_consistency_status: str = 'CONSISTENT'
    inspection_overall_result: str = 'NO_RECORD'
    upcoming_maintenance_count: int = 0
    data_conflicts_count: int = 0
    evidence_count: int = 0
    ownership_status: str = 'FIRST'
    ownership_count: int = 1
    data_completeness_pct: float = 85.0
    factual_highlights: List[str] = []

class VehicleCompareResponse(BaseModel):
    comparison: List[VehicleCompareItem]
    vehicles: Optional[List[VehicleCompareItem]] = None
    neutral_analysis: str
    neutral_summary: Optional[str] = None
    highlights: Optional[List[str]] = []
    comparison_summary: Optional[Dict[str, Any]] = None

class AIQueryRequest(BaseModel):
    vehicle_id: Optional[str] = None
    query: str
    conversation_history: Optional[List[Dict[str, Any]]] = []

class AIQueryResponse(BaseModel):
    answer: str
    grounded_evidence: List[Dict[str, Any]] = []
    actions: List[Dict[str, Any]] = []
    suggested_questions: List[str] = []
    vehicle_context: Optional[Dict[str, Any]] = None
    uncertainty_level: str # 'KNOWN', 'REPORTED', 'INFERRED', 'UNKNOWN'
    disclaimer: str

class DataQualityIssueRead(BaseModel):
    id: str
    vehicle_id: Optional[str] = None
    record_id: Optional[str] = None
    rule: str
    severity: str
    description: str
    detected_at: datetime.datetime
    status: str
    class Config:
        from_attributes = True

class AlertRead(BaseModel):
    id: str
    vehicle_id: str
    alert_type: str
    title: str
    message: str
    severity: str
    is_resolved: bool
    created_at: datetime.datetime
    class Config:
        from_attributes = True
