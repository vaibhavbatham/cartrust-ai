import uuid
import re
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.vehicle import Vehicle, VehicleOwnership, VehicleSourceMapping, OdometerReading
from app.models.event import ServiceEvent, MaintenanceEvent, InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.evidence import Evidence, Document
from app.models.quality import Alert, DataQualityIssue
from app.schemas.vehicle import VehicleCreate, normalize_plate, validate_indian_plate

class VehicleService:
    @staticmethod
    def lookup_vehicle(db: Session, query_str: str) -> Optional[Vehicle]:
        if not query_str or not query_str.strip():
            return None

        raw = query_str.strip()
        q_upper = raw.upper()
        norm = normalize_plate(raw)

        # 1. Direct Primary Key ID
        v = db.query(Vehicle).filter(Vehicle.id == raw).first()
        if v:
            return v

        # 2. Exact or Normalized Registration Number
        if norm:
            v = db.query(Vehicle).filter(Vehicle.registration_number == norm).first()
            if v:
                return v
            # Match DB plates that might contain hyphens or spaces
            v = db.query(Vehicle).filter(
                func.replace(func.replace(Vehicle.registration_number, '-', ''), ' ', '') == norm
            ).first()
            if v:
                return v

        # 3. Direct VIN match
        v = db.query(Vehicle).filter(Vehicle.vin == q_upper).first()
        if v:
            return v
        if norm:
            v = db.query(Vehicle).filter(
                func.replace(func.replace(Vehicle.vin, '-', ''), ' ', '') == norm
            ).first()
            if v:
                return v

        # 4. Golden vehicle ID or mapped source ID
        v = db.query(Vehicle).filter(Vehicle.golden_vehicle_id == q_upper).first()
        if v:
            return v
        mapping = db.query(VehicleSourceMapping).filter(VehicleSourceMapping.source_vehicle_id == q_upper).first()
        if mapping:
            return db.query(Vehicle).filter(Vehicle.golden_vehicle_id == mapping.golden_vehicle_id).first()

        return None

    @staticmethod
    def get_vehicle_by_id(db: Session, identifier: str) -> Optional[Vehicle]:
        return VehicleService.lookup_vehicle(db, identifier)

    @staticmethod
    def validate_plate_query(db: Session, raw_plate: str) -> Dict[str, Any]:
        norm = normalize_plate(raw_plate)
        if not norm:
            return {
                'input_plate': raw_plate,
                'normalized_plate': '',
                'is_valid': False,
                'exists': False,
                'message': 'Registration number cannot be empty.'
            }

        is_valid = validate_indian_plate(norm)
        if not is_valid:
            return {
                'input_plate': raw_plate,
                'normalized_plate': norm,
                'is_valid': False,
                'exists': False,
                'message': f"Invalid Indian registration format '{raw_plate}'. Expected format like MP04AB1234, DL01AB1234, or 22BH1234AA."
            }

        existing = VehicleService.lookup_vehicle(db, norm)
        if existing:
            return {
                'input_plate': raw_plate,
                'normalized_plate': norm,
                'is_valid': True,
                'exists': True,
                'message': f"Vehicle is registered in CarTrust ({existing.make} {existing.model}).",
                'vehicle_id': existing.id
            }

        return {
            'input_plate': raw_plate,
            'normalized_plate': norm,
            'is_valid': True,
            'exists': False,
            'message': f"Valid Indian registration plate ({norm}). Ready for onboarding."
        }

    @staticmethod
    def create_vehicle(db: Session, data: VehicleCreate, user_id: Optional[str] = None) -> Vehicle:
        # Validate and normalize registration number
        raw_reg = data.registration_number
        norm_reg = normalize_plate(raw_reg)
        if not norm_reg:
            raise ValueError("Registration / number plate is required.")

        if not validate_indian_plate(norm_reg):
            raise ValueError(
                f"Invalid Indian vehicle registration format '{raw_reg}'. "
                "Supported formats include MP04AB1234, DL01AB1234, MH12CD5678, or Bharat series 22BH1234AA."
            )

        # Check for duplicate registration number
        existing_reg = db.query(Vehicle).filter(
            func.replace(func.replace(Vehicle.registration_number, '-', ''), ' ', '') == norm_reg
        ).first()
        if existing_reg:
            raise ValueError(
                f"Vehicle with registration number '{norm_reg}' is already registered in the system ({existing_reg.make} {existing_reg.model})."
            )

        # Determine VIN (use provided VIN or generate standard CarTrust VIN)
        if data.vin and data.vin.strip():
            vin = data.vin.strip().upper()
            existing_vin = db.query(Vehicle).filter(Vehicle.vin == vin).first()
            if existing_vin:
                raise ValueError(f"Vehicle with VIN '{vin}' already exists in the system.")
        else:
            vin = f"CT-IND-{norm_reg}-{uuid.uuid4().hex[:6].upper()}"

        golden_id = f'GOLDEN-{norm_reg}'
        vehicle = Vehicle(
            vin=vin,
            registration_number=norm_reg,
            make=data.make.strip(),
            model=data.model.strip(),
            variant=data.variant.strip() if data.variant else None,
            year=data.year,
            registration_year=data.registration_year or data.year,
            fuel_type=data.fuel_type,
            transmission=data.transmission,
            mileage_efficiency=data.mileage_efficiency.strip() if data.mileage_efficiency else None,
            current_odometer=data.current_odometer or 0,
            engine_details=data.engine_details.strip() if data.engine_details else None,
            ownership_status=data.ownership_status or 'FIRST',
            price=data.price,
            location=data.location.strip() if data.location else None,
            image_url=data.image_url.strip() if data.image_url else None,
            rc_number=data.rc_number.strip() if data.rc_number else f"RC-{norm_reg}",
            golden_vehicle_id=golden_id,
            created_by_id=user_id
        )
        db.add(vehicle)
        db.flush()

        # Link ownership
        if user_id:
            ownership = VehicleOwnership(
                vehicle_id=vehicle.id,
                user_id=user_id,
                start_date=datetime.date.today(),
                is_current=True
            )
            db.add(ownership)

        # Record initial odometer reading if > 0
        if data.current_odometer and data.current_odometer > 0:
            odo = OdometerReading(
                vehicle_id=vehicle.id,
                reading=data.current_odometer,
                reading_date=datetime.date.today(),
                source='USER_ONBOARDING'
            )
            db.add(odo)

        # Record initial registration timeline milestone
        timeline_event = VehicleTimeline(
            vehicle_id=vehicle.id,
            event_date=datetime.date.today(),
            event_type='REGISTRATION',
            title=f"Vehicle Registered ({norm_reg})",
            description=f"{data.make} {data.model} ({data.variant or 'Standard'}) onboarded with initial reading of {data.current_odometer or 0} km.",
            odometer=data.current_odometer or 0,
            source='USER_ONBOARDING',
            verification_status='DOCUMENT_CHECKED',
            confidence_score=0.90
        )
        db.add(timeline_event)

        # Cross-system mapping
        mapping = VehicleSourceMapping(
            golden_vehicle_id=golden_id,
            source_system='USER_ENTRY',
            source_vehicle_id=norm_reg,
            match_method='EXACT_REGISTRATION',
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
                'registration_year': v.registration_year,
                'fuel_type': v.fuel_type,
                'transmission': v.transmission,
                'mileage_efficiency': v.mileage_efficiency,
                'current_odometer': v.current_odometer,
                'ownership_status': v.ownership_status,
                'price': v.price,
                'location': v.location,
                'image_url': v.image_url,
                'rc_number': v.rc_number,
                'history_coverage_pct': coverage,
                'verified_evidence_count': verified_count,
                'evidence_count': ev_count,
                'open_alerts_count': alerts_count,
                'created_at': getattr(v, 'created_at', None) or datetime.datetime.utcnow(),
                'updated_at': getattr(v, 'updated_at', None) or datetime.datetime.utcnow()
            })
        return results
