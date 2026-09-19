import uuid
import re
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.vehicle import Vehicle, VehicleOwnership, VehicleSourceMapping, OdometerReading
from app.models.event import ServiceEvent, MaintenanceEvent, InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.evidence import Evidence, Document, Invoice
from app.models.quality import Alert, DataQualityIssue
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, normalize_plate, validate_indian_plate

class VehicleService:
    @staticmethod
    def lookup_vehicle(db: Session, query_str: str, include_deleted: bool = False) -> Optional[Vehicle]:
        if not query_str or not query_str.strip():
            return None

        raw = query_str.strip()
        q_upper = raw.upper()
        norm = normalize_plate(raw)

        # 1. Direct Primary Key ID
        v = db.query(Vehicle).filter(Vehicle.id == raw).first()
        if v and (include_deleted or not v.is_deleted):
            return v

        # 2. Exact or Normalized Registration Number
        if norm:
            v = db.query(Vehicle).filter(Vehicle.registration_number == norm).first()
            if v and (include_deleted or not v.is_deleted):
                return v
            v = db.query(Vehicle).filter(
                func.replace(func.replace(Vehicle.registration_number, '-', ''), ' ', '') == norm
            ).first()
            if v and (include_deleted or not v.is_deleted):
                return v

        # 3. Direct VIN match
        v = db.query(Vehicle).filter(Vehicle.vin == q_upper).first()
        if v and (include_deleted or not v.is_deleted):
            return v
        if norm:
            v = db.query(Vehicle).filter(
                func.replace(func.replace(Vehicle.vin, '-', ''), ' ', '') == norm
            ).first()
            if v and (include_deleted or not v.is_deleted):
                return v

        # 4. Golden vehicle ID or mapped source ID
        v = db.query(Vehicle).filter(Vehicle.golden_vehicle_id == q_upper).first()
        if v and (include_deleted or not v.is_deleted):
            return v
        mapping = db.query(VehicleSourceMapping).filter(VehicleSourceMapping.source_vehicle_id == q_upper).first()
        if mapping:
            v = db.query(Vehicle).filter(Vehicle.golden_vehicle_id == mapping.golden_vehicle_id).first()
            if v and (include_deleted or not v.is_deleted):
                return v

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
                'message': f"Invalid Indian registration format '{raw_plate}'. Expected format e.g. MP04AB1234 or DL01AB1234."
            }

        existing = db.query(Vehicle).filter(
            func.replace(func.replace(Vehicle.registration_number, '-', ''), ' ', '') == norm,
            Vehicle.is_deleted == False
        ).first()

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
        raw_reg = data.registration_number
        norm_reg = normalize_plate(raw_reg)
        if not norm_reg:
            raise ValueError("Registration / number plate is required.")

        if not validate_indian_plate(norm_reg):
            raise ValueError(
                f"Invalid Indian vehicle registration format '{raw_reg}'. "
                "Supported formats include MP04AB1234, DL01AB1234, MH12CD5678, or Bharat series 22BH1234AA."
            )

        existing_reg = db.query(Vehicle).filter(
            func.replace(func.replace(Vehicle.registration_number, '-', ''), ' ', '') == norm_reg,
            Vehicle.is_deleted == False
        ).first()
        if existing_reg:
            raise ValueError(
                f"Vehicle with registration number '{norm_reg}' is already registered in the system ({existing_reg.make} {existing_reg.model})."
            )

        if data.vin and data.vin.strip():
            vin = data.vin.strip().upper()
            existing_vin = db.query(Vehicle).filter(Vehicle.vin == vin, Vehicle.is_deleted == False).first()
            if existing_vin:
                raise ValueError(f"Vehicle with VIN '{vin}' already exists in the system.")
        else:
            vin = f"CT-IND-{norm_reg}-{uuid.uuid4().hex[:6].upper()}"

        golden_id = f'GOLDEN-{norm_reg}'
        now = datetime.datetime.utcnow()
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
            engine_capacity=data.engine_capacity or getattr(data, 'engine_capacity', '1498 cc'),
            engine_type=data.engine_type or getattr(data, 'engine_type', None),
            seating_capacity=data.seating_capacity or 5,
            color=data.color or getattr(data, 'color', None),
            body_type=data.body_type or getattr(data, 'body_type', 'Sedan'),
            description=data.description or getattr(data, 'description', None),
            ownership_status=data.ownership_status or 'FIRST',
            price=data.price,
            location=data.location.strip() if data.location else None,
            image_url=data.image_url.strip() if data.image_url else None,
            rc_number=data.rc_number.strip() if data.rc_number else f"RC-{norm_reg}",
            golden_vehicle_id=golden_id,
            created_by_id=user_id,
            is_deleted=False,
            is_synthetic=False,
            created_at=now,
            updated_at=now
        )
        db.add(vehicle)
        db.flush()

        if user_id:
            ownership = VehicleOwnership(
                vehicle_id=vehicle.id,
                user_id=user_id,
                start_date=datetime.date.today(),
                is_current=True
            )
            db.add(ownership)

        if data.current_odometer and data.current_odometer > 0:
            odo = OdometerReading(
                vehicle_id=vehicle.id,
                reading=data.current_odometer,
                reading_date=datetime.date.today(),
                source='USER_ONBOARDING'
            )
            db.add(odo)

        timeline_event = VehicleTimeline(
            vehicle_id=vehicle.id,
            event_date=datetime.date.today(),
            event_type='REGISTRATION',
            title=f"Vehicle Registered ({norm_reg})",
            description=f"{data.make} {data.model} ({data.variant or 'Standard'}) onboarded with initial reading of {data.current_odometer or 0} km.",
            odometer=data.current_odometer or 0,
            source='CUSTOMER_REGISTRATION',
            verification_status='VERIFIED',
            confidence_score=0.9
        )
        db.add(timeline_event)

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
    def update_vehicle(db: Session, vehicle_id: str, data: VehicleUpdate, user_id: str) -> Vehicle:
        v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not v or v.is_deleted:
            raise ValueError("Vehicle not found")

        # Strict authorization check
        if v.created_by_id != user_id:
            raise PermissionError("Forbidden: You do not have permission to modify this vehicle. Only the owner who registered it can edit it.")

        # Update ONLY user-editable fields (verified VIN, plate, golden ID are protected)
        if data.price is not None:
            v.price = data.price
        if data.location is not None:
            v.location = data.location.strip() if data.location else None
        if data.image_url is not None:
            v.image_url = data.image_url.strip() if data.image_url else None
        if data.color is not None:
            v.color = data.color.strip() if data.color else None
        if data.description is not None:
            v.description = data.description.strip() if data.description else None
        if data.mileage_efficiency is not None:
            v.mileage_efficiency = data.mileage_efficiency.strip() if data.mileage_efficiency else None
        if data.ownership_status is not None:
            v.ownership_status = data.ownership_status

        # If user provides updated mileage
        if data.current_odometer is not None and data.current_odometer != v.current_odometer:
            v.current_odometer = data.current_odometer
            odo = OdometerReading(
                vehicle_id=v.id,
                reading=data.current_odometer,
                reading_date=datetime.date.today(),
                source='USER_UPDATE'
            )
            db.add(odo)

        v.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(v)
        return v

    @staticmethod
    def delete_vehicle(db: Session, vehicle_id: str, user_id: str) -> bool:
        v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not v or v.is_deleted:
            raise ValueError("Vehicle not found")

        # Strict authorization check
        if v.created_by_id != user_id:
            raise PermissionError("Forbidden: You do not have permission to delete this vehicle. Only the owner who registered it can delete it.")

        # Soft-delete the listing while preserving audit and verified history
        v.is_deleted = True
        v.updated_at = datetime.datetime.utcnow()

        # Deactivate user ownership
        db.query(VehicleOwnership).filter(
            VehicleOwnership.vehicle_id == v.id,
            VehicleOwnership.user_id == user_id
        ).update({'is_current': False})

        # Record timeline event for audit trail
        db.add(VehicleTimeline(
            vehicle_id=v.id,
            event_date=datetime.date.today(),
            event_type='DELETION',
            title='Vehicle Listing Removed',
            description='Owner removed marketplace vehicle listing. Verified historical milestones remain securely archived.',
            odometer=v.current_odometer,
            source='USER_ACTION',
            verification_status='VERIFIED',
            confidence_score=1.0
        ))

        db.commit()
        return True

    @staticmethod
    def get_user_vehicles(db: Session, user_id: str) -> List[Dict[str, Any]]:
        ownerships = db.query(VehicleOwnership).filter(
            VehicleOwnership.user_id == user_id,
            VehicleOwnership.is_current == True
        ).all()
        results = []
        for own in ownerships:
            v = own.vehicle
            if not v or v.is_deleted:
                continue
            ev_count = db.query(Evidence).filter(Evidence.vehicle_id == v.id).count()
            verified_count = db.query(Evidence).filter(Evidence.vehicle_id == v.id, Evidence.verification_status == 'VERIFIED').count()
            alerts_count = db.query(Alert).filter(Alert.vehicle_id == v.id, Alert.is_resolved == False).count()
            timeline_count = db.query(VehicleTimeline).filter(VehicleTimeline.vehicle_id == v.id).count()
            service_count = db.query(ServiceEvent).filter(ServiceEvent.vehicle_id == v.id).count()
            repair_count = db.query(ServiceEvent).filter(
                ServiceEvent.vehicle_id == v.id,
                or_(ServiceEvent.service_type.ilike('%repair%'), ServiceEvent.work_performed.ilike('%repair%'))
            ).count()
            inv_count = db.query(Invoice).filter(Invoice.vehicle_id == v.id, Invoice.verification_status.in_(['VERIFIED', 'DOCUMENT_CHECKED'])).count()
            claims_count = db.query(InsuranceEvent).filter(InsuranceEvent.vehicle_id == v.id).count()

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
                'engine_details': v.engine_details,
                'engine_capacity': v.engine_capacity,
                'engine_type': v.engine_type,
                'seating_capacity': v.seating_capacity or 5,
                'color': v.color,
                'body_type': v.body_type,
                'description': v.description,
                'mileage_efficiency': v.mileage_efficiency,
                'current_odometer': v.current_odometer,
                'ownership_status': v.ownership_status,
                'price': v.price,
                'location': v.location,
                'image_url': v.image_url,
                'rc_number': v.rc_number,
                'created_by_id': v.created_by_id,
                'can_edit': (v.created_by_id == user_id),
                'can_delete': (v.created_by_id == user_id),
                'is_synthetic': bool(v.is_synthetic),
                'history_coverage_pct': coverage,
                'verified_evidence_count': verified_count,
                'evidence_count': ev_count,
                'service_records_count': service_count,
                'repair_records_count': repair_count,
                'verified_invoices_count': inv_count,
                'claims_count': claims_count,
                'open_alerts_count': alerts_count,
                'created_at': v.created_at or datetime.datetime.utcnow(),
                'updated_at': v.updated_at or datetime.datetime.utcnow()
            })
        return results
