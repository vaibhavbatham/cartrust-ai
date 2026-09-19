import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rag_clutch_no_evidence_honesty():
    # Prompt Rule: The platform must NEVER pretend it knows something that the available evidence cannot establish.
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'DEMO-VIN-HC-2019-001',
        'query': 'Has this car\'s clutch been replaced?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'I found no available evidence' in data['answer']
    assert data['uncertainty_level'] == 'UNKNOWN'

def test_rag_brakes_grounded_answer():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'DEMO-VIN-HC-2019-001',
        'query': 'Has the brake system been serviced?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'brake' in data['answer'].lower()
    assert '72,300' in data['answer']
    assert len(data['grounded_evidence']) >= 1

def test_rag_accident_grounded_answer():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'DEMO-VIN-HC-2019-001',
        'query': 'Was this car in an accident?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'insurance' in data['answer'].lower()
    assert 'front' in data['answer'].lower()
