from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.evidence import Invoice, Evidence, EvidenceVerification
from app.models.event import VehicleTimeline

SIMULATED_ISSUER_INVOICES = {
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

class VendorVerificationService:
    @staticmethod
    def verify_invoice_with_issuer(db: Session, invoice_id: str, user_id: str) -> Dict[str, Any]:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise ValueError('Invoice not found')

        inv_num = invoice.invoice_number.strip().upper()
        issuer_data = SIMULATED_ISSUER_INVOICES.get(inv_num)

        old_status = invoice.verification_status
        new_status = 'UNVERIFIED'
        notes = ''
        confidence = 0.5

        if issuer_data:
            amount_matches = abs(issuer_data['amount'] - invoice.total_amount) < 1.0
            if issuer_data['status'] == 'VALID' and amount_matches:
                new_status = 'VERIFIED'
                confidence = 0.98
                notes = f'Independent issuer confirmation received: Vendor "{issuer_data["vendor_name"]}" confirmed invoice {inv_num} for ₹{issuer_data["amount"]:,.2f}.'
            else:
                new_status = 'INCONSISTENT'
                confidence = 0.4
                notes = f'Issuer record mismatch: Issuer reported amount ₹{issuer_data["amount"]:,.2f}, uploaded invoice reported ₹{invoice.total_amount:,.2f}.'
        else:
            new_status = 'PARTIALLY_VERIFIED'
            confidence = 0.65
            notes = f'Issuer system has no record matching invoice number "{inv_num}". Document passes basic checks, but independent issuer confirmation is unavailable.'

        invoice.verification_status = new_status
        invoice.issuer_verification_notes = notes

        evidence = db.query(Evidence).filter(Evidence.document_id == invoice.document_id).first()
        if evidence:
            ev_ver = EvidenceVerification(
                evidence_id=evidence.id,
                verified_by_id=user_id,
                verification_method='SIMULATED_ISSUER_API',
                previous_status=evidence.verification_status,
                new_status=new_status,
                notes=notes
            )
            db.add(ev_ver)
            evidence.verification_status = new_status
            evidence.confidence_score = confidence
            evidence.provenance = f'Verified against issuer API. {notes}'

        if evidence:
            tl = db.query(VehicleTimeline).filter(VehicleTimeline.evidence_id == evidence.id).first()
            if tl:
                tl.verification_status = new_status
                tl.confidence_score = confidence
                if new_status == 'VERIFIED':
                    tl.description = f'Brake-pad replacement confirmed at {tl.odometer:,} km. Verified independently by service issuer.'

        db.commit()

        return {
            'invoice_number': inv_num,
            'previous_status': old_status,
            'verification_status': new_status,
            'confidence_score': confidence,
            'issuer_notes': notes,
            'issuer_found': issuer_data is not None
        }
