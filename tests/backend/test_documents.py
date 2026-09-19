import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_invoice_and_verify_issuer():
    # Login customer
    login_res = client.post('/api/v1/auth/login', json={
        'email': 'customer@cartrust.demo',
        'password': 'DemoPassword123!'
    })
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # Upload PDF
    pdf_path = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/sample-documents/brake_invoice_demo.pdf'
    with open(pdf_path, 'rb') as f:
        file_bytes = f.read()

    upload_res = client.post(
        '/api/v1/vehicles/DEMO-VIN-HC-2019-001/documents',
        files={'file': ('brake_invoice_demo.pdf', file_bytes, 'application/pdf')},
        headers=headers
    )
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    assert 'invoice_id' in doc_data
    assert doc_data['invoice_number'] == 'INV-DEMO-1001'
    assert doc_data['total_amount'] == 8500.0

    # Issuer verification
    inv_id = doc_data['invoice_id']
    verify_res = client.post(f'/api/v1/invoices/{inv_id}/verify-issuer', headers=headers)
    assert verify_res.status_code == 200
    ver_data = verify_res.json()
    assert ver_data['verification_status'] == 'VERIFIED'
    assert ver_data['issuer_found'] is True
    assert ver_data['confidence_score'] >= 0.95
