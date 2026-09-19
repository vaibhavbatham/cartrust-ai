import os
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.document_service import DocumentService
from app.services.vendor_verification_service import VendorVerificationService
from app.api.deps import get_current_user, get_optional_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.evidence import Document, Invoice, InvoiceItem
from app.models.event import ServiceEvent
from app.schemas.invoice import InvoiceReviewRequest, ManualServiceRecordCreate

router = APIRouter(tags=['Documents & Invoices'])

@router.post('/vehicles/{id}/documents')
async def upload_document(
    id: str,
    file: UploadFile = File(...),
    category: Optional[str] = Form("SERVICE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    v = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not v:
        v = db.query(Vehicle).filter(Vehicle.vin == id.upper()).first()
    if not v:
        import re
        norm = re.sub(r'[^A-Za-z0-9]', '', id).upper()
        v = db.query(Vehicle).filter(Vehicle.registration_number == norm).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')

    file_bytes = await file.read()
    try:
        res = DocumentService.process_uploaded_invoice(
            db=db,
            vehicle_id=v.id,
            user_id=current_user.id,
            file_bytes=file_bytes,
            original_filename=file.filename or 'uploaded_invoice.pdf',
            mime_type=file.content_type or 'application/pdf',
            category=category or "SERVICE"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/documents/{id}')
def get_document(id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    return {
        'id': doc.id,
        'filename': doc.filename,
        'original_filename': doc.original_filename,
        'mime_type': doc.mime_type,
        'file_size': doc.file_size,
        'document_category': doc.document_category,
        'ocr_extracted_text': doc.ocr_extracted_text,
        'status': doc.status,
        'created_at': doc.created_at,
        'download_url': f'/api/v1/documents/{doc.id}/file'
    }

@router.get('/documents/{id}/file')
def download_document_file(id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail='Document binary file not found on disk')
    
    return FileResponse(
        path=doc.storage_path,
        media_type=doc.mime_type,
        filename=doc.original_filename,
        content_disposition_type='inline'
    )

@router.get('/vehicles/{id}/invoices')
def list_vehicle_invoices(id: str, db: Session = Depends(get_db)):
    v = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not v:
        v = db.query(Vehicle).filter(Vehicle.vin == id.upper()).first()
    if not v:
        import re
        norm = re.sub(r'[^A-Za-z0-9]', '', id).upper()
        v = db.query(Vehicle).filter(Vehicle.registration_number == norm).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')

    invoices = db.query(Invoice).filter(Invoice.vehicle_id == v.id).order_by(Invoice.invoice_date.desc()).all()
    results = []
    for inv in invoices:
        items = [{
            'id': itm.id,
            'description': itm.description,
            'part_name': itm.part_name,
            'quantity': itm.quantity,
            'unit_price': itm.unit_price,
            'total_price': itm.total_price
        } for itm in inv.items]
        
        doc = inv.document
        results.append({
            'id': inv.id,
            'vehicle_id': inv.vehicle_id,
            'document_id': inv.document_id,
            'invoice_number': inv.invoice_number,
            'vendor_name': inv.vendor_name,
            'customer_name': inv.customer_name,
            'category': inv.category,
            'work_performed': inv.work_performed,
            'record_source': inv.record_source,
            'invoice_date': str(inv.invoice_date),
            'odometer_reading': inv.odometer_reading,
            'subtotal': inv.subtotal,
            'tax': inv.tax,
            'total_amount': inv.total_amount,
            'verification_status': inv.verification_status,
            'issuer_verification_notes': inv.issuer_verification_notes,
            'items': items,
            'document': {
                'id': doc.id,
                'filename': doc.filename,
                'original_filename': doc.original_filename,
                'mime_type': doc.mime_type,
                'download_url': f'/api/v1/documents/{doc.id}/file'
            } if doc else None,
            'created_at': str(inv.created_at)
        })
    return results

@router.get('/invoices/{id}')
def get_invoice_detail(id: str, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail='Invoice not found')
    items = [{
        'id': itm.id,
        'description': itm.description,
        'part_name': itm.part_name,
        'quantity': itm.quantity,
        'unit_price': itm.unit_price,
        'total_price': itm.total_price
    } for itm in inv.items]
    return {
        'id': inv.id,
        'vehicle_id': inv.vehicle_id,
        'document_id': inv.document_id,
        'invoice_number': inv.invoice_number,
        'vendor_name': inv.vendor_name,
        'customer_name': inv.customer_name,
        'category': inv.category,
        'work_performed': inv.work_performed,
        'record_source': inv.record_source,
        'invoice_date': str(inv.invoice_date),
        'odometer_reading': inv.odometer_reading,
        'subtotal': inv.subtotal,
        'tax': inv.tax,
        'total_amount': inv.total_amount,
        'verification_status': inv.verification_status,
        'items': items,
        'download_url': f'/api/v1/documents/{inv.document_id}/file' if inv.document_id else None
    }

@router.put('/invoices/{id}/review')
def review_and_verify_invoice(
    id: str,
    data: InvoiceReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return DocumentService.confirm_and_verify_invoice(
            db=db,
            invoice_id=id,
            user_id=current_user.id,
            data=data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post('/vehicles/{id}/invoices/manual')
def add_manual_service_record(
    id: str,
    data: ManualServiceRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return DocumentService.create_manual_service_record(
            db=db,
            vehicle_id=id,
            user_id=current_user.id,
            data=data
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get('/vehicles/{id}/service-history')
def get_vehicle_service_history(id: str, db: Session = Depends(get_db)):
    v = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not v:
        v = db.query(Vehicle).filter(Vehicle.vin == id.upper()).first()
    if not v:
        import re
        norm = re.sub(r'[^A-Za-z0-9]', '', id).upper()
        v = db.query(Vehicle).filter(Vehicle.registration_number == norm).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')

    events = db.query(ServiceEvent).filter(ServiceEvent.vehicle_id == v.id).order_by(ServiceEvent.service_date.desc()).all()
    records = []
    total_expenditure = 0.0
    verified_expenditure = 0.0

    for ev in events:
        total_expenditure += ev.total_amount
        if ev.verification_status == 'VERIFIED':
            verified_expenditure += ev.total_amount

        inv = ev.invoice
        doc = ev.document
        records.append({
            'id': ev.id,
            'service_date': str(ev.service_date),
            'service_center': ev.provider.name if ev.provider else (inv.vendor_name if inv else 'Authorized Service Center'),
            'service_type': ev.service_type,
            'work_performed': ev.work_performed or ev.description or 'General Service',
            'description': ev.description,
            'odometer_reading': ev.odometer_reading,
            'total_amount': ev.total_amount,
            'labor_cost': ev.labor_cost,
            'parts_cost': ev.parts_cost,
            'verification_status': ev.verification_status,
            'record_source': ev.record_source,
            'invoice_id': ev.invoice_id,
            'invoice_number': inv.invoice_number if inv else None,
            'document_id': ev.document_id,
            'document_download_url': f'/api/v1/documents/{doc.id}/file' if doc else None,
            'document_filename': doc.original_filename if doc else None
        })

    return {
        'vehicle_id': v.id,
        'total_expenditure': total_expenditure,
        'verified_expenditure': verified_expenditure,
        'records_count': len(records),
        'records': records
    }

@router.post('/invoices/{id}/verify-issuer')
def verify_invoice_issuer(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return VendorVerificationService.verify_invoice_with_issuer(db, id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
