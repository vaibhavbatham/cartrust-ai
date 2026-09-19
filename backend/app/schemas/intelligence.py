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
    vin: str
    make: str
    model: str
    year: int
    mileage: int
    history_coverage_pct: float
    maintenance_evidence_rating: str
    verified_claims_count: int
    odometer_consistency_status: str
    inspection_overall_result: str
    upcoming_maintenance_count: int
    data_conflicts_count: int
    evidence_count: int

class VehicleCompareResponse(BaseModel):
    comparison: List[VehicleCompareItem]
    neutral_analysis: str

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
