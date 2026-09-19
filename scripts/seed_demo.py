import sys
import os
import datetime
sys.path.insert(0, r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/backend')

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, Role, UserRole, Profile
from app.models.vehicle import Vehicle, VehicleOwnership, VehicleSourceMapping, OdometerReading
from app.models.provider import Provider
from app.models.event import MaintenanceEvent, InsuranceEvent, InspectionEvent, VehicleTimeline
from app.models.evidence import Evidence
from app.models.quality import Alert, DataQualityIssue

def seed_demo_data():
    print('Creating database tables if not present...')
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    roles = ['CUSTOMER', 'OWNER', 'DEALER', 'MECHANIC', 'INSPECTION_CENTER', 'INSURANCE_PROVIDER', 'ADMIN']
    role_map = {}
    for r in roles:
        obj = db.query(Role).filter(Role.name == r).first()
        if not obj:
            obj = Role(name=r, description=f'{r} role')
            db.add(obj)
            db.flush()
        role_map[r] = obj

    accounts = [
        ('customer@cartrust.demo', 'Rahul', 'Sharma', 'CUSTOMER', '+919876543210', 'Buying a used car', 'Bhopal', 'Madhya Pradesh'),
        ('mechanic@cartrust.demo', 'Vikram', 'Singh', 'MECHANIC', '+919876543211', 'Mechanic/service provider', 'Indore', 'Madhya Pradesh'),
        ('admin@cartrust.demo', 'Aditi', 'Verma', 'ADMIN', '+919876543212', 'System Administrator', 'New Delhi', 'Delhi')
    ]

    for email, fn, ln, role_name, mobile, purpose, city, state in accounts:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=hash_password('DemoPassword123!'),
                first_name=fn,
                last_name=ln,
                mobile_number=mobile,
                email_verified=True,
                phone_verified=True,
                is_active=True,
                is_superuser=(role_name == 'ADMIN')
            )
            db.add(user)
            db.flush()

            ur = UserRole(user_id=user.id, role_id=role_map[role_name].id)
            db.add(ur)

            prof = Profile(
                user_id=user.id,
                full_name=f'{fn} {ln}',
                city=city,
                state=state,
                country='India',
                preferred_language='English',
                purpose=purpose
            )
            db.add(prof)

    prov = db.query(Provider).filter(Provider.name == 'Apex Auto Care').first()
    if not prov:
        prov = Provider(
            name='Apex Auto Care',
            provider_type='AUTHORIZED_SERVICE',
            registration_number='AUTH-SRV-2018-09',
            address='104 Auto Hub, Bhopal MP',
            contact_email='service@apexautocare.demo',
            contact_phone='+917551234567',
            is_active=True,
            api_endpoint='http://localhost:8001/provider-api'
        )
        db.add(prov)
        db.flush()

    # DEMO VEHICLE 1: Canonical Honda City (DEMO-VIN-HC-2019-001)
    v1 = db.query(Vehicle).filter(Vehicle.vin == 'DEMO-VIN-HC-2019-001').first()
    if not v1:
        v1 = Vehicle(
            vin='DEMO-VIN-HC-2019-001',
            registration_number='MP04-AB-1234',
            make='Honda',
            model='City',
            variant='VX Manual',
            year=2019,
            fuel_type='Petrol',
            transmission='Manual',
            current_odometer=74100,
            ownership_status='FIRST',
            golden_vehicle_id='GOLDEN-DEMO-VIN-HC-2019-001'
        )
        db.add(v1)
        db.flush()

        odos = [
            (24500, datetime.date(2021, 3, 15), 'AUTHORIZED_SERVICE'),
            (38000, datetime.date(2022, 4, 10), 'AUTHORIZED_SERVICE'),
            (51200, datetime.date(2023, 6, 20), 'INSPECTION_CENTER'),
            (58100, datetime.date(2024, 8, 14), 'INSURANCE_CLAIM'),
            (67800, datetime.date(2025, 2, 22), 'AUTHORIZED_SERVICE'),
            (72300, datetime.date(2025, 8, 14), 'OWNER_INVOICE'),
            (74100, datetime.date(2026, 1, 18), 'INSPECTION_CENTER')
        ]
        for o_val, o_date, o_src in odos:
            db.add(OdometerReading(vehicle_id=v1.id, reading=o_val, reading_date=o_date, source=o_src))

        claim = InsuranceEvent(
            vehicle_id=v1.id,
            provider_id=prov.id,
            claim_number='CLM-2024-HC-8891',
            claim_date=datetime.date(2024, 8, 14),
            claim_type='COLLISION',
            damage_area='Front-Area (Bumper & Radiator Support)',
            severity='MODERATE',
            claim_amount=42500.0,
            repair_status='REPAIRED_OEM_PARTS'
        )
        db.add(claim)

        insp = InspectionEvent(
            vehicle_id=v1.id,
            provider_id=prov.id,
            inspection_date=datetime.date(2026, 1, 18),
            odometer_reading=74100,
            inspection_center_name='Bhopal Central Testing Station',
            overall_result='PASS',
            brake_condition='GOOD',
            tire_condition='GOOD',
            suspension_condition='GOOD',
            engine_condition='EXCELLENT',
            remarks='Vehicle in good mechanical state. Brake pads in good working condition.'
        )
        db.add(insp)

        ev_brake = Evidence(
            vehicle_id=v1.id,
            evidence_type='OWNER_INVOICE',
            title='Owner-reported Brake-pad replacement (INV-DEMO-1001)',
            description='Owner-uploaded invoice from Apex Auto Care reporting brake pad replacement at 72,300 km.',
            verification_status='PARTIALLY_VERIFIED',
            confidence_score=0.75,
            source='OWNER_INVOICE',
            provenance='Owner invoice document uploaded. Matches vendor service center format.'
        )
        db.add(ev_brake)
        db.flush()

        db.add(MaintenanceEvent(
            vehicle_id=v1.id,
            component='Brakes',
            event_date=datetime.date(2025, 8, 14),
            odometer_reading=72300,
            action_taken='Replaced Front Brake Pads',
            notes='Reported via owner invoice INV-DEMO-1001'
        ))

        timeline_items = [
            (datetime.date(2019, 5, 1), 'MANUFACTURE', 'Vehicle Manufactured', 'Honda Cars India manufacturing rollout', 0, 'MANUFACTURER', 'VERIFIED', 1.0),
            (datetime.date(2021, 3, 15), 'SERVICE', 'Scheduled Maintenance (24,500 km)', 'Standard periodic maintenance and oil change', 24500, 'AUTHORIZED_SERVICE', 'VERIFIED', 0.95),
            (datetime.date(2022, 4, 10), 'SERVICE', 'Periodic Service (38,000 km)', 'Brake fluid top-up and filter replacements', 38000, 'AUTHORIZED_SERVICE', 'VERIFIED', 0.95),
            (datetime.date(2023, 6, 20), 'INSPECTION', 'Comprehensive Inspection (51,200 km)', 'Annual technical safety inspection - Result: PASS', 51200, 'INSPECTION_CENTER', 'VERIFIED', 0.92),
            (datetime.date(2024, 8, 14), 'INSURANCE_CLAIM', 'Verified Insurance Claim (58,100 km)', 'Front-area collision damage repaired under policy', 58100, 'INSURANCE_PROVIDER', 'VERIFIED', 0.98),
            (datetime.date(2025, 2, 22), 'SERVICE', 'Authorized Service (67,800 km)', 'Standard periodic service and engine diagnostics', 67800, 'AUTHORIZED_SERVICE', 'VERIFIED', 0.95),
            (datetime.date(2025, 8, 14), 'MAINTENANCE', 'Owner-reported Brake Replacement (72,300 km)', 'Brake-pad replacement reported at 72,300 km based on owner-uploaded invoice. Independent issuer verification is pending.', 72300, 'OWNER_INVOICE', 'PARTIALLY_VERIFIED', 0.70),
            (datetime.date(2026, 1, 18), 'INSPECTION', 'Vehicle Inspection (74,100 km)', 'Brake condition verified as Good. Safety certificate issued.', 74100, 'INSPECTION_CENTER', 'VERIFIED', 0.96)
        ]

        for dt, et, title, desc, odo_val, src, v_stat, conf in timeline_items:
            db.add(VehicleTimeline(
                vehicle_id=v1.id,
                event_date=dt,
                event_type=et,
                title=title,
                description=desc,
                odometer=odo_val,
                source=src,
                evidence_id=ev_brake.id if 'Brake' in title else None,
                verification_status=v_stat,
                confidence_score=conf
            ))

    # DEMO VEHICLE 2: Odometer Rollback Conflict (DEMO-VIN-SW-2020-002)
    v2 = db.query(Vehicle).filter(Vehicle.vin == 'DEMO-VIN-SW-2020-002').first()
    if not v2:
        v2 = Vehicle(
            vin='DEMO-VIN-SW-2020-002',
            registration_number='DL01-XY-5678',
            make='Maruti Suzuki',
            model='Swift',
            variant='ZXI',
            year=2020,
            fuel_type='Petrol',
            transmission='Manual',
            current_odometer=54000,
            ownership_status='SECOND',
            golden_vehicle_id='GOLDEN-DEMO-VIN-SW-2020-002'
        )
        db.add(v2)
        db.flush()

        v2_odos = [
            (62000, datetime.date(2024, 2, 10), 'AUTHORIZED_SERVICE'),
            (78000, datetime.date(2025, 3, 15), 'DEALER_LISTING'),
            (54000, datetime.date(2026, 1, 20), 'SELLER_SUBMISSION')
        ]
        for val, dt, src in v2_odos:
            db.add(OdometerReading(vehicle_id=v2.id, reading=val, reading_date=dt, source=src, is_flagged=(val==54000)))

        db.add(VehicleTimeline(
            vehicle_id=v2.id,
            event_date=datetime.date(2024, 2, 10),
            event_type='SERVICE',
            title='Authorized Dealer Service',
            description='Recorded at 62,000 km',
            odometer=62000,
            source='AUTHORIZED_SERVICE',
            verification_status='VERIFIED',
            confidence_score=0.95
        ))
        db.add(VehicleTimeline(
            vehicle_id=v2.id,
            event_date=datetime.date(2025, 3, 15),
            event_type='DEALER',
            title='Dealer Inspection & Listing',
            description='Recorded at 78,000 km',
            odometer=78000,
            source='DEALER_LISTING',
            verification_status='DOCUMENT_CHECKED',
            confidence_score=0.85
        ))
        db.add(VehicleTimeline(
            vehicle_id=v2.id,
            event_date=datetime.date(2026, 1, 20),
            event_type='SELLER',
            title='Seller Marketplace Listing',
            description='Recorded at 54,000 km - Potential Odometer Rollback Detected (-24,000 km)',
            odometer=54000,
            source='SELLER_SUBMISSION',
            verification_status='INCONSISTENT',
            confidence_score=0.3
        ))

        db.add(Alert(
            vehicle_id=v2.id,
            alert_type='ODOMETER_ROLLBACK',
            title='Potential Odometer Inconsistency Detected',
            message='Chronological analysis indicates an unexplained decrease of 24,000 km from 78,000 km (2025-03-15) to 54,000 km (2026-01-20).',
            severity='CRITICAL',
            is_resolved=False
        ))
        db.add(DataQualityIssue(
            vehicle_id=v2.id,
            rule='ODOMETER_CHRONOLOGY',
            severity='CRITICAL',
            description='Odometer rollback of 24,000 km detected between 2025-03-15 and 2026-01-20',
            status='OPEN'
        ))

    rahul = db.query(User).filter(User.email == 'customer@cartrust.demo').first()
    if rahul and v1:
        own = db.query(VehicleOwnership).filter(VehicleOwnership.user_id == rahul.id, VehicleOwnership.vehicle_id == v1.id).first()
        if not own:
            db.add(VehicleOwnership(vehicle_id=v1.id, user_id=rahul.id, is_current=True))

    db.commit()
    print('Demo data successfully seeded in PostgreSQL / SQLite!')

if __name__ == '__main__':
    seed_demo_data()
