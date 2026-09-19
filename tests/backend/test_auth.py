import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    res = client.post('/api/v1/auth/login', json={
        'email': 'customer@cartrust.demo',
        'password': 'DemoPassword123!'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'access_token' in data
    assert 'refresh_token' in data
    assert data['email'] == 'customer@cartrust.demo'
    assert 'CUSTOMER' in data['roles']

def test_login_invalid_password():
    res = client.post('/api/v1/auth/login', json={
        'email': 'customer@cartrust.demo',
        'password': 'WrongPassword999!'
    })
    assert res.status_code == 401

def test_token_refresh_rotation():
    # Login first
    login_res = client.post('/api/v1/auth/login', json={
        'email': 'customer@cartrust.demo',
        'password': 'DemoPassword123!'
    })
    refresh_token = login_res.json()['refresh_token']

    # Refresh
    ref_res = client.post('/api/v1/auth/refresh', json={'refresh_token': refresh_token})
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    assert 'access_token' in new_data
    assert new_data['refresh_token'] != refresh_token

    # Reusing old refresh token must fail (Token rotation & revocation)
    old_res = client.post('/api/v1/auth/refresh', json={'refresh_token': refresh_token})
    assert old_res.status_code == 401

def test_google_login_new_user():
    res = client.post('/api/v1/auth/google', json={
        'email': 'newgoogleuser@example.demo',
        'first_name': 'Amit',
        'last_name': 'Patel',
        'google_id': 'goog_sub_987654321',
        'avatar_url': 'https://example.com/avatar.jpg'
    })
    assert res.status_code == 200
    data = res.json()
    assert 'access_token' in data
    assert 'refresh_token' in data
    assert data['email'] == 'newgoogleuser@example.demo'
    assert 'CUSTOMER' in data['roles']
    assert data['email_verified'] is True

def test_google_login_existing_user():
    res = client.post('/api/v1/auth/google', json={
        'email': 'customer@cartrust.demo',
        'first_name': 'Rahul',
        'last_name': 'Sharma',
        'google_id': 'goog_sub_123456789'
    })
    assert res.status_code == 200
    data = res.json()
    assert data['email'] == 'customer@cartrust.demo'
    assert 'access_token' in data
