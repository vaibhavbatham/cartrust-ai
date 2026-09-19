import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle, OdometerReading
from app.models.quality import Alert, DataQualityIssue

class OdometerService:
    @staticmethod
    def analyze_odometer(db: Session, vehicle_id: str) -> Dict[str, Any]:
        readings = db.query(OdometerReading).filter(
            OdometerReading.vehicle_id == vehicle_id
        ).order_by(OdometerReading.reading_date.asc()).all()

        if len(readings) < 2:
            return {
                'rollback_detected': False,
                'status': 'INSUFFICIENT_DATA',
                'total_readings': len(readings),
                'anomalies': [],
                'explanation': 'Not enough chronological readings available to evaluate odometer consistency.'
            }

        anomalies = []
        rollback_detected = False

        for i in range(1, len(readings)):
            prev = readings[i - 1]
            curr = readings[i]

            if curr.reading < prev.reading:
                rollback_detected = True
                diff = prev.reading - curr.reading
                anomalies.append({
                    'type': 'ODOMETER_ROLLBACK_SUSPECTED',
                    'previous_date': str(prev.reading_date),
                    'previous_reading': prev.reading,
                    'current_date': str(curr.reading_date),
                    'current_reading': curr.reading,
                    'difference': diff,
                    'previous_source': prev.source,
                    'current_source': curr.source,
                    'severity': 'CRITICAL',
                    'description': f'Potential odometer inconsistency detected: mileage decreased by {diff:,} km between {prev.reading_date} ({prev.reading:,} km via {prev.source}) and {curr.reading_date} ({curr.reading:,} km via {curr.source}).'
                })

                curr.is_flagged = True
                curr.flag_reason = f'Mileage decreased by {diff:,} km compared to prior milestone'

                existing_alert = db.query(Alert).filter(
                    Alert.vehicle_id == vehicle_id,
                    Alert.alert_type == 'ODOMETER_ROLLBACK'
                ).first()
                if not existing_alert:
                    alert = Alert(
                        vehicle_id=vehicle_id,
                        alert_type='ODOMETER_ROLLBACK',
                        title='Potential Odometer Inconsistency Detected',
                        message=f'Chronological analysis indicates an unexplained decrease of {diff:,} km from {prev.reading:,} km to {curr.reading:,} km.',
                        severity='CRITICAL',
                        is_resolved=False
                    )
                    db.add(alert)

                existing_dq = db.query(DataQualityIssue).filter(
                    DataQualityIssue.vehicle_id == vehicle_id,
                    DataQualityIssue.rule == 'ODOMETER_CHRONOLOGY'
                ).first()
                if not existing_dq:
                    dq = DataQualityIssue(
                        vehicle_id=vehicle_id,
                        record_id=curr.id,
                        rule='ODOMETER_CHRONOLOGY',
                        severity='CRITICAL',
                        description=f'Odometer rollback of {diff:,} km detected between {prev.reading_date} and {curr.reading_date}',
                        status='OPEN'
                    )
                    db.add(dq)

            days = (curr.reading_date - prev.reading_date).days
            if days > 0:
                km_per_day = (curr.reading - prev.reading) / days
                if km_per_day > 1000:
                    anomalies.append({
                        'type': 'IMPOSSIBLE_TRAVEL_RATE',
                        'previous_date': str(prev.reading_date),
                        'current_date': str(curr.reading_date),
                        'rate_km_per_day': round(km_per_day, 1),
                        'severity': 'HIGH',
                        'description': f'Suspiciously high travel rate of {round(km_per_day, 1)} km/day detected.'
                    })

        db.commit()

        if rollback_detected:
            status = 'ANOMALY_DETECTED'
            explanation = 'Potential odometer inconsistency detected based on available chronological records. Independent mileage verification is advised.'
        else:
            status = 'CONSISTENT'
            explanation = 'Odometer progression across all verified milestones shows a consistent positive trajectory with no rollbacks.'

        return {
            'rollback_detected': rollback_detected,
            'status': status,
            'total_readings': len(readings),
            'anomalies': anomalies,
            'explanation': explanation
        }
