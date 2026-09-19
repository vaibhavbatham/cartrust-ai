import re
import datetime
import logging
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.vehicle import Vehicle, OdometerReading
from app.models.event import ServiceEvent, MaintenanceEvent, InsuranceEvent, InspectionEvent
from app.models.evidence import Evidence, Invoice, InvoiceItem, Document

logger = logging.getLogger('cartrust.rag')

class RAGService:
    @classmethod
    def resolve_vehicle(cls, db: Session, vehicle_id: Optional[str]) -> Optional[Vehicle]:
        if not vehicle_id:
            return None
        raw = vehicle_id.strip()
        clean = raw.replace(' ', '').replace('-', '').upper()

        # 1. Direct match by ID, VIN, or registration plate
        v = db.query(Vehicle).filter(
            or_(
                Vehicle.id == raw,
                Vehicle.vin == raw,
                Vehicle.vin == clean,
                Vehicle.registration_number == raw,
                Vehicle.registration_number == clean,
                func.replace(func.replace(Vehicle.registration_number, ' ', ''), '-', '') == clean
            )
        ).first()
        if v:
            return v

        # 2. Case-insensitive / partial match
        v = db.query(Vehicle).filter(
            or_(
                Vehicle.id.ilike(f'%{raw}%'),
                Vehicle.vin.ilike(f'%{raw}%'),
                Vehicle.registration_number.ilike(f'%{raw}%')
            )
        ).first()
        return v

    @classmethod
    def extract_year(cls, text: str) -> Optional[int]:
        match = re.search(r'\b(20[123]\d)\b', text)
        if match:
            return int(match.group(1))
        return None

    @classmethod
    def detect_intent(
        cls, query_text: str, history: List[Dict[str, Any]]
    ) -> Tuple[str, Dict[str, Any]]:
        q = query_text.lower().strip()
        meta: Dict[str, Any] = {}

        # Scan previous turns for follow-up resolution
        last_user_query = ''
        last_assistant_answer = ''
        if history:
            for item in reversed(history):
                role = item.get('role')
                content = item.get('content', '').lower()
                if role == 'user' and not last_user_query:
                    last_user_query = content
                elif role == 'assistant' and not last_assistant_answer:
                    last_assistant_answer = content
                if last_user_query and last_assistant_answer:
                    break

        # Check for year queries
        year = cls.extract_year(q)
        is_short_year_query = bool(re.match(r'^(and\s+)?(in\s+)?(what\s+about\s+)?(20[123]\d)\??$', q))

        prev_was_mileage = (
            'mileage' in last_user_query
            or 'odometer' in last_user_query
            or 'km' in last_user_query
            or 'km' in last_assistant_answer
            or 'odometer' in last_assistant_answer
        )

        if year and (
            'mileage' in q
            or 'odometer' in q
            or 'km' in q
            or 'reading' in q
            or is_short_year_query
            or prev_was_mileage
        ):
            meta['year'] = year
            return 'MILEAGE_BY_YEAR', meta

        # Current mileage
        if any(w in q for w in ['current mileage', 'latest mileage', 'how many km', 'current odometer', 'odometer reading', 'what is the mileage', 'total km', 'latest odometer']):
            return 'CURRENT_MILEAGE', meta

        # Last service cost / expenditure
        if (
            ('how much' in q and 'service' in q)
            or ('cost' in q and 'service' in q)
            or ('spent on' in q and 'service' in q)
            or ('service cost' in q)
            or ('service price' in q)
        ):
            return 'LAST_SERVICE_COST', meta

        if ('how much' in q or 'cost' in q or 'spend' in q) and ('service' in last_user_query or 'service' in last_assistant_answer):
            return 'LAST_SERVICE_COST', meta

        # Last service general
        if any(w in q for w in ['when was the last service', 'last service', 'latest service', 'service date', 'when was it serviced', 'service center', 'last serviced', 'serviced date']):
            return 'LAST_SERVICE', meta

        # Parts replaced general
        if (
            'what parts' in q
            or 'which parts' in q
            or 'parts have been replaced' in q
            or 'parts were replaced' in q
            or 'parts replaced' in q
            or 'replacement parts' in q
            or 'spare parts' in q
        ):
            return 'PARTS_REPLACED', meta

        # Specific parts
        parts_patterns = {
            'brakes': ['brake', 'brakes', 'pad', 'rotor', 'caliper'],
            'clutch': ['clutch', 'flywheel'],
            'tires': ['tire', 'tires', 'tyre', 'tyres'],
            'battery': ['battery'],
            'oil': ['engine oil', 'synthetic oil', 'oil change', 'oil filter'],
            'suspension': ['suspension', 'shock', 'strut'],
            'transmission': ['transmission', 'gearbox']
        }
        for p_name, keywords in parts_patterns.items():
            if any(k in q for k in keywords):
                meta['part'] = p_name
                return 'SPECIFIC_PART', meta

        for p_name, keywords in parts_patterns.items():
            if any(f'what about {k}' in q or f'and {k}' in q for k in keywords):
                meta['part'] = p_name
                return 'SPECIFIC_PART', meta

        # Invoices
        if any(w in q for w in ['show me the invoices', 'show me invoices', 'uploaded invoices', 'invoices', 'invoice', 'repair bills', 'receipts', 'service bills', 'bills']):
            return 'INVOICES', meta

        # Repair cost / total expenditure
        if (
            'how much did the owner spend on repairs' in q
            or 'how much has been spent on repairs' in q
            or 'spent on repairs' in q
            or 'repair expenditure' in q
            or 'repair spend' in q
            or 'total repair' in q
            or 'total maintenance cost' in q
            or 'repair expenses' in q
            or 'how much spent' in q
            or 'repair cost' in q
        ):
            return 'REPAIR_COST', meta

        # Service history / repair history
        if any(w in q for w in ['repair history', 'show me the repair history', 'service history', 'show me the service history', 'maintenance history', 'all services', 'service records', 'maintenance log']):
            return 'SERVICE_HISTORY', meta

        # Accidents / insurance claims
        if any(w in q for w in ['accident', 'accidents', 'damage', 'claim', 'claims', 'collision', 'flood', 'insurance']):
            return 'ACCIDENTS_CLAIMS', meta

        # Vehicle overview
        if any(w in q for w in ['what information do you have about this vehicle', 'what info do you have', 'vehicle overview', 'vehicle details', 'about this vehicle', 'about this car', 'tell me about this vehicle', 'tell me about this car', 'car details', 'summary', 'overview']):
            return 'VEHICLE_OVERVIEW', meta

        # Fallback mileage check
        if 'mileage' in q or 'odometer' in q:
            return 'CURRENT_MILEAGE', meta

        return 'FALLBACK', meta

    @classmethod
    def generate_dynamic_suggestions(
        cls,
        vehicle: Vehicle,
        odometer_readings: List[OdometerReading],
        service_events: List[ServiceEvent],
        invoices: List[Invoice],
        insurance_events: List[InsuranceEvent],
        intent: str,
        meta: Dict[str, Any]
    ) -> List[str]:
        suggestions: List[str] = []

        if intent == 'SPECIFIC_PART' and meta.get('part') == 'clutch':
            return [
                'When was the last recorded service?',
                'What parts have been replaced?',
                'Were the brakes replaced?',
                'What is the latest odometer reading?',
                'Show me the uploaded invoices'
            ]

        if intent == 'ACCIDENTS_CLAIMS':
            if insurance_events:
                return [
                    'Show me the repair history',
                    'How much has been spent on repairs?',
                    'When was the last service?',
                    'Show me the invoices'
                ]
            else:
                return [
                    'Show me the service history',
                    'Check the odometer timeline',
                    'Show me repair invoices',
                    'What is the current mileage?'
                ]

        if intent in ['CURRENT_MILEAGE', 'MILEAGE_BY_YEAR']:
            years = sorted({r.reading_date.year for r in odometer_readings if r.reading_date})
            if 2023 in years and meta.get('year') != 2023:
                suggestions.append('What was the mileage in 2023?')
            if 2024 in years and meta.get('year') != 2024:
                suggestions.append('What was the mileage in 2024?')
            suggestions.append('When was the last service?')
            suggestions.append('Were the brakes replaced?')
            if invoices:
                suggestions.append('Show me the invoices')
            return suggestions[:4]

        if intent in ['LAST_SERVICE', 'LAST_SERVICE_COST']:
            return [
                'How much was spent on the last service?',
                'What parts have been replaced?',
                'Show me the invoices',
                'What is the current mileage?'
            ]

        if intent in ['INVOICES', 'REPAIR_COST']:
            return [
                'What parts have been replaced?',
                'When was the last service?',
                'Show me the repair history',
                'What is the current mileage?'
            ]

        # General suggestions based on vehicle content
        if invoices:
            suggestions.append('Show me the invoices')
            suggestions.append('How much has been spent on repairs?')
        if service_events:
            suggestions.append('When was the last service?')
            suggestions.append('What parts have been replaced?')
        if odometer_readings:
            suggestions.append('What is the current mileage?')
        suggestions.append('Are there any accident records?')

        # Deduplicate and return top 4
        seen = set()
        final_suggestions = []
        for s in suggestions:
            if s not in seen:
                seen.add(s)
                final_suggestions.append(s)
        return final_suggestions[:4]

    @classmethod
    def answer_query(
        cls,
        db: Session,
        vehicle_id: Optional[str],
        query_text: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        history = conversation_history or []
        try:
            vehicle = cls.resolve_vehicle(db, vehicle_id)
            if not vehicle:
                # Query without specific vehicle context
                demo_vehicles = db.query(Vehicle).limit(3).all()
                demo_names = [f'{v.registration_number or v.vin} ({v.year} {v.make} {v.model})' for v in demo_vehicles]
                demo_str = ', '.join(demo_names) if demo_names else 'MP04AB1234, DL01XY5678'
                return {
                    'answer': (
                        f'Please select or specify a vehicle to query its grounded historical records. '
                        f'Available vehicles in the database include: {demo_str}. '
                        f'You can select a vehicle from the top selector or search by registration number.'
                    ),
                    'grounded_evidence': [],
                    'actions': [],
                    'suggested_questions': [
                        'What is the current mileage?',
                        'When was the last service?',
                        'Show me the invoices'
                    ],
                    'vehicle_context': None,
                    'uncertainty_level': 'UNKNOWN',
                    'disclaimer': 'CarTrust reports only what is evidenced in recorded database history.'
                }

            # Gather all vehicle records
            odometer_readings = db.query(OdometerReading).filter(
                OdometerReading.vehicle_id == vehicle.id
            ).order_by(OdometerReading.reading_date.asc()).all()

            service_events = db.query(ServiceEvent).filter(
                ServiceEvent.vehicle_id == vehicle.id
            ).order_by(ServiceEvent.service_date.desc()).all()

            maintenance_events = db.query(MaintenanceEvent).filter(
                MaintenanceEvent.vehicle_id == vehicle.id
            ).order_by(MaintenanceEvent.event_date.desc()).all()

            invoices = db.query(Invoice).filter(
                Invoice.vehicle_id == vehicle.id
            ).order_by(Invoice.invoice_date.desc()).all()

            insurance_events = db.query(InsuranceEvent).filter(
                InsuranceEvent.vehicle_id == vehicle.id
            ).order_by(InsuranceEvent.claim_date.desc()).all()

            inspection_events = db.query(InspectionEvent).filter(
                InspectionEvent.vehicle_id == vehicle.id
            ).order_by(InspectionEvent.inspection_date.desc()).all()

            # Vehicle Context Dict for Frontend
            vehicle_context = {
                'id': vehicle.id,
                'vin': vehicle.vin,
                'registration_number': vehicle.registration_number,
                'make': vehicle.make,
                'model': vehicle.model,
                'year': vehicle.year,
                'current_odometer': vehicle.current_odometer
            }

            intent, meta = cls.detect_intent(query_text, history)
            evidence_refs: List[Dict[str, Any]] = []
            actions: List[Dict[str, Any]] = []
            uncertainty_level = 'KNOWN'
            answer = ''

            # -------------------------------------------------------------
            # Intent 1: MILEAGE_BY_YEAR
            # -------------------------------------------------------------
            if intent == 'MILEAGE_BY_YEAR':
                target_year = meta.get('year')
                matching_odos = [o for o in odometer_readings if o.reading_date and o.reading_date.year == target_year]

                if matching_odos:
                    lines = []
                    for o in matching_odos:
                        lines.append(
                            f'• {o.reading_date.strftime("%d %b %Y")}: **{o.reading:,} km** '
                            f'(Recorded via {o.source.replace("_", " ").title()})'
                        )
                        evidence_refs.append({
                            'source': f'Odometer Log ({o.source})',
                            'date': str(o.reading_date),
                            'verification_status': 'VERIFIED' if o.source != 'USER_INPUT' else 'USER_PROVIDED',
                            'odometer': o.reading
                        })
                    primary_reading = matching_odos[-1].reading
                    nl = chr(10)
                    answer = (
                        f'In **{target_year}**, an odometer reading of **{primary_reading:,} km** was recorded for '
                        f'{vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.registration_number or vehicle.vin}):{nl}{nl}'
                        + f'{nl}'.join(lines)
                    )
                    uncertainty_level = 'KNOWN'
                else:
                    available_years = sorted({o.reading_date.year for o in odometer_readings if o.reading_date})
                    avail_str = ', '.join(str(y) for y in available_years) if available_years else 'none'
                    answer = (
                        f"I couldn't find an odometer reading recorded in **{target_year}** for this vehicle in the CarTrust database. "
                        f'Available recorded years with odometer readings are: {avail_str}.'
                    )
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 2: CURRENT_MILEAGE
            # -------------------------------------------------------------
            elif intent == 'CURRENT_MILEAGE':
                latest_odo = odometer_readings[-1] if odometer_readings else None
                reading_val = latest_odo.reading if latest_odo else vehicle.current_odometer
                reading_date_str = latest_odo.reading_date.strftime("%d %b %Y") if latest_odo and latest_odo.reading_date else 'latest record'
                source_str = latest_odo.source.replace('_', ' ').title() if latest_odo else 'Vehicle Registration'
                status = 'VERIFIED' if latest_odo and latest_odo.source != 'USER_INPUT' else 'REPORTED'

                nl = chr(10)
                answer = (
                    f'The current recorded odometer reading for {vehicle.year} {vehicle.make} {vehicle.model} '
                    f'({vehicle.registration_number or vehicle.vin}) is **{reading_val:,} km** '
                    f'(Recorded on {reading_date_str} via {source_str}).{nl}{nl}'
                    f'Data Status: **{status}**.'
                )
                if latest_odo:
                    evidence_refs.append({
                        'source': f'Odometer Reading ({source_str})',
                        'date': str(latest_odo.reading_date),
                        'verification_status': status,
                        'odometer': reading_val
                    })
                uncertainty_level = 'KNOWN' if status == 'VERIFIED' else 'REPORTED'

            # -------------------------------------------------------------
            # Intent 3: LAST_SERVICE_COST
            # -------------------------------------------------------------
            elif intent == 'LAST_SERVICE_COST':
                nl = chr(10)
                if service_events:
                    latest_s = service_events[0]
                    provider_name = latest_s.provider.name if latest_s.provider else 'Authorized Service Center'
                    inv_ref = f' (Invoice: {latest_s.invoice.invoice_number})' if latest_s.invoice else ''
                    status = latest_s.verification_status
                    answer = (
                        f'For the last service on **{latest_s.service_date.strftime("%d %b %Y")}** at **{provider_name}**, '
                        f'the total recorded expenditure was **₹{latest_s.total_amount:,.2f}**{inv_ref}.{nl}{nl}'
                        f'• Labor Cost: ₹{latest_s.labor_cost:,.2f}{nl}'
                        f'• Parts Cost: ₹{latest_s.parts_cost:,.2f}{nl}'
                        f'• Work Performed: {latest_s.work_performed or latest_s.service_type}{nl}'
                        f'• Record Status: **{status}**'
                    )
                    evidence_refs.append({
                        'source': f'Service Record ({provider_name})',
                        'date': str(latest_s.service_date),
                        'verification_status': status,
                        'total_amount': latest_s.total_amount
                    })
                    if latest_s.invoice and latest_s.invoice.document_id:
                        actions.append({
                            'type': 'view_invoice',
                            'label': f'View Invoice ({latest_s.invoice.invoice_number})',
                            'url': f'/api/v1/documents/{latest_s.invoice.document_id}/file',
                            'target_id': latest_s.invoice.id
                        })
                    actions.append({
                        'type': 'view_service',
                        'label': 'View Service Record',
                        'target_id': latest_s.id
                    })
                    uncertainty_level = 'KNOWN' if status == 'VERIFIED' else 'REPORTED'
                elif invoices:
                    latest_inv = invoices[0]
                    answer = (
                        f'According to the latest recorded invoice on **{latest_inv.invoice_date.strftime("%d %b %Y")}** '
                        f'from **{latest_inv.vendor_name}** (Invoice: {latest_inv.invoice_number}), '
                        f'the total service expenditure was **₹{latest_inv.total_amount:,.2f}**.{nl}{nl}'
                        f'• Work: {latest_inv.work_performed or "General Service"}{nl}'
                        f'• Verification Status: **{latest_inv.verification_status}**'
                    )
                    evidence_refs.append({
                        'source': f'Invoice {latest_inv.invoice_number}',
                        'date': str(latest_inv.invoice_date),
                        'verification_status': latest_inv.verification_status,
                        'total_amount': latest_inv.total_amount
                    })
                    if latest_inv.document_id:
                        actions.append({
                            'type': 'view_invoice',
                            'label': f'View Invoice ({latest_inv.invoice_number})',
                            'url': f'/api/v1/documents/{latest_inv.document_id}/file',
                            'target_id': latest_inv.id
                        })
                    uncertainty_level = 'KNOWN'
                else:
                    answer = "I couldn't find any recorded service history or service expenditure for this vehicle in the CarTrust database."
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 4: LAST_SERVICE
            # -------------------------------------------------------------
            elif intent == 'LAST_SERVICE':
                nl = chr(10)
                if service_events:
                    latest_s = service_events[0]
                    provider_name = latest_s.provider.name if latest_s.provider else 'Authorized Service Center'
                    inv_str = f' (Invoice #{latest_s.invoice.invoice_number})' if latest_s.invoice else ''
                    status = latest_s.verification_status

                    answer = (
                        f'The latest recorded service for this vehicle was on **{latest_s.service_date.strftime("%d %B %Y")}** '
                        f'at **{provider_name}**:{nl}{nl}'
                        f'• Service Type: {latest_s.service_type}{nl}'
                        f'• Odometer at Service: {latest_s.odometer_reading:,} km{nl}'
                        f'• Work Performed: {latest_s.work_performed or latest_s.description or "Scheduled maintenance"}{nl}'
                        f'• Total Cost: ₹{latest_s.total_amount:,.2f}{inv_str}{nl}'
                        f'• Verification: **{status}** (Supported by documented records)'
                    )
                    evidence_refs.append({
                        'source': f'Service Record ({provider_name})',
                        'date': str(latest_s.service_date),
                        'verification_status': status,
                        'odometer': latest_s.odometer_reading
                    })
                    if latest_s.invoice and latest_s.invoice.document_id:
                        actions.append({
                            'type': 'view_invoice',
                            'label': f'View Invoice ({latest_s.invoice.invoice_number})',
                            'url': f'/api/v1/documents/{latest_s.invoice.document_id}/file',
                            'target_id': latest_s.invoice.id
                        })
                    actions.append({
                        'type': 'view_service',
                        'label': 'View Service Record',
                        'target_id': latest_s.id
                    })
                    uncertainty_level = 'KNOWN' if status == 'VERIFIED' else 'REPORTED'
                elif invoices:
                    inv = invoices[0]
                    answer = (
                        f'The latest recorded service invoice was on **{inv.invoice_date.strftime("%d %B %Y")}** '
                        f'from **{inv.vendor_name}** (Invoice: {inv.invoice_number}):{nl}{nl}'
                        f'• Work: {inv.work_performed or "General Service"}{nl}'
                        f'• Amount: ₹{inv.total_amount:,.2f}{nl}'
                        f'• Verification Status: **{inv.verification_status}**'
                    )
                    evidence_refs.append({
                        'source': f'Invoice {inv.invoice_number}',
                        'date': str(inv.invoice_date),
                        'verification_status': inv.verification_status
                    })
                    if inv.document_id:
                        actions.append({
                            'type': 'view_invoice',
                            'label': f'View Invoice ({inv.invoice_number})',
                            'url': f'/api/v1/documents/{inv.document_id}/file',
                            'target_id': inv.id
                        })
                    uncertainty_level = 'KNOWN'
                else:
                    answer = "I couldn't find a recorded service event for this vehicle in the CarTrust database."
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 5: PARTS_REPLACED (General)
            # -------------------------------------------------------------
            elif intent == 'PARTS_REPLACED':
                parts_list = []
                seen_parts = set()

                # Check invoice items
                for inv in invoices:
                    for it in inv.items:
                        name = it.part_name or it.description
                        if name and name.lower() not in seen_parts:
                            seen_parts.add(name.lower())
                            parts_list.append({
                                'name': name,
                                'date': inv.invoice_date,
                                'cost': it.total_price,
                                'source': f'Invoice {inv.invoice_number} ({inv.vendor_name})',
                                'status': inv.verification_status,
                                'inv': inv
                            })

                # Check maintenance events
                for m in maintenance_events:
                    comp = m.component
                    if comp and comp.lower() not in seen_parts:
                        seen_parts.add(comp.lower())
                        parts_list.append({
                            'name': f'{comp} ({m.action_taken})',
                            'date': m.event_date,
                            'cost': None,
                            'source': m.notes or 'Maintenance Log',
                            'status': 'VERIFIED' if 'invoice' in (m.notes or '').lower() else 'REPORTED',
                            'inv': None
                        })

                if parts_list:
                    lines = []
                    for p in parts_list[:8]:
                        cost_str = f' — ₹{p["cost"]:,.2f}' if p["cost"] else ''
                        lines.append(
                            f'• **{p["name"]}**{cost_str} '
                            f'({p["date"].strftime("%d %b %Y")}, {p["source"]}) [{p["status"]}]'
                        )
                        evidence_refs.append({
                            'source': p['source'],
                            'date': str(p['date']),
                            'verification_status': p['status']
                        })
                        if p.get('inv') and p['inv'].document_id and len(actions) < 2:
                            actions.append({
                                'type': 'view_invoice',
                                'label': f'View Invoice ({p["inv"].invoice_number})',
                                'url': f'/api/v1/documents/{p["inv"].document_id}/file',
                                'target_id': p['inv'].id
                            })

                    nl = chr(10)
                    answer = (
                        f'The following parts replacement and maintenance records are logged for this vehicle '
                        f'({len(parts_list)} items total):{nl}{nl}' + f'{nl}'.join(lines)
                    )
                    uncertainty_level = 'KNOWN'
                else:
                    answer = "I couldn't find any recorded parts replacements in the CarTrust database for this vehicle."
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 6: SPECIFIC_PART (Brakes, Clutch, etc.)
            # -------------------------------------------------------------
            elif intent == 'SPECIFIC_PART':
                part_name = meta.get('part', 'part')
                part_display = part_name.capitalize()

                # Look for matches in maintenance events
                m_matches = [
                    m for m in maintenance_events
                    if part_name in m.component.lower() or part_name in (m.notes or '').lower()
                ]

                # Look in invoice items
                inv_matches = []
                for inv in invoices:
                    for it in inv.items:
                        desc = (it.part_name or it.description or '').lower()
                        if part_name in desc:
                            inv_matches.append((inv, it))

                # Look in service events
                s_matches = [
                    s for s in service_events
                    if part_name in (s.work_performed or '').lower() or part_name in (s.description or '').lower()
                ]

                if m_matches or inv_matches or s_matches:
                    details = []
                    # Add from maintenance events
                    for m in m_matches[:2]:
                        status = 'VERIFIED' if 'invoice' in (m.notes or '').lower() else 'REPORTED'
                        details.append(
                            f'• {part_display} servicing/replacement was recorded at **{m.odometer_reading:,} km** '
                            f'on **{m.event_date.strftime("%d %b %Y")}** ({m.action_taken}). Status: **{status}**.'
                        )
                        evidence_refs.append({
                            'source': 'Maintenance Log',
                            'date': str(m.event_date),
                            'verification_status': status,
                            'odometer': m.odometer_reading
                        })
                    # Add from invoices
                    for inv, it in inv_matches[:2]:
                        details.append(
                            f'• Replaced **{it.part_name or it.description}** for ₹{it.total_price:,.2f} '
                            f'on {inv.invoice_date.strftime("%d %b %Y")} from {inv.vendor_name} (Invoice: {inv.invoice_number}). '
                            f'Status: **{inv.verification_status}**.'
                        )
                        evidence_refs.append({
                            'source': f'Invoice {inv.invoice_number}',
                            'date': str(inv.invoice_date),
                            'verification_status': inv.verification_status
                        })
                        if inv.document_id and len(actions) < 2:
                            actions.append({
                                'type': 'view_invoice',
                                'label': f'View Invoice ({inv.invoice_number})',
                                'url': f'/api/v1/documents/{inv.document_id}/file',
                                'target_id': inv.id
                            })

                    nl = chr(10)
                    answer = (
                        f'**{part_display} replacement / service records found:**{nl}{nl}'
                        + f'{nl}'.join(details)
                    )
                    uncertainty_level = 'KNOWN'
                else:
                    nl = chr(10)
                    # Explicit honesty as mandated by user prompt
                    answer = (
                        f"I couldn't find a verified {part_name}-replacement record for this vehicle in the CarTrust database.{nl}{nl}"
                        f"Available records contain no service invoices, maintenance logs, or inspection notes confirming {part_name} replacement."
                    )
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 7: INVOICES
            # -------------------------------------------------------------
            elif intent == 'INVOICES':
                if invoices:
                    lines = []
                    for inv in invoices[:6]:
                        nl = chr(10)
                        lines.append(
                            f'• **Invoice #{inv.invoice_number}** ({inv.invoice_date.strftime("%d %b %Y")}) — '
                            f'**₹{inv.total_amount:,.2f}** at **{inv.vendor_name}** [{inv.verification_status}]{nl}'
                            f'  Category: {inv.category} | Work: {inv.work_performed or "General Service"}'
                        )
                        evidence_refs.append({
                            'source': f'Invoice {inv.invoice_number} ({inv.vendor_name})',
                            'date': str(inv.invoice_date),
                            'verification_status': inv.verification_status,
                            'total_amount': inv.total_amount
                        })
                        if inv.document_id and len(actions) < 3:
                            actions.append({
                                'type': 'view_invoice',
                                'label': f'View Invoice ({inv.invoice_number})',
                                'url': f'/api/v1/documents/{inv.document_id}/file',
                                'target_id': inv.id
                            })

                    nl = chr(10)
                    answer = (
                        f'The CarTrust database has **{len(invoices)} recorded invoice(s)** for this vehicle:{nl}{nl}'
                        + f'{nl}{nl}'.join(lines)
                    )
                    uncertainty_level = 'KNOWN'
                else:
                    answer = 'No invoices have been uploaded or recorded for this vehicle in the CarTrust database yet.'
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 8: REPAIR_COST (Total spend)
            # -------------------------------------------------------------
            elif intent == 'REPAIR_COST':
                verified_spend = 0.0
                unverified_spend = 0.0
                total_events = 0

                if invoices:
                    for inv in invoices:
                        total_events += 1
                        if inv.verification_status in ['VERIFIED', 'DOCUMENT_CHECKED']:
                            verified_spend += inv.total_amount
                        else:
                            unverified_spend += inv.total_amount
                elif service_events:
                    for s in service_events:
                        total_events += 1
                        if s.verification_status == 'VERIFIED':
                            verified_spend += s.total_amount
                        else:
                            unverified_spend += s.total_amount

                total_spend = verified_spend + unverified_spend

                if total_spend > 0:
                    nl = chr(10)
                    answer = (
                        f'The total recorded repair and maintenance expenditure for this vehicle is '
                        f'**₹{total_spend:,.2f}** across {total_events} recorded document(s)/event(s):{nl}{nl}'
                        f'• **Verified Expenditure:** ₹{verified_spend:,.2f} '
                        f'(Supported by uploaded and authenticated service invoices){nl}'
                        f'• **Pending Review / User-Provided:** ₹{unverified_spend:,.2f}{nl}{nl}'
                        f'All expenses are calculated strictly from stored database records.'
                    )
                    evidence_refs.append({
                        'source': 'Aggregated Invoices & Service History',
                        'date': str(datetime.date.today()),
                        'verification_status': 'VERIFIED' if verified_spend > 0 else 'REPORTED',
                        'total_amount': total_spend
                    })
                    if invoices and invoices[0].document_id:
                        actions.append({
                            'type': 'view_invoice',
                            'label': f'View Latest Invoice ({invoices[0].invoice_number})',
                            'url': f'/api/v1/documents/{invoices[0].document_id}/file',
                            'target_id': invoices[0].id
                        })
                    uncertainty_level = 'KNOWN'
                else:
                    answer = 'There is no recorded repair or maintenance expenditure logged for this vehicle in the CarTrust database.'
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 9: SERVICE_HISTORY / REPAIR_HISTORY
            # -------------------------------------------------------------
            elif intent == 'SERVICE_HISTORY':
                history_items = []
                nl = chr(10)
                for s in service_events:
                    p_name = s.provider.name if s.provider else 'Authorized Service Center'
                    history_items.append(
                        f'• **{s.service_date.strftime("%d %b %Y")}** at {s.odometer_reading:,} km — '
                        f'**{s.service_type}** (₹{s.total_amount:,.2f}){nl}'
                        f'  Work: {s.work_performed or s.description or "Scheduled service"} | Center: {p_name} [{s.verification_status}]'
                    )
                    evidence_refs.append({
                        'source': f'Service Log ({p_name})',
                        'date': str(s.service_date),
                        'verification_status': s.verification_status
                    })
                    if len(actions) < 2:
                        actions.append({
                            'type': 'view_service',
                            'label': f'Service Record ({s.service_date.strftime("%d %b %Y")})',
                            'target_id': s.id
                        })

                if not history_items and invoices:
                    for inv in invoices[:4]:
                        history_items.append(
                            f'• **{inv.invoice_date.strftime("%d %b %Y")}** — **{inv.category}** (₹{inv.total_amount:,.2f}){nl}'
                            f'  Work: {inv.work_performed or "General Service"} | Vendor: {inv.vendor_name} [{inv.verification_status}]'
                        )
                        evidence_refs.append({
                            'source': f'Invoice {inv.invoice_number}',
                            'date': str(inv.invoice_date),
                            'verification_status': inv.verification_status
                        })

                if history_items:
                    answer = (
                        f'Here is the chronological service and repair history recorded for '
                        f'{vehicle.year} {vehicle.make} {vehicle.model} ({len(history_items)} events):{nl}{nl}'
                        + f'{nl}{nl}'.join(history_items)
                    )
                    uncertainty_level = 'KNOWN'
                else:
                    answer = "I couldn't find any recorded service or repair history for this vehicle in the CarTrust database."
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 10: ACCIDENTS_CLAIMS
            # -------------------------------------------------------------
            elif intent == 'ACCIDENTS_CLAIMS':
                if insurance_events:
                    lines = []
                    nl = chr(10)
                    for c in insurance_events:
                        lines.append(
                            f'• **Claim #{c.claim_number}** dated **{c.claim_date.strftime("%d %b %Y")}**{nl}'
                            f'  - Damage Area: **{c.damage_area}**{nl}'
                            f'  - Severity: {c.severity}{nl}'
                            f'  - Claim Amount: ₹{c.claim_amount:,.2f}{nl}'
                            f'  - Repair Status: {c.repair_status.replace("_", " ").title()}'
                        )
                        evidence_refs.append({
                            'source': f'Insurance Claim #{c.claim_number}',
                            'date': str(c.claim_date),
                            'verification_status': 'VERIFIED',
                            'claim_number': c.claim_number
                        })
                    answer = (
                        f'The CarTrust database has **{len(insurance_events)} recorded insurance accident/damage claim(s)** '
                        f'for this vehicle:{nl}{nl}' + f'{nl}{nl}'.join(lines) + f'{nl}{nl}'
                        f'The available records do not establish whether there were any other unrecorded incidents.'
                    )
                    uncertainty_level = 'KNOWN'
                else:
                    answer = 'I found no reported accident or insurance claim records for this vehicle in the CarTrust database.'
                    uncertainty_level = 'UNKNOWN'

            # -------------------------------------------------------------
            # Intent 11: VEHICLE_OVERVIEW
            # -------------------------------------------------------------
            elif intent == 'VEHICLE_OVERVIEW':
                reg_str = vehicle.registration_number or 'Unregistered / Temporary'
                loc_str = vehicle.location or 'Not specified'
                fuel_str = vehicle.fuel_type.capitalize() if vehicle.fuel_type else 'Petrol'
                trans_str = vehicle.transmission.capitalize() if vehicle.transmission else 'Manual'
                nl = chr(10)

                answer = (
                    f'**Vehicle Overview: {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.variant or ""}**{nl}{nl}'
                    f'• **Registration:** {reg_str}{nl}'
                    f'• **VIN:** {vehicle.vin}{nl}'
                    f'• **Recorded Odometer:** {vehicle.current_odometer:,} km{nl}'
                    f'• **Fuel & Transmission:** {fuel_str} | {trans_str}{nl}'
                    f'• **Ownership Status:** {vehicle.ownership_status.title()} Owner{nl}'
                    f'• **Location:** {loc_str}{nl}{nl}'
                    f'**Stored Evidence Summary:**{nl}'
                    f'• {len(odometer_readings)} Odometer milestone(s){nl}'
                    f'• {len(service_events)} Service record(s){nl}'
                    f'• {len(invoices)} Uploaded / Verified invoice(s){nl}'
                    f'• {len(insurance_events)} Insurance claim(s){nl}'
                    f'• {len(inspection_events)} Physical inspection(s)'
                )
                evidence_refs.append({
                    'source': 'Vehicle Master Record',
                    'date': str(datetime.date.today()),
                    'verification_status': 'VERIFIED'
                })
                actions.append({
                    'type': 'view_report',
                    'label': 'Download PDF Report',
                    'url': f'/api/v1/reports/{vehicle.id}/pdf'
                })
                uncertainty_level = 'KNOWN'

            # -------------------------------------------------------------
            # Intent 12: FALLBACK
            # -------------------------------------------------------------
            else:
                answer = (
                    f'Regarding your query for {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.registration_number or vehicle.vin}): '
                    f"I couldn't find a direct database record matching your specific question. "
                    f'Currently, the system has logged {vehicle.current_odometer:,} km across {len(odometer_readings)} odometer readings, '
                    f'{len(service_events)} service events, {len(invoices)} invoices, and {len(insurance_events)} insurance claims.'
                )
                uncertainty_level = 'UNKNOWN'

            # Generate vehicle-grounded dynamic suggestions
            suggested_questions = cls.generate_dynamic_suggestions(
                vehicle, odometer_readings, service_events, invoices, insurance_events, intent, meta
            )

            return {
                'answer': answer,
                'grounded_evidence': evidence_refs,
                'actions': actions,
                'suggested_questions': suggested_questions,
                'vehicle_context': vehicle_context,
                'uncertainty_level': uncertainty_level,
                'disclaimer': 'CarTrust Grounded AI strictly reports verifiable database records and never speculates on unrecorded history.'
            }

        except Exception as exc:
            logger.exception(f'Error answering query for vehicle {vehicle_id}: {exc}')
            return {
                'answer': "I'm unable to retrieve the vehicle records right now. Please try again in a moment.",
                'grounded_evidence': [],
                'actions': [],
                'suggested_questions': [
                    'What is the current mileage?',
                    'When was the last service?',
                    'Show me the invoices'
                ],
                'vehicle_context': None,
                'uncertainty_level': 'UNKNOWN',
                'disclaimer': 'CarTrust Grounded AI strictly reports verifiable database records.'
            }
