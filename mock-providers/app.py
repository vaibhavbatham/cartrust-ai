from fastapi import FastAPI, HTTPException

app = FastAPI(
    title='CarTrust Simulated Vendor Verification API',
    description='External issuer verification portal for independent invoice authenticity checks'
)

ISSUER_DATABASE = {
    'INV-DEMO-1001': {
        'invoice_number': 'INV-DEMO-1001',
        'vendor_id': 'VENDOR-APEX-01',
        'vendor_name': 'Apex Auto Care',
        'vehicle_id': 'DEMO-VIN-HC-2019-001',
        'amount': 8500.0,
        'date': '2025-08-14',
        'status': 'VALID',
        'service_type': 'Brake Pads Replacement'
    },
    'INV-10091': {
        'invoice_number': 'INV-10091',
        'vendor_id': 'VENDOR-001',
        'vendor_name': 'Authorized Honda Service',
        'vehicle_id': 'DEMO-VIN-HC-2019-001',
        'amount': 8500.0,
        'date': '2026-07-15',
        'status': 'VALID',
        'service_type': 'Scheduled Maintenance'
    }
}

@app.get('/health')
def health():
    return {'status': 'ONLINE', 'provider': 'Simulated Issuer Gateway'}

@app.get('/provider-api/invoices/{invoice_number}')
def verify_invoice(invoice_number: str):
    inv_key = invoice_number.strip().upper()
    if inv_key in ISSUER_DATABASE:
        return ISSUER_DATABASE[inv_key]
    raise HTTPException(status_code=404, detail=f'No record found in issuer system for invoice {invoice_number}')

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
