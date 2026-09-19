import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rag_current_mileage():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'What is the current mileage?'
    })
    assert res.status_code == 200
    data = res.json()
    assert '74,100' in data['answer']
    assert data['uncertainty_level'] == 'KNOWN'
    assert len(data['suggested_questions']) > 0

def test_rag_last_service():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'When was the last service?'
    })
    assert res.status_code == 200
    data = res.json()
    assert '15 September 2026' in data['answer'] or 'September 2026' in data['answer']
    assert 'Service' in data['answer']
    assert any(a['type'] in ['view_service', 'view_invoice'] for a in data['actions'])

def test_rag_last_service_cost():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'How much was spent on the last service?'
    })
    assert res.status_code == 200
    data = res.json()
    assert '13,570' in data['answer']
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_parts_replaced():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'What parts have been replaced?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'Brake' in data['answer'] or 'Oil' in data['answer']
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_brakes_grounded_answer():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'Were the brakes replaced?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'brake' in data['answer'].lower()
    assert 'replacement' in data['answer'].lower() or 'servicing' in data['answer'].lower()
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_clutch_no_evidence_honesty():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'Was the clutch replaced?'
    })
    assert res.status_code == 200
    data = res.json()
    assert "couldn't find a verified clutch" in data['answer'].lower() or "no available evidence" in data['answer'].lower()
    assert data['uncertainty_level'] == 'UNKNOWN'
    assert len(data['suggested_questions']) >= 3

def test_rag_repair_history():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'Show me the repair history.'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'history' in data['answer'].lower()
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_service_history():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'Show me the service history.'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'history' in data['answer'].lower()
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_invoices():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'Show me the invoices.'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'invoice' in data['answer'].lower()
    assert len(data['actions']) > 0
    assert any(a['type'] == 'view_invoice' for a in data['actions'])

def test_rag_repair_cost():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'How much has been spent on repairs?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'expenditure' in data['answer'].lower() or 'spent' in data['answer'].lower()
    assert 'Verified' in data['answer']
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_mileage_2023():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'What was the mileage in 2023?'
    })
    assert res.status_code == 200
    data = res.json()
    assert '51,200' in data['answer']
    assert '2023' in data['answer']

def test_rag_follow_up_2024():
    # Test multi-turn follow-up: "And 2024?" inherits mileage context
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'And 2024?',
        'conversation_history': [
            {'role': 'user', 'content': 'What was the mileage in 2023?'},
            {'role': 'assistant', 'content': 'In 2023, an odometer reading of 51,200 km was recorded.'}
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert '58,100' in data['answer']
    assert '2024' in data['answer']

def test_rag_follow_up_part_switch():
    # Test multi-turn follow-up: "What about brakes?" after clutch
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'What about brakes?',
        'conversation_history': [
            {'role': 'user', 'content': 'Was the clutch replaced?'},
            {'role': 'assistant', 'content': "I couldn't find a verified clutch-replacement record."}
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert 'brake' in data['answer'].lower()
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_accident_grounded():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'Are there any accident records?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'claim' in data['answer'].lower()
    assert 'front' in data['answer'].lower() or '42,500' in data['answer']
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_no_accidents_honesty():
    # DL01XY5678 has 0 accident claims
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'DL01XY5678',
        'query': 'Are there any accident records?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'no reported accident' in data['answer'].lower()
    assert data['uncertainty_level'] == 'UNKNOWN'

def test_rag_vehicle_overview():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP04AB1234',
        'query': 'What information do you have about this vehicle?'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'Honda City' in data['answer']
    assert 'Registration' in data['answer']
    assert 'Stored Evidence Summary' in data['answer']
    assert data['uncertainty_level'] == 'KNOWN'

def test_rag_vehicle_lookup_with_space():
    res = client.post('/api/v1/assistant/query', json={
        'vehicle_id': 'MP 04 AB 1234',
        'query': 'What is the current mileage?'
    })
    assert res.status_code == 200
    data = res.json()
    assert '74,100' in data['answer']
    assert data['vehicle_context'] is not None
    assert data['vehicle_context']['registration_number'] == 'MP04AB1234'

def test_rag_no_repetition_different_answers():
    queries = [
        'What is the current mileage?',
        'When was the last service?',
        'What parts have been replaced?',
        'Are there any accident records?',
        'Show me the invoices.'
    ]
    answers = []
    for q in queries:
        res = client.post('/api/v1/assistant/query', json={
            'vehicle_id': 'MP04AB1234',
            'query': q
        })
        assert res.status_code == 200
        answers.append(res.json()['answer'])

    # Ensure every single answer is completely distinct
    assert len(set(answers)) == len(queries)
    for a in answers:
        assert 'For 2019 Honda City (VIN: DEMO-VIN-HC-2019-001), the platform has recorded' not in a
