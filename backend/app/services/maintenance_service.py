import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.models.event import MaintenanceEvent

MANUFACTURER_SCHEDULE = [
    {'component': 'Engine Oil & Filter', 'interval_km': 10000, 'interval_months': 12},
    {'component': 'Brake System (Pads & Fluid)', 'interval_km': 30000, 'interval_months': 24},
    {'component': 'Air & Cabin Filter', 'interval_km': 20000, 'interval_months': 24},
    {'component': 'Transmission Fluid', 'interval_km': 40000, 'interval_months': 36},
    {'component': 'Engine Coolant', 'interval_km': 50000, 'interval_months': 48},
    {'component': 'Spark Plugs', 'interval_km': 40000, 'interval_months': 36},
    {'component': 'Tires & Wheel Alignment', 'interval_km': 10000, 'interval_months': 12}
]

class MaintenanceService:
    @staticmethod
    def get_maintenance_intelligence(db: Session, vehicle_id: str) -> List[Dict[str, Any]]:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            return []

        results = []
        today = datetime.date.today()

        for item in MANUFACTURER_SCHEDULE:
            comp_name = item['component']
            keyword = comp_name.split()[0].lower()
            last_event = db.query(MaintenanceEvent).filter(
                MaintenanceEvent.vehicle_id == vehicle_id,
                MaintenanceEvent.component.ilike(f'%{keyword}%')
            ).order_by(MaintenanceEvent.event_date.desc()).first()

            if last_event:
                dist_since = vehicle.current_odometer - last_event.odometer_reading
                months_since = (today.year - last_event.event_date.year) * 12 + (today.month - last_event.event_date.month)

                if dist_since >= item['interval_km'] or months_since >= item['interval_months']:
                    status = 'OVERDUE'
                elif dist_since >= item['interval_km'] - 2000 or months_since >= item['interval_months'] - 2:
                    status = 'DUE_SOON'
                else:
                    status = 'OK'

                results.append({
                    'component': comp_name,
                    'recommended_interval_km': item['interval_km'],
                    'recommended_interval_months': item['interval_months'],
                    'last_serviced_date': last_event.event_date,
                    'last_serviced_odometer': last_event.odometer_reading,
                    'distance_since_service': max(0, dist_since),
                    'months_since_service': max(0, months_since),
                    'status': status,
                    'confidence': 'REPORTED',
                    'evidence_notes': f'Last reported at {last_event.odometer_reading:,} km on {last_event.event_date} ({last_event.action_taken}). Independent issuer confirmation is unavailable unless backed by verified provider API.'
                })
            else:
                results.append({
                    'component': comp_name,
                    'recommended_interval_km': item['interval_km'],
                    'recommended_interval_months': item['interval_months'],
                    'last_serviced_date': None,
                    'last_serviced_odometer': None,
                    'distance_since_service': None,
                    'months_since_service': None,
                    'status': 'NO_EVIDENCE',
                    'confidence': 'UNKNOWN',
                    'evidence_notes': 'No recorded service evidence found in available history for this component.'
                })

        return results
