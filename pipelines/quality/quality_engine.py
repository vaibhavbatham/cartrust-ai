import datetime
from typing import List, Dict, Any

class DataQualityEngine:
    @staticmethod
    def validate_vehicle_record(record: Dict[str, Any]) -> List[Dict[str, Any]]:
        issues = []
        vin = record.get('vin')
        if not vin or len(vin) < 5:
            issues.append({
                'rule': 'VIN_IDENTIFIER_VALIDITY',
                'severity': 'CRITICAL',
                'description': f'Record has missing or invalid VIN identifier: {vin}'
            })

        odo = record.get('current_odometer', 0)
        if odo is not None and odo < 0:
            issues.append({
                'rule': 'NON_NEGATIVE_MILEAGE',
                'severity': 'CRITICAL',
                'description': f'Negative odometer reading ({odo}) detected on vehicle {vin}'
            })

        year = record.get('year')
        current_year = datetime.date.today().year
        if year and (year < 1980 or year > current_year + 1):
            issues.append({
                'rule': 'CHRONOLOGY_YEAR_BOUNDS',
                'severity': 'HIGH',
                'description': f'Manufacturing year {year} is out of realistic bounds (1980 - {current_year+1})'
            })

        return issues
