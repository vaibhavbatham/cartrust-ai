import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_lookup_canonical_honda_city():
    res = client.get('/api/v1/vehicles?query=DEMO-VIN-HC-2019-001')
    assert res.status_code == 200
    vehicles = res.json()
    assert len(vehicles) == 1
    v = vehicles[0]
    assert v['vin'] == 'DEMO-VIN-HC-2019-001'
    assert v['make'] == 'Honda'
    assert v['model'] == 'City'
    assert v['year'] == 2019
    assert v['current_odometer'] == 74100

def test_vehicle_timeline_provenance():
    v_res = client.get('/api/v1/vehicles?query=DEMO-VIN-HC-2019-001')
    v_id = v_res.json()[0]['id']
    tl_res = client.get(f'/api/v1/vehicles/{v_id}/timeline')
    assert tl_res.status_code == 200
    timeline = tl_res.json()
    assert len(timeline) >= 7

    # Chronological ordering check
    dates = [e['event_date'] for e in timeline]
    assert dates == sorted(dates)

    # Check verified status present on official service milestones
    srv_events = [e for e in timeline if e['event_type'] == 'SERVICE']
    assert len(srv_events) >= 2
    assert all(e['verification_status'] == 'VERIFIED' for e in srv_events)

def test_lookup_nonexistent_vehicle():
    res = client.get('/api/v1/vehicles?query=NON-EXISTENT-VIN-9999')
    assert res.status_code == 200
    assert res.json() == []

def test_lookup_by_registration_plate_with_spaces_and_lowercase():
    # Test with spaces and lowercase
    res = client.get('/api/v1/vehicles?query=mp 04 ab 1234')
    assert res.status_code == 200
    vehicles = res.json()
    assert len(vehicles) == 1
    assert vehicles[0]['vin'] == 'DEMO-VIN-HC-2019-001'
    assert vehicles[0]['registration_number'] == 'MP04AB1234'

    # Test direct lookup by plate in path
    detail_res = client.get('/api/v1/vehicles/MP 04 AB 1234')
    assert detail_res.status_code == 200
    assert detail_res.json()['registration_number'] == 'MP04AB1234'

def test_validate_plate_endpoint():
    # Existing plate
    res = client.get('/api/v1/vehicles/validate-plate/MP 04 AB 1234')
    assert res.status_code == 200
    data = res.json()
    assert data['is_valid'] is True
    assert data['exists'] is True
    assert data['normalized_plate'] == 'MP04AB1234'

    # Valid non-existent plate
    import random
    rand_num = random.randint(1000, 9999)
    test_nonexistent = f"KL07ZZ{rand_num}"
    res2 = client.get(f'/api/v1/vehicles/validate-plate/{test_nonexistent}')
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2['is_valid'] is True
    assert data2['exists'] is False
    assert data2['normalized_plate'] == test_nonexistent

    # Invalid plate
    res3 = client.get('/api/v1/vehicles/validate-plate/XYZ-NOT-A-PLATE')
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3['is_valid'] is False

def test_add_new_vehicle_and_prevent_duplicate():
    import random
    import string
    series = ''.join(random.choices(string.ascii_uppercase, k=2))
    test_plate = f"MH 12 {series} 5678"
    norm_plate = f"MH12{series}5678"

    payload = {
        'registration_number': test_plate,
        'make': 'Hyundai',
        'model': 'Creta',
        'variant': 'SX Opt',
        'year': 2022,
        'fuel_type': 'Petrol',
        'transmission': 'Automatic',
        'current_odometer': 32000,
        'location': 'Pune, Maharashtra',
        'price': 1250000.0
    }
    # First creation should succeed
    res = client.post('/api/v1/vehicles', json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created['registration_number'] == norm_plate
    assert created['make'] == 'Hyundai'

    # Searching by newly added plate should find it immediately
    search_res = client.get(f'/api/v1/vehicles?query={norm_plate.lower()}')
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert search_res.json()[0]['registration_number'] == norm_plate

    # Duplicate creation with different spacing should fail with 400
    dup_res = client.post('/api/v1/vehicles', json=payload)
    assert dup_res.status_code == 400
    assert 'already registered' in dup_res.json()['detail']
