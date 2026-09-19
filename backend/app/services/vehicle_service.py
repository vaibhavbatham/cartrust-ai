import uuid
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle, VehicleOwnership, VehicleSourceMapping, OdometerReading
from app.models.event import ServiceEvent, MaintenanceEvent, InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.evidence import Evidence, Document
from app.models.quality import Alert, DataQualityIssue
from app.schemas.vehicle import VehicleCreate

class VehicleService:
    @staticmethod
    def lookup_vehicle(db: Session, query_str: str) -> Optional[Vehicle]:
        q = query_str.strip().upper()
        # Direct VIN
        v = db.query(Vehicle).filter(Vehicle.vin == q).first()
        if v:
            return v
        # Registration number
        v = db.query(Vehicle).filter(Vehicle.registration_number == q).first()
        if v:
            return v
        # Golden vehicle ID or mapped source ID
        v = db.query(Vehicle).filter(Vehicle.golden_vehicle_id == q).first()
        if v:
            return v
        mapping = db.query(VehicleSourceMapping).filter(VehicleSourceMapping.source_vehicle_id == q).first()
        if mapping:
            return db.query(Vehicle).filter(Vehicle.golden_vehicle_id == mapping.golden_vehicle_id).first()
        return None

    @staticmethod
    def create_vehicle(db: Session, data: VehicleCreate, user_id: Optional[str] = None) -> Vehicle:
        existing = db.query(Vehicle).filter(Vehicle.vin == data.vin.upper()).first()
        if existing:
            raise ValueError(f'Vehicle with VIN {data.vin} already exists')

        golden_id = f'GOLDEN-{data.vin.upper()}'
        vehicle = Vehicle(
            vin=data.vin.upper(),
            registration_number=data.registration_number.upper() if data.registration_number else None,
            make=data.make,
            model=data.model,
            variant=data.variant,
            year=data.year,
            fuel_type=data.fuel_type,
            transmission=data.transmission,
            current_odometer=data.current_odometer,
            ownership_status=data.ownership_status or 'FIRST',
            golden_vehicle_id=golden_id,
            created_by_id=user_id
        )
        db.add(vehicle)
        db.flush()

        if user_id:
            ownership = VehicleOwnership(
                vehicle_id=vehicle.id,
                user_id=user_id,
                is_current=True
            )
            db.add(ownership)

        if data.current_odometer > 0:
            odo = OdometerReading(
                vehicle_id=vehicle.id,
                reading=data.current_odometer,
                reading_date=datetime.date.today(),
                source='USER_ONBOARDING'
            )
            db.add(odo)

        mapping = VehicleSourceMapping(
            golden_vehicle_id=golden_id,
            source_system='USER_ENTRY',
            source_vehicle_id=data.vin.upper(),
            match_method='EXACT_VIN',
            match_confidence=1.0,
            review_status='CONFIRMED'
        )
        db.add(mapping)

        db.commit()
        db.refresh(vehicle)
        return vehicle

    @staticmethod
    def get_user_vehicles(db: Session, user_id: str) -> List[Dict[str, Any]]:
        ownerships = db.query(VehicleOwnership).filter(VehicleOwnership.user_id == user_id, VehicleOwnership.is_current == True).all()
        results = []
        for own in ownerships:
            v = own.vehicle
            if not v:
                continue
            ev_count = db.query(Evidence).filter(Evidence.vehicle_id == v.id).count()
            verified_count = db.query(Evidence).filter(Evidence.vehicle_id == v.id, Evidence.verification_status == 'VERIFIED').count()
            alerts_count = db.query(Alert).filter(Alert.vehicle_id == v.id, Alert.is_resolved == False).count()
            timeline_count = db.query(VehicleTimeline).filter(VehicleTimeline.vehicle_id == v.id).count()

            coverage = min(100.0, round((timeline_count * 15.0) + (verified_count * 10.0), 1))
            results.append({
                'id': v.id,
                'vin': v.vin,
                'registration_number': v.registration_number,
                'make': v.make,
                'model': v.model,
                'variant': v.variant,
                'year': v.year,
                'fuel_type': v.fuel_type,
                'transmission': v.transmission,
                'current_odometer': v.current_odometer,
                'ownership_status': v.ownership_status,
                'history_coverage_pct': coverage,
                'verified_evidence_count': verified_count,
                'evidence_count': ev_count,
                'open_alerts_count': alerts_count,
                'updated_at': v.updated_at
            })
        return results
