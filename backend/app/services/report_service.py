import io
import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.vehicle import Vehicle
from app.models.event import VehicleTimeline, InsuranceEvent
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
        dq_issues = db.query(DataQualityIssue).filter(DataQualityIssue.vehicle_id == vehicle_id).all()

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
            fontSize=22,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'SubTitleStyle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#475569'),
            spaceAfter=14
        )
        section_style = ParagraphStyle(
            'SectionStyle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#334155'),
            leading=12
        )
        disclaimer_style = ParagraphStyle(
            'DisclaimerStyle',
            parent=styles['Italic'],
            fontSize=8,
            textColor=colors.HexColor('#64748B'),
            leading=10,
            spaceBefore=14
        )

        elements = []

        # Header
        elements.append(Paragraph('CarTrust AI — Vehicle Intelligence Report', title_style))
        elements.append(Paragraph(f'Generated on {datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")} | Provenance & Evidence Based Intelligence', subtitle_style))
        elements.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=12))

        # Vehicle Summary Table
        elements.append(Paragraph('1. Vehicle Summary & Integrity Metrics', section_style))
        summary_data = [
            ['VIN', vehicle.vin, 'Registration', vehicle.registration_number or 'N/A'],
            ['Make & Model', f'{vehicle.make} {vehicle.model} ({vehicle.variant or ""})', 'Year', str(vehicle.year)],
            ['Fuel / Transmission', f'{vehicle.fuel_type} / {vehicle.transmission}', 'Odometer', f'{vehicle.current_odometer:,} km'],
            ['History Coverage', f"{summary['history_coverage_pct']}% satisfy evidence criteria", 'Maintenance Evidence', summary['maintenance_evidence_rating']],
            ['Odometer Integrity', summary['odometer_consistency_status'], 'Data Conflicts', str(summary['data_conflicts_count'])]
        ]
        t = Table(summary_data, colWidths=[1.5*inch, 2.0*inch, 1.5*inch, 2.0*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME', (2,0), (2,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 10))

        # Chronological Timeline
        elements.append(Paragraph('2. Evidence-Based Vehicle Timeline', section_style))
        timeline_rows = [['Date', 'Milestone', 'Mileage', 'Source', 'Verification Status']]
        for event in timeline[:8]:
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
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_tl)
        elements.append(Spacer(1, 10))

        # Insurance Claims & Damage
        elements.append(Paragraph('3. Insurance & Damage Intelligence', section_style))
        if claims:
            claim_rows = [['Claim #', 'Date', 'Type', 'Damage Area', 'Severity', 'Amount']]
            for c in claims:
                claim_rows.append([c.claim_number, str(c.claim_date), c.claim_type, c.damage_area, c.severity, f'₹{c.claim_amount:,.2f}'])
            t_claim = Table(claim_rows, colWidths=[1.2*inch, 1.1*inch, 1.1*inch, 1.2*inch, 1.1*inch, 1.3*inch])
            t_claim.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EF4444')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 4),
            ]))
            elements.append(t_claim)
        else:
            elements.append(Paragraph('No verified insurance accident claims or damage records are registered in available databases.', body_style))

        elements.append(Spacer(1, 10))

        # Data Quality & Anomaly Flags
        elements.append(Paragraph('4. Data Quality & Inconsistency Audit', section_style))
        if dq_issues:
            dq_rows = [['Rule', 'Severity', 'Description', 'Detected At', 'Status']]
            for issue in dq_issues:
                dq_rows.append([issue.rule, issue.severity, issue.description[:40], str(issue.detected_at.date()), issue.status])
            t_dq = Table(dq_rows, colWidths=[1.5*inch, 1.0*inch, 2.5*inch, 1.0*inch, 1.0*inch])
            t_dq.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F59E0B')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 4),
            ]))
            elements.append(t_dq)
        else:
            elements.append(Paragraph('No open data quality violations or severe chronology conflicts detected.', body_style))

        elements.append(Spacer(1, 14))
        elements.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=8))
        disclaimer_text = (
            'LEGAL & EVIDENCE DISCLAIMER: CarTrust AI aggregates available records from participating service centers, '
            'insurance databases, inspection facilities, and user submissions. CarTrust does NOT assert facts beyond the '
            'verifiable boundaries of provided records. Absence of recorded accidents or repairs does not guarantee an incident-free history. '
            'Physical pre-purchase inspection by a qualified mechanic is always advised.'
        )
        elements.append(Paragraph(disclaimer_text, disclaimer_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
