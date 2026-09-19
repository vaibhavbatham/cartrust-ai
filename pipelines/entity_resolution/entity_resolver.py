import re
from typing import Dict, Any, Tuple

class EntityResolver:
    @staticmethod
    def resolve_vehicle(record: Dict[str, Any]) -> Tuple[str, str, float]:
        vin = (record.get('vin') or '').strip().upper()
        reg = (record.get('registration_number') or '').strip().upper()
        reg_clean = re.sub(r'[^A-Z0-9]', '', reg)

        if vin and len(vin) >= 8:
            return f'GOLDEN-{vin}', 'EXACT_VIN', 1.0
        elif reg_clean and len(reg_clean) >= 6:
            return f'GOLDEN-REG-{reg_clean}', 'NORMALIZED_REGISTRATION', 0.85
        else:
            make = (record.get('make') or 'UNKNOWN').upper()
            model = (record.get('model') or 'UNKNOWN').upper()
            year = record.get('year', 0)
            return f'CANDIDATE-{make}-{model}-{year}', 'FUZZY_MAKE_MODEL_YEAR', 0.45
