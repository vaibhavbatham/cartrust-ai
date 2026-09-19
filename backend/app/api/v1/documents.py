from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.document_service import DocumentService
from app.services.vendor_verification_service import VendorVerificationService
from app.api.deps import get_current_user
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.evidence import Document, Invoice

router = APIRouter(tags=['Documents & Invoices'])

@router.post('/vehicles/{id}/documents')
async def upload_document(
    id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    v = db.query(Vehicle).filter(Vehicle.id == id).first()
    if not v:
        v = db.query(Vehicle).filter(Vehicle.vin == id.upper()).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')

    file_bytes = await file.read()
    try:
        res = DocumentService.process_uploaded_invoice(
            db=db,
            vehicle_id=v.id,
            user_id=current_user.id,
            file_bytes=file_bytes,
            original_filename=file.filename or 'uploaded_document.pdf',
            mime_type=file.content_type or 'application/pdf'
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
        'ocr_extracted_text': doc.ocr_extracted_text,
        'status': doc.status,
        'created_at': doc.created_at
    }

@router.post('/invoices/{id}/verify-issuer')
def verify_invoice_issuer(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return VendorVerificationService.verify_invoice_with_issuer(db, id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
