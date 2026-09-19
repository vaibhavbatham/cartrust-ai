import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_invoice_upload_ocr_review_and_download_flow():
    # 1. Login as canonical demo user
    login_res = client.post('/api/v1/auth/login', json={
        'email': 'customer@cartrust.demo',
        'password': 'DemoPassword123!'
    })
    assert login_res.status_code == 200
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Get canonical vehicle (MP04AB1234 / Honda Civic)
    v_res = client.get('/api/v1/vehicles/MP04AB1234')
    assert v_res.status_code == 200
    vehicle = v_res.json()
    v_id = vehicle['id']

    # 3. Read generated sample invoice
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'demo_files', 'INV-10245.pdf')
    assert os.path.exists(sample_path), f"Sample invoice not found at {sample_path}"
    with open(sample_path, 'rb') as f:
        file_bytes = f.read()

    # 4. Upload invoice
    upload_res = client.post(
        f'/api/v1/vehicles/{v_id}/documents',
        headers=headers,
        files={'file': ('INV-10245.pdf', file_bytes, 'application/pdf')},
        data={'category': 'REPAIR'}
    )
    assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
    upload_data = upload_res.json()
    assert upload_data['status'] == 'NEEDS_REVIEW'
    inv_id = upload_data['invoice_id']
    doc_id = upload_data['document_id']

    extracted = upload_data['extracted_data']
    assert 'INV-10245' in extracted['invoice_number']
    assert 'XYZ Auto Service' in extracted['vendor_name']
    assert extracted['total_amount'] == 13570.0
    assert extracted['odometer_reading'] == 52340

    # 5. Review & Confirm Invoice
    review_payload = {
        'invoice_number': extracted['invoice_number'],
        'vendor_name': extracted['vendor_name'],
        'customer_name': 'ABC Motors',
        'category': 'REPAIR',
        'work_performed': 'Brake Pad Replacement & Synthetic Oil Service',
        'invoice_date': extracted['invoice_date'],
        'odometer_reading': extracted['odometer_reading'],
        'subtotal': extracted['subtotal'],
        'tax': extracted['tax'],
        'total_amount': extracted['total_amount'],
        'items': extracted['items'],
        'notes': 'Verified against printed workshop invoice.'
    }
    review_res = client.put(
        f'/api/v1/invoices/{inv_id}/review',
        headers=headers,
        json=review_payload
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data['verification_status'] == 'VERIFIED'
    assert review_data['record_source'] == 'VERIFIED_DOCUMENT'

    # 6. Verify Service History
    svc_res = client.get(f'/api/v1/vehicles/{v_id}/service-history')
    assert svc_res.status_code == 200
    svc_data = svc_res.json()
    assert svc_data['verified_expenditure'] >= 13570.0
    matching = [r for r in svc_data['records'] if r['invoice_id'] == inv_id]
    assert len(matching) == 1
    assert matching[0]['verification_status'] == 'VERIFIED'
    assert matching[0]['document_id'] == doc_id
    assert matching[0]['document_download_url'] == f'/api/v1/documents/{doc_id}/file'

    # 7. Test Download Original Document
    doc_file_res = client.get(f'/api/v1/documents/{doc_id}/file')
    assert doc_file_res.status_code == 200
    assert doc_file_res.headers['content-type'] == 'application/pdf'
    assert len(doc_file_res.content) == len(file_bytes)

    # 8. Test Main Vehicle Intelligence PDF Report includes service & invoice history
    pdf_res = client.get(f'/api/v1/reports/{v_id}/pdf')
    assert pdf_res.status_code == 200
    assert pdf_res.headers['content-type'] == 'application/pdf'
    assert len(pdf_res.content) > 1000

def test_manual_service_record_flow():
    login_res = client.post('/api/v1/auth/login', json={
        'email': 'customer@cartrust.demo',
        'password': 'DemoPassword123!'
    })
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    v_res = client.get('/api/v1/vehicles/DL01XY5678')
    v_id = v_res.json()['id']

    manual_payload = {
        'service_date': '2026-08-10',
        'service_center': 'Neighborhood Garage',
        'service_type': 'Tire Rotation',
        'work_performed': '4-Wheel Rotation & Balancing',
        'odometer_reading': 50000,
        'total_amount': 1200.0,
        'notes': 'Paid cash, lost paper receipt'
    }
    res = client.post(f'/api/v1/vehicles/{v_id}/invoices/manual', headers=headers, json=manual_payload)
    assert res.status_code == 200
    assert res.json()['record_source'] == 'USER_PROVIDED'
    assert res.json()['status'] == 'UNVERIFIED'
