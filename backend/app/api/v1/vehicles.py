from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.vehicle import VehicleCreate, VehicleRead, VehicleUpdate, VehiclePlateValidation
from app.schemas.event import TimelineEventRead, InsuranceEventRead, InspectionEventRead, OdometerReadingRead
from app.schemas.intelligence import VehicleIntelligenceSummary, OdometerAnalysis, MaintenanceScheduleItem
from app.schemas.evidence import EvidenceRead
from app.services.vehicle_service import VehicleService
from app.services.timeline_service import TimelineService
from app.services.odometer_service import OdometerService
from app.services.maintenance_service import MaintenanceService
from app.services.intelligence_summary_service import IntelligenceSummaryService
from app.api.deps import get_current_user, get_optional_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.event import InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.evidence import Evidence

router = APIRouter(prefix='/vehicles', tags=['Vehicles'])

@router.post('', response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(data: VehicleCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    try:
        user_id = current_user.id if current_user else None
        v = VehicleService.create_vehicle(db, data, user_id=user_id)
        return VehicleRead.from_orm(v)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('', response_model=List[VehicleRead])
def list_vehicles(query: Optional[str] = None, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    if query and query.strip():
        v = VehicleService.lookup_vehicle(db, query)
        if not v:
            return []
        return [VehicleRead.from_orm(v)]
    if current_user:
        user_v = VehicleService.get_user_vehicles(db, current_user.id)
        if user_v:
            return [VehicleRead(**item) for item in user_v]
    # Default list of active vehicles
    all_v = db.query(Vehicle).order_by(Vehicle.created_at.desc()).limit(30).all()
    return [VehicleRead.from_orm(v) for v in all_v]

@router.get('/validate-plate/{plate}', response_model=VehiclePlateValidation)
def validate_plate(plate: str, db: Session = Depends(get_db)):
    res = VehicleService.validate_plate_query(db, plate)
    return VehiclePlateValidation(**res)

@router.get('/{id}', response_model=VehicleRead)
def get_vehicle(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='No historical records are currently available for this vehicle.')
    return VehicleRead.from_orm(v)

@router.get('/{id}/timeline', response_model=List[TimelineEventRead])
def get_timeline(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    events = TimelineService.get_vehicle_timeline(db, v.id)
    return [TimelineEventRead(**e) for e in events]

@router.get('/{id}/maintenance', response_model=List[MaintenanceScheduleItem])
def get_maintenance(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    items = MaintenanceService.get_maintenance_intelligence(db, v.id)
    return [MaintenanceScheduleItem(**i) for i in items]

@router.get('/{id}/claims', response_model=List[InsuranceEventRead])
def get_claims(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    claims = db.query(InsuranceEvent).filter(InsuranceEvent.vehicle_id == v.id).all()
    return [InsuranceEventRead.from_orm(c) for c in claims]

@router.get('/{id}/inspections', response_model=List[InspectionEventRead])
def get_inspections(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    insps = db.query(InspectionEvent).filter(InspectionEvent.vehicle_id == v.id).all()
    return [InspectionEventRead.from_orm(i) for i in insps]

@router.get('/{id}/odometer', response_model=OdometerAnalysis)
def get_odometer(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    analysis = OdometerService.analyze_odometer(db, v.id)
    return OdometerAnalysis(**analysis)

@router.get('/{id}/evidence', response_model=List[EvidenceRead])
def get_evidence(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    evs = db.query(Evidence).filter(Evidence.vehicle_id == v.id).all()
    return [EvidenceRead.from_orm(e) for e in evs]

@router.get('/{id}/intelligence', response_model=VehicleIntelligenceSummary)
def get_intelligence(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    summary = IntelligenceSummaryService.get_summary(db, v.id)
    return VehicleIntelligenceSummary(**summary)
