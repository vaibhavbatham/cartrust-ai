from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
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
from app.models.event import InsuranceEvent, InspectionEvent, VehicleTimeline, ServiceEvent
from app.models.evidence import Evidence, Invoice

router = APIRouter(prefix='/vehicles', tags=['Vehicles'])

def enrich_vehicle_read(v: Vehicle, current_user: Optional[User], db: Session) -> VehicleRead:
    item = VehicleRead.from_orm(v)
    item.can_edit = bool(current_user and v.created_by_id == current_user.id)
    item.can_delete = bool(current_user and v.created_by_id == current_user.id)
    
    # Enrich counts
    service_events = db.query(ServiceEvent).filter(ServiceEvent.vehicle_id == v.id).all()
    item.service_records_count = len(service_events)
    item.repair_records_count = len([s for s in service_events if 'REPAIR' in (s.service_type or '').upper() or 'REPAIR' in (s.work_performed or '').upper()])
    item.verified_invoices_count = db.query(Invoice).filter(
        Invoice.vehicle_id == v.id, 
        Invoice.verification_status.in_(['VERIFIED', 'DOCUMENT_CHECKED'])
    ).count()
    item.claims_count = db.query(InsuranceEvent).filter(InsuranceEvent.vehicle_id == v.id).count()
    item.verified_evidence_count = db.query(Evidence).filter(
        Evidence.vehicle_id == v.id, 
        Evidence.verification_status == 'VERIFIED'
    ).count()
    
    tl_count = db.query(VehicleTimeline).filter(VehicleTimeline.vehicle_id == v.id).count()
    item.history_coverage_pct = min(100.0, round((tl_count * 12.0) + (item.verified_evidence_count * 8.0), 1))
    return item

@router.post('', response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(data: VehicleCreate, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    try:
        user_id = current_user.id if current_user else None
        v = VehicleService.create_vehicle(db, data, user_id=user_id)
        return enrich_vehicle_read(v, current_user, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('', response_model=List[VehicleRead])
def list_vehicles(query: Optional[str] = None, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    if query and query.strip():
        v = VehicleService.lookup_vehicle(db, query)
        if not v or v.is_deleted:
            return []
        return [enrich_vehicle_read(v, current_user, db)]

    # Fetch active non-deleted vehicles
    vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == False).order_by(Vehicle.year.desc()).all()
    
    # If user is logged in, sort so that vehicles created by the current user come first
    if current_user:
        user_id = current_user.id
        vehicles = sorted(vehicles, key=lambda v: (0 if v.created_by_id == user_id else 1, -v.year))

    return [enrich_vehicle_read(v, current_user, db) for v in vehicles]

@router.get('/validate-plate/{plate}', response_model=VehiclePlateValidation)
def validate_plate(plate: str, db: Session = Depends(get_db)):
    res = VehicleService.validate_plate_query(db, plate)
    return VehiclePlateValidation(**res)

@router.get('/{id}', response_model=VehicleRead)
def get_vehicle(id: str, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='No historical records are currently available for this vehicle.')
    return enrich_vehicle_read(v, current_user, db)

@router.put('/{id}', response_model=VehicleRead)
def update_vehicle(
    id: str, 
    data: VehicleUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        v = VehicleService.update_vehicle(db, id, data, current_user.id)
        return enrich_vehicle_read(v, current_user, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

@router.delete('/{id}')
def delete_vehicle(
    id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        VehicleService.delete_vehicle(db, id, current_user.id)
        return {
            'success': True, 
            'message': 'Vehicle listing removed successfully. Verified historical records remain securely archived.'
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))

@router.get('/{id}/timeline', response_model=List[TimelineEventRead])
def get_timeline(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    events = TimelineService.get_vehicle_timeline(db, v.id)
    return [TimelineEventRead(**e) for e in events]

@router.get('/{id}/maintenance', response_model=List[MaintenanceScheduleItem])
def get_maintenance(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    items = MaintenanceService.get_maintenance_intelligence(db, v.id)
    return [MaintenanceScheduleItem(**i) for i in items]

@router.get('/{id}/claims', response_model=List[InsuranceEventRead])
def get_claims(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    claims = db.query(InsuranceEvent).filter(InsuranceEvent.vehicle_id == v.id).all()
    return [InsuranceEventRead.from_orm(c) for c in claims]

@router.get('/{id}/inspections', response_model=List[InspectionEventRead])
def get_inspections(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    insps = db.query(InspectionEvent).filter(InspectionEvent.vehicle_id == v.id).all()
    return [InspectionEventRead.from_orm(i) for i in insps]

@router.get('/{id}/odometer', response_model=OdometerAnalysis)
def get_odometer(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    analysis = OdometerService.analyze_odometer(db, v.id)
    return OdometerAnalysis(**analysis)

@router.get('/{id}/evidence', response_model=List[EvidenceRead])
def get_evidence(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    evs = db.query(Evidence).filter(Evidence.vehicle_id == v.id).all()
    return [EvidenceRead.from_orm(e) for e in evs]

@router.get('/{id}/intelligence', response_model=VehicleIntelligenceSummary)
def get_intelligence(id: str, db: Session = Depends(get_db)):
    v = VehicleService.lookup_vehicle(db, id)
    if not v or v.is_deleted:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    summary = IntelligenceSummaryService.get_summary(db, v.id)
    return VehicleIntelligenceSummary(**summary)
