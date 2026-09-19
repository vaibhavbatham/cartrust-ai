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
    res = client.get('/api/v1/vehicles?query=NON-EXISTENT-VIN-999')
    assert res.status_code == 200
    assert len(res.json()) == 0
