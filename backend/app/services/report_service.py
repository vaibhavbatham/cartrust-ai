import io
import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.vehicle import Vehicle
from app.models.event import VehicleTimeline, InsuranceEvent, ServiceEvent
from app.models.evidence import Invoice, Document
from app.models.quality import DataQualityIssue
from app.services.intelligence_summary_service import IntelligenceSummaryService

class ReportService:
    @staticmethod
    def generate_pdf_report(db: Session, vehicle_id: str) -> bytes:
        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise ValueError('Vehicle not found')

        summary = IntelligenceSummaryService.get_summary(db, vehicle_id)
        timeline = db.query(VehicleTimeline).filter(VehicleTimeline.vehicle_id == vehicle_id).order_by(VehicleTimeline.event_date.asc()).all()
        claims = db.query(InsuranceEvent).filter(InsuranceEvent.vehicle_id == vehicle_id).all()
        service_events = db.query(ServiceEvent).filter(ServiceEvent.vehicle_id == vehicle_id).order_by(ServiceEvent.service_date.desc()).all()
        invoices = db.query(Invoice).filter(Invoice.vehicle_id == vehicle_id).order_by(Invoice.invoice_date.desc()).all()
        dq_issues = db.query(DataQualityIssue).filter(DataQualityIssue.vehicle_id == vehicle_id).all()

        total_service_spend = sum(se.total_amount for se in service_events)
        verified_spend = sum(se.total_amount for se in service_events if se.verification_status == 'VERIFIED')

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            'SubTitleStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#475569'),
            spaceAfter=10
        )
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=10,
            spaceAfter=5
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#334155'),
            leading=11
        )
        disclaimer_style = ParagraphStyle(
            'DisclaimerStyle',
            parent=styles['Italic'],
            fontSize=7.5,
            textColor=colors.HexColor('#64748B'),
            leading=10,
            spaceBefore=12
        )

        elements = []

        # Header
        elements.append(Paragraph('CarTrust AI — Vehicle Intelligence & Service History Report', title_style))
        elements.append(Paragraph(f'Generated: {datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")} | Grounded Evidence & Document Attestation', subtitle_style))
        elements.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=10))

        # 1. Vehicle Details
        elements.append(Paragraph('1. Vehicle Specifications & Core Details', section_style))
        vehicle_details_data = [
            ['Registration Number', vehicle.registration_number or 'N/A', 'Make & Brand', vehicle.make],
            ['Model', vehicle.model, 'Variant / Trim', vehicle.variant or 'Standard'],
            ['Manufacturing Year', str(vehicle.year), 'Registration Year', str(vehicle.registration_year or vehicle.year)],
            ['Fuel Type', vehicle.fuel_type, 'Transmission', vehicle.transmission],
            ['Efficiency / Mileage', vehicle.mileage_efficiency or 'Standard Factory Spec', 'Current Odometer', f'{vehicle.current_odometer:,} km'],
            ['Chassis / VIN', vehicle.vin, 'Location', vehicle.location or 'India']
        ]
        t_spec = Table(vehicle_details_data, colWidths=[1.5*inch, 2.0*inch, 1.5*inch, 2.0*inch])
        t_spec.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('PADDING', (0,0), (-1,-1), 3.5),
        ]))
        elements.append(t_spec)
        elements.append(Spacer(1, 8))

        # 2. Service & Repair History
        elements.append(Paragraph(f'2. Service & Repair History (Total Verified Spend: ₹{verified_spend:,.2f})', section_style))
        if service_events:
            svc_rows = [['Date', 'Service Center', 'Work Performed', 'Odometer', 'Amount', 'Invoice #', 'Status']]
            for se in service_events[:10]:
                inv = se.invoice
                inv_num = inv.invoice_number if inv else (se.invoice_id[:8] if se.invoice_id else '-')
                center = se.provider.name if se.provider else (inv.vendor_name if inv else 'Service Workshop')
                work = se.work_performed or se.description or se.service_type
                if len(work) > 28:
                    work = work[:25] + '...'
                svc_rows.append([
                    str(se.service_date),
                    center[:20],
                    work,
                    f'{se.odometer_reading:,} km' if se.odometer_reading else '-',
                    f'₹{se.total_amount:,.2f}',
                    inv_num,
                    se.verification_status
                ])
            t_svc = Table(svc_rows, colWidths=[0.8*inch, 1.4*inch, 1.8*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.8*inch])
            t_svc.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 7.5),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 3.5),
            ]))
            elements.append(t_svc)
        else:
            elements.append(Paragraph('No service or repair invoices uploaded yet. Add invoices in the vehicle dashboard to build verified service history.', body_style))

        elements.append(Spacer(1, 8))

        # 3. Invoice Documents & Proofs
        elements.append(Paragraph(f'3. Supporting Invoices & Uploaded Documents ({len(invoices)} Invoices)', section_style))
        if invoices:
            inv_rows = [['Invoice #', 'Date', 'Vendor / Service Center', 'Category', 'Total Amount', 'Status']]
            for inv in invoices[:8]:
                inv_rows.append([
                    inv.invoice_number,
                    str(inv.invoice_date),
                    inv.vendor_name[:24],
                    inv.category,
                    f'₹{inv.total_amount:,.2f}',
                    inv.verification_status
                ])
            t_inv = Table(inv_rows, colWidths=[1.1*inch, 0.9*inch, 2.2*inch, 1.0*inch, 1.0*inch, 1.0*inch])
            t_inv.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284C7')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 7.5),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 3.5),
            ]))
            elements.append(t_inv)
        else:
            elements.append(Paragraph('No invoice documents recorded for this vehicle.', body_style))

        elements.append(Spacer(1, 8))

        # 4. Evidence-Based Vehicle Timeline
        elements.append(Paragraph('4. Complete Historical Timeline', section_style))
        timeline_rows = [['Date', 'Milestone', 'Mileage', 'Source', 'Verification Status']]
        for event in timeline[:6]:
            timeline_rows.append([
                str(event.event_date),
                event.title[:30],
                f'{event.odometer:,} km' if event.odometer else '-',
                event.source,
                event.verification_status
            ])
        if len(timeline_rows) == 1:
            timeline_rows.append(['N/A', 'No timeline milestones recorded', '-', '-', '-'])

        t_tl = Table(timeline_rows, colWidths=[1.0*inch, 2.3*inch, 1.1*inch, 1.3*inch, 1.3*inch])
        t_tl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 7.5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 3.5),
        ]))
        elements.append(t_tl)
        elements.append(Spacer(1, 8))

        # 5. Insurance & Damage Intelligence
        elements.append(Paragraph('5. Insurance Claims & Damage Audit', section_style))
        if claims:
            claim_rows = [['Claim #', 'Date', 'Type', 'Damage Area', 'Severity', 'Amount']]
            for c in claims:
                claim_rows.append([c.claim_number, str(c.claim_date), c.claim_type, c.damage_area, c.severity, f'₹{c.claim_amount:,.2f}'])
            t_claim = Table(claim_rows, colWidths=[1.2*inch, 1.1*inch, 1.1*inch, 1.2*inch, 1.1*inch, 1.3*inch])
            t_claim.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EF4444')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 7.5),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 3.5),
            ]))
            elements.append(t_claim)
        else:
            elements.append(Paragraph('No verified insurance accident claims or damage records are registered in available databases.', body_style))

        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=6))
        disclaimer_text = (
            'PROVENANCE & INTEGRITY NOTICE: CarTrust AI strictly differentiates between Verified Records (supported by authentic '
            'issuer or document attestation), AI-Extracted Records (subject to customer review), and User-Provided Records (self-reported). '
            'Original supporting invoices are cryptographically archived and downloadable separately. '
            'Physical pre-purchase inspection by a qualified professional is always recommended before final vehicle acquisition.'
        )
        elements.append(Paragraph(disclaimer_text, disclaimer_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
