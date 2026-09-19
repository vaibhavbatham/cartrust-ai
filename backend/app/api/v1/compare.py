from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.intelligence import VehicleCompareRequest, VehicleCompareResponse
from app.services.comparison_service import ComparisonService

router = APIRouter(tags=['Comparison'])

@router.post('/compare', response_model=VehicleCompareResponse)
@router.post('/vehicles/compare', response_model=VehicleCompareResponse)
def compare_vehicles(data: VehicleCompareRequest, db: Session = Depends(get_db)):
    if not data.vehicle_ids or len(data.vehicle_ids) < 2:
        raise HTTPException(status_code=400, detail='Please select at least 2 vehicles to compare')
    res = ComparisonService.compare_vehicles(db, data.vehicle_ids)
    return VehicleCompareResponse(**res)

@router.get('/compare', response_model=VehicleCompareResponse)
@router.get('/vehicles/compare', response_model=VehicleCompareResponse)
def compare_vehicles_get(
    vehicles: Optional[str] = None, 
    vehicle_ids: Optional[str] = None,
    db: Session = Depends(get_db)
):
    raw_str = vehicles or vehicle_ids or ''
    ids = [vid.strip() for vid in raw_str.split(',') if vid.strip()]
    if len(ids) < 2:
        # Fallback to first two active vehicles if none or < 2 specified
        from app.models.vehicle import Vehicle
        demo_vs = db.query(Vehicle).filter(Vehicle.is_deleted == False).limit(2).all()
        ids = [v.id for v in demo_vs]
    if len(ids) < 2:
        raise HTTPException(status_code=400, detail='Please select at least 2 vehicles to compare')
    res = ComparisonService.compare_vehicles(db, ids)
    return VehicleCompareResponse(**res)
