import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.models.evidence import Evidence
from app.models.event import InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.quality import Alert, DataQualityIssue
from app.services.odometer_service import OdometerService

class IntelligenceSummaryService:
    @staticmethod
    def get_summary(db: Session, vehicle_id: str) -> Dict[str, Any]:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise ValueError('Vehicle not found')

        odo_analysis = OdometerService.analyze_odometer(db, vehicle_id)

        total_ev = db.query(Evidence).filter(Evidence.vehicle_id == vehicle_id).count()
        verified_ev = db.query(Evidence).filter(Evidence.vehicle_id == vehicle_id, Evidence.verification_status == 'VERIFIED').count()
        partially_ev = db.query(Evidence).filter(Evidence.vehicle_id == vehicle_id, Evidence.verification_status == 'PARTIALLY_VERIFIED').count()

        claims = db.query(InsuranceEvent).filter(InsuranceEvent.vehicle_id == vehicle_id).all()
        verified_claims_count = len(claims)
        accident_summary = f'{verified_claims_count} verified simulated insurance claim(s) on record' if verified_claims_count > 0 else 'No insurance accident claims reported on record'

        dq_issues_count = db.query(DataQualityIssue).filter(DataQualityIssue.vehicle_id == vehicle_id, DataQualityIssue.status == 'OPEN').count()
        open_alerts_count = db.query(Alert).filter(Alert.vehicle_id == vehicle_id, Alert.is_resolved == False).count()

        timeline_count = db.query(VehicleTimeline).filter(VehicleTimeline.vehicle_id == vehicle_id).count()
        coverage_pct = min(100.0, round((timeline_count * 12.0) + (verified_ev * 8.0), 1))

        if verified_ev >= 3:
            maint_rating = 'HIGH'
        elif verified_ev >= 1 or partially_ev >= 1:
            maint_rating = 'MODERATE'
        elif total_ev > 0:
            maint_rating = 'LOW'
        else:
            maint_rating = 'NONE'

        record_anomaly = odo_analysis['rollback_detected'] or dq_issues_count > 1
        anomaly_score = 0.85 if odo_analysis['rollback_detected'] else (0.4 if dq_issues_count > 0 else 0.1)

        cur_year = datetime.date.today().year
        age = max(1, cur_year - vehicle.year)
        risk_score = min(0.95, round(0.1 + (age * 0.04) + (vehicle.current_odometer / 200000.0 * 0.4) + (0.3 if odo_analysis['rollback_detected'] else 0.0), 2))
        risk_level = 'HIGH' if risk_score > 0.6 else ('MEDIUM' if risk_score > 0.35 else 'LOW')

        return {
            'vehicle_id': vehicle.id,
            'vin': vehicle.vin,
            'history_coverage_pct': coverage_pct,
            'maintenance_evidence_rating': maint_rating,
            'odometer_consistency_status': odo_analysis['status'],
            'accident_summary': accident_summary,
            'verified_claims_count': verified_claims_count,
            'data_conflicts_count': dq_issues_count,
            'open_alerts_count': open_alerts_count,
            'ml_maintenance_risk_score': risk_score,
            'ml_maintenance_risk_level': risk_level,
            'record_anomaly_score': anomaly_score,
            'record_anomaly_flag': record_anomaly,
            'category_breakdown': {
                'total_evidence': total_ev,
                'verified_evidence': verified_ev,
                'partially_verified_evidence': partially_ev,
                'unverified_evidence': total_ev - verified_ev - partially_ev,
                'odometer_readings_count': odo_analysis['total_readings'],
                'odometer_explanation': odo_analysis['explanation']
            }
        }
