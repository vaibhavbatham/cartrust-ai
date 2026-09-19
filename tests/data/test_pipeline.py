import pytest
from pipelines.quality.quality_engine import DataQualityEngine
from pipelines.entity_resolution.entity_resolver import EntityResolver

def test_data_quality_engine_negative_mileage():
    record = {
        'vin': 'DEMO-TEST-001',
        'current_odometer': -5000,
        'year': 2020
    }
    issues = DataQualityEngine.validate_vehicle_record(record)
    assert any(i['rule'] == 'NON_NEGATIVE_MILEAGE' for i in issues)

def test_data_quality_engine_invalid_vin():
    record = {
        'vin': 'X',
        'current_odometer': 5000,
        'year': 2020
    }
    issues = DataQualityEngine.validate_vehicle_record(record)
    assert any(i['rule'] == 'VIN_IDENTIFIER_VALIDITY' for i in issues)

def test_entity_resolution_exact_vin():
    record = {
        'vin': 'DEMO-VIN-HC-2019-001',
        'registration_number': 'MP04-AB-1234',
        'make': 'Honda',
        'model': 'City',
        'year': 2019
    }
    golden_id, match_method, confidence = EntityResolver.resolve_vehicle(record)
    assert golden_id == 'GOLDEN-DEMO-VIN-HC-2019-001'
    assert match_method == 'EXACT_VIN'
    assert confidence == 1.0

def test_entity_resolution_registration_fallback():
    record = {
        'vin': None,
        'registration_number': 'MP04-AB-1234',
        'make': 'Honda',
        'model': 'City',
        'year': 2019
    }
    golden_id, match_method, confidence = EntityResolver.resolve_vehicle(record)
    assert 'GOLDEN-REG-MP04AB1234' in golden_id
    assert match_method == 'NORMALIZED_REGISTRATION'
    assert confidence == 0.85
