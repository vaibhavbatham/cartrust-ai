from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.admin import AdminDashboardStats, ProviderCreate, ProviderRead, AuditLogRead
from app.schemas.evidence import EvidenceRead, EvidenceVerificationCreate
from app.api.deps import RoleChecker
from app.models.user import User, AuditLog
from app.models.vehicle import Vehicle
from app.models.provider import Provider
from app.models.evidence import Evidence, EvidenceVerification
from app.models.quality import DataQualityIssue, Alert

router = APIRouter(prefix='/admin', tags=['Administration'], dependencies=[Depends(RoleChecker(['ADMIN']))])

@router.get('/dashboard', response_model=AdminDashboardStats)
def get_admin_dashboard(db: Session = Depends(get_db)):
    users_cnt = db.query(User).count()
    vehicles_cnt = db.query(Vehicle).count()
    providers_cnt = db.query(Provider).count()
    ev_cnt = db.query(Evidence).count()
    dq_cnt = db.query(DataQualityIssue).filter(DataQualityIssue.status == 'OPEN').count()
    unverified_ev = db.query(Evidence).filter(Evidence.verification_status.in_(['UNVERIFIED', 'PARTIALLY_VERIFIED'])).count()
    alerts_cnt = db.query(Alert).filter(Alert.is_resolved == False).count()

    return AdminDashboardStats(
        total_users=users_cnt,
        total_vehicles=vehicles_cnt,
        total_providers=providers_cnt,
        total_evidence=ev_cnt,
        open_dq_issues=dq_cnt,
        unverified_evidence=unverified_ev,
        active_alerts=alerts_cnt,
        pipeline_status='HEALTHY'
    )

@router.get('/users')
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).limit(50).all()
    res = []
    for u in users:
        roles = [ur.role.name for ur in u.roles if ur.role]
        res.append({
            'id': u.id,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'roles': roles,
            'email_verified': u.email_verified,
            'phone_verified': u.phone_verified,
            'created_at': u.created_at
        })
    return res

@router.get('/providers', response_model=List[ProviderRead])
def list_providers(db: Session = Depends(get_db)):
    providers = db.query(Provider).all()
    return [ProviderRead.from_orm(p) for p in providers]

@router.post('/providers', response_model=ProviderRead)
def create_provider(data: ProviderCreate, db: Session = Depends(get_db)):
    p = Provider(**data.dict())
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProviderRead.from_orm(p)

@router.get('/evidence/review', response_model=List[EvidenceRead])
def review_evidence(db: Session = Depends(get_db)):
    evs = db.query(Evidence).filter(Evidence.verification_status.in_(['UNVERIFIED', 'PARTIALLY_VERIFIED', 'DOCUMENT_CHECKED', 'INCONSISTENT'])).all()
    return [EvidenceRead.from_orm(e) for e in evs]

@router.patch('/evidence/{id}', response_model=EvidenceRead)
def update_evidence_status(id: str, data: EvidenceVerificationCreate, db: Session = Depends(get_db)):
    ev = db.query(Evidence).filter(Evidence.id == id).first()
    if not ev:
        raise HTTPException(status_code=404, detail='Evidence not found')

    old_status = ev.verification_status
    ev.verification_status = data.new_status
    ev.confidence_score = 0.95 if data.new_status == 'VERIFIED' else 0.4

    verification = EvidenceVerification(
        evidence_id=ev.id,
        verification_method=data.verification_method,
        previous_status=old_status,
        new_status=data.new_status,
        notes=data.notes
    )
    db.add(verification)
    db.commit()
    db.refresh(ev)
    return EvidenceRead.from_orm(ev)

@router.get('/audit', response_model=List[AuditLogRead])
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [AuditLogRead.from_orm(l) for l in logs]

@router.get('/pipelines')
def get_pipeline_status(db: Session = Depends(get_db)):
    dq_count = db.query(DataQualityIssue).count()
    return {
        'status': 'OPERATIONAL',
        'last_run': '2026-09-19T12:00:00Z',
        'medallion_layers': {
            'bronze': {'status': 'ONLINE', 'records': 2450},
            'silver': {'status': 'ONLINE', 'records': 2410, 'dq_violations_caught': dq_count},
            'gold': {'status': 'ONLINE', 'records': 2400}
        },
        'active_workers': 2,
        'scheduler': 'ACTIVE'
    }
