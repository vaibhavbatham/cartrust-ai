from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.models.event import InspectionEvent
from app.services.intelligence_summary_service import IntelligenceSummaryService

class ComparisonService:
    @staticmethod
    def compare_vehicles(db: Session, vehicle_ids: List[str]) -> Dict[str, Any]:
        items = []
        for vid in vehicle_ids[:3]:
            v = db.query(Vehicle).filter(Vehicle.id == vid).first()
            if not v:
                continue
            summary = IntelligenceSummaryService.get_summary(db, vid)
            insp = db.query(InspectionEvent).filter(InspectionEvent.vehicle_id == vid).order_by(InspectionEvent.inspection_date.desc()).first()

            items.append({
                'vehicle_id': v.id,
                'vin': v.vin,
                'make': v.make,
                'model': v.model,
                'year': v.year,
                'mileage': v.current_odometer,
                'history_coverage_pct': summary['history_coverage_pct'],
                'maintenance_evidence_rating': summary['maintenance_evidence_rating'],
                'verified_claims_count': summary['verified_claims_count'],
                'odometer_consistency_status': summary['odometer_consistency_status'],
                'inspection_overall_result': insp.overall_result if insp else 'NO_RECORD',
                'upcoming_maintenance_count': 2 if summary['maintenance_evidence_rating'] in ['LOW', 'NONE'] else 1,
                'data_conflicts_count': summary['data_conflicts_count'],
                'evidence_count': summary['category_breakdown']['total_evidence']
            })

        neutral_analysis = (
            'Side-by-side evidence analysis compares verified milestones, maintenance provenance, and data integrity. '
            'CarTrust does not issue prescriptive purchase endorsements. Buyers should weigh documented service records '
            'against flagged odometer inconsistencies or unverified owner submissions.'
        )

        return {
            'comparison': items,
            'neutral_analysis': neutral_analysis
        }
