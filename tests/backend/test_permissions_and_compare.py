import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def create_authenticated_user(email_prefix: str):
    uid = str(uuid.uuid4())[:8]
    email = f"{email_prefix}_{uid}@cartrust.demo"
    password = "SecurePassword123!"
    reg_res = client.post('/api/v1/auth/register', json={
        'email': email,
        'password': password,
        'confirm_password': password,
        'first_name': 'Test',
        'last_name': 'User',
        'phone': '9876543210',
        'city': 'Bhopal',
        'state': 'Madhya Pradesh',
        'role': 'CUSTOMER',
        'terms_accepted': True
    })
    assert reg_res.status_code == 201, reg_res.text

    login_res = client.post('/api/v1/auth/login', json={
        'email': email,
        'password': password
    })
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()['access_token']
    return email, token

def test_diverse_demo_fleet_exists():
    """Verify that all 5 diverse demo vehicles exist in the fleet."""
    res = client.get('/api/v1/vehicles')
    assert res.status_code == 200
    fleet = res.json()
    makes = {v['make'] for v in fleet}
    assert 'Honda' in makes
    assert 'Maruti Suzuki' in makes
    assert 'Hyundai' in makes
    assert 'Tata Motors' in makes
    assert 'Toyota' in makes

def test_compare_endpoint_2_vehicles():
    """Test side-by-side comparison for 2 vehicles."""
    res = client.get('/api/v1/vehicles')
    fleet = res.json()
    assert len(fleet) >= 2
    id1 = fleet[0]['id']
    id2 = fleet[1]['id']

    # Test POST /compare
    post_res = client.post('/api/v1/compare', json={'vehicle_ids': [id1, id2]})
    assert post_res.status_code == 200
    data = post_res.json()
    assert 'comparison' in data
    assert len(data['comparison']) == 2
    assert 'neutral_analysis' in data
    assert len(data['neutral_analysis']) > 0

    # Test GET /compare?vehicles=id1,id2
    get_res = client.get(f'/api/v1/compare?vehicles={id1},{id2}')
    assert get_res.status_code == 200
    data2 = get_res.json()
    assert len(data2['comparison']) == 2
    assert 'highlights' in data2

def test_compare_endpoint_3_vehicles():
    """Test side-by-side comparison for 3 vehicles."""
    res = client.get('/api/v1/vehicles')
    fleet = res.json()
    assert len(fleet) >= 3
    ids = [fleet[0]['id'], fleet[1]['id'], fleet[2]['id']]

    res_cmp = client.post('/api/v1/compare', json={'vehicle_ids': ids})
    assert res_cmp.status_code == 200
    data = res_cmp.json()
    assert len(data['comparison']) == 3

def test_customer_permissions_edit_and_delete():
    """
    Test customer ownership authorization:
    - User A registers and creates Vehicle A
    - User A edits Vehicle A -> 200 OK
    - User B attempts to edit Vehicle A -> 403 Forbidden
    - User B attempts to delete Vehicle A -> 403 Forbidden
    - User A deletes Vehicle A -> 200 OK (soft-deleted)
    """
    # 1. Register User A and User B
    email_a, token_a = create_authenticated_user('owner_a')
    email_b, token_b = create_authenticated_user('owner_b')

    headers_a = {'Authorization': f'Bearer {token_a}'}
    headers_b = {'Authorization': f'Bearer {token_b}'}

    # 2. User A creates Vehicle A
    import random
    reg_number = f"MP04TX{random.randint(1000, 9999)}"
    vin = f"TEST-VIN-PERM-{uuid.uuid4().hex[:8].upper()}"

    create_res = client.post('/api/v1/vehicles', json={
        'vin': vin,
        'registration_number': reg_number,
        'make': 'Tata Motors',
        'model': 'Altroz',
        'variant': 'XZ Plus',
        'year': 2022,
        'fuel_type': 'Petrol',
        'transmission': 'Manual',
        'current_odometer': 18000,
        'price': 720000.0,
        'location': 'Bhopal, Madhya Pradesh',
        'color': 'Cosmo Dark',
        'engine_capacity': '1199 cc',
        'seating_capacity': 5
    }, headers=headers_a)
    assert create_res.status_code == 201, create_res.text
    vehicle_a = create_res.json()
    v_id = vehicle_a['id']
    assert vehicle_a['can_edit'] is True
    assert vehicle_a['can_delete'] is True

    # 3. User A updates Vehicle A -> 200 OK
    edit_res = client.put(f'/api/v1/vehicles/{v_id}', json={
        'price': 750000.0,
        'location': 'Indore, Madhya Pradesh',
        'color': 'Downtown Red',
        'current_odometer': 19500
    }, headers=headers_a)
    assert edit_res.status_code == 200, edit_res.text
    updated = edit_res.json()
    assert updated['price'] == 750000.0
    assert updated['location'] == 'Indore, Madhya Pradesh'
    assert updated['color'] == 'Downtown Red'
    assert updated['current_odometer'] == 19500
    # Ensure VIN and registration remained immutable
    assert updated['vin'] == vin
    assert updated['registration_number'] == reg_number

    # 4. User B attempts to edit Vehicle A -> 403 Forbidden!
    b_edit_res = client.put(f'/api/v1/vehicles/{v_id}', json={
        'price': 100000.0,
        'location': 'Malicious Edit City'
    }, headers=headers_b)
    assert b_edit_res.status_code == 403, f"Expected 403 Forbidden, got {b_edit_res.status_code}: {b_edit_res.text}"
    assert "You do not have permission to modify this vehicle" in b_edit_res.json()['detail']

    # 5. User B attempts to delete Vehicle A -> 403 Forbidden!
    b_del_res = client.delete(f'/api/v1/vehicles/{v_id}', headers=headers_b)
    assert b_del_res.status_code == 403, f"Expected 403 Forbidden, got {b_del_res.status_code}: {b_del_res.text}"
    assert "You do not have permission to delete this vehicle" in b_del_res.json()['detail']

    # 6. User A deletes Vehicle A -> 200 OK (soft-deleted)
    del_res = client.delete(f'/api/v1/vehicles/{v_id}', headers=headers_a)
    assert del_res.status_code == 200, del_res.text
    assert del_res.json()['success'] is True

    # 7. Verify soft-deleted vehicle is no longer retrievable via public lookup
    get_res = client.get(f'/api/v1/vehicles/{v_id}')
    assert get_res.status_code == 404
