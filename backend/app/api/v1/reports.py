import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.report_service import ReportService
from app.api.deps import get_current_user, get_optional_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.intelligence import Report, ReportSnapshot

router = APIRouter(tags=['Reports'])

@router.post('/vehicles/{id}/reports')
def create_report(id: str, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    v = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not v:
        v = db.query(Vehicle).filter(Vehicle.vin == id.upper()).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')

    rep = Report(
        vehicle_id=v.id,
        requested_by_id=current_user.id if current_user else None,
        report_type='INTELLIGENCE',
        status='READY'
    )
    db.add(rep)
    db.commit()
    db.refresh(rep)

    return {
        'report_id': rep.id,
        'vehicle_id': v.id,
        'vin': v.vin,
        'status': 'READY',
        'generated_at': rep.generated_at,
        'download_url': f'/api/v1/reports/{rep.id}/pdf'
    }

@router.get('/reports/{id}')
def get_report(id: str, db: Session = Depends(get_db)):
    rep = db.query(Report).filter(Report.id == id).first()
    if not rep:
        raise HTTPException(status_code=404, detail='Report not found')
    return {
        'id': rep.id,
        'vehicle_id': rep.vehicle_id,
        'status': rep.status,
        'generated_at': rep.generated_at,
        'download_url': f'/api/v1/reports/{rep.id}/pdf'
    }

@router.get('/reports/{id}/pdf')
def download_pdf(id: str, db: Session = Depends(get_db)):
    rep = db.query(Report).filter(Report.id == id).first()
    vehicle_id = rep.vehicle_id if rep else id
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        v = db.query(Vehicle).filter(Vehicle.vin == vehicle_id.upper()).first()
    if not v:
        raise HTTPException(status_code=404, detail='Report or vehicle not found')

    pdf_bytes = ReportService.generate_pdf_report(db, v.id)
    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=CarTrust_Intelligence_Report_{v.vin}.pdf'}
    )
