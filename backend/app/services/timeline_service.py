from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.event import VehicleTimeline

class TimelineService:
    @staticmethod
    def get_vehicle_timeline(db: Session, vehicle_id: str) -> List[Dict[str, Any]]:
        events = db.query(VehicleTimeline).filter(VehicleTimeline.vehicle_id == vehicle_id).order_by(VehicleTimeline.event_date.asc()).all()
        results = []
        for e in events:
            provenance_desc = e.description
            if e.evidence_ref:
                provenance_desc = f'{e.description or ""} [Evidence: {e.evidence_ref.evidence_type} from {e.evidence_ref.source} ({e.evidence_ref.verification_status})]'

            results.append({
                'id': e.id,
                'vehicle_id': e.vehicle_id,
                'event_date': e.event_date,
                'event_type': e.event_type,
                'title': e.title,
                'description': e.description,
                'odometer': e.odometer,
                'source': e.source,
                'evidence_id': e.evidence_id,
                'verification_status': e.verification_status,
                'confidence_score': e.confidence_score,
                'provenance': provenance_desc
            })
        return results
