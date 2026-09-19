from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.intelligence import VehicleCompareRequest, VehicleCompareResponse
from app.services.comparison_service import ComparisonService

router = APIRouter(prefix='/vehicles', tags=['Comparison'])

@router.post('/compare', response_model=VehicleCompareResponse)
def compare_vehicles(data: VehicleCompareRequest, db: Session = Depends(get_db)):
    if not data.vehicle_ids or len(data.vehicle_ids) < 2:
        raise HTTPException(status_code=400, detail='Please select at least 2 vehicles to compare')
    res = ComparisonService.compare_vehicles(db, data.vehicle_ids)
    return VehicleCompareResponse(**res)
