import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_odometer_consistent_vehicle():
    v_res = client.get('/api/v1/vehicles?query=DEMO-VIN-HC-2019-001')
    v_id = v_res.json()[0]['id']
    odo_res = client.get(f'/api/v1/vehicles/{v_id}/odometer')
    assert odo_res.status_code == 200
    data = odo_res.json()
    assert data['rollback_detected'] is False
    assert data['status'] == 'CONSISTENT'
    assert len(data['anomalies']) == 0

def test_odometer_rollback_detection():
    # Canonical Swift with 2024: 62k -> 2025: 78k -> 2026: 54k!
    v_res = client.get('/api/v1/vehicles?query=DEMO-VIN-SW-2020-002')
    v_id = v_res.json()[0]['id']
    odo_res = client.get(f'/api/v1/vehicles/{v_id}/odometer')
    assert odo_res.status_code == 200
    data = odo_res.json()
    assert data['rollback_detected'] is True
    assert data['status'] == 'ANOMALY_DETECTED'
    assert len(data['anomalies']) >= 1
    anomaly = data['anomalies'][0]
    assert anomaly['type'] == 'ODOMETER_ROLLBACK_SUSPECTED'
    assert anomaly['previous_reading'] == 78000
    assert anomaly['current_reading'] == 54000
    assert anomaly['difference'] == 24000
