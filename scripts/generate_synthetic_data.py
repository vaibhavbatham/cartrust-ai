import os
import json
import csv
import random
import datetime

random.seed(42)

raw_dir = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/data/raw'
os.makedirs(raw_dir, exist_ok=True)

MAKES_MODELS = [
    ('Honda', 'City', 'Petrol', 'Manual'),
    ('Maruti Suzuki', 'Swift', 'Petrol', 'Manual'),
    ('Hyundai', 'Creta', 'Diesel', 'Automatic'),
    ('Tata', 'Nexon', 'Petrol', 'Manual'),
    ('Toyota', 'Innova', 'Diesel', 'Manual'),
    ('Mahindra', 'XUV700', 'Diesel', 'Automatic')
]

PROVIDERS = [
    'Apex Auto Care', 'City Honda Workshop', 'Maruti Authorized Service',
    'National Auto Garage', 'Speedy Lube & Service', 'Prime Motor Works'
]

def generate_synthetic_data(num_vehicles=1000):
    print(f'Generating {num_vehicles} synthetic vehicle records...')
    vehicles = []
    service_records = []

    vehicles.append({
        'vin': 'DEMO-VIN-HC-2019-001',
        'registration_number': 'MP04-AB-1234',
        'make': 'Honda',
        'model': 'City',
        'variant': 'VX',
        'year': 2019,
        'fuel_type': 'Petrol',
        'transmission': 'Manual',
        'current_odometer': 74100,
        'ownership_status': 'FIRST'
    })

    vehicles.append({
        'vin': 'DEMO-VIN-SW-2020-002',
        'registration_number': 'DL01-XY-5678',
        'make': 'Maruti Suzuki',
        'model': 'Swift',
        'variant': 'ZXI',
        'year': 2020,
        'fuel_type': 'Petrol',
        'transmission': 'Manual',
        'current_odometer': 54000,
        'ownership_status': 'SECOND'
    })

    vehicles.append({
        'vin': 'DEMO-VIN-CR-2018-003',
        'registration_number': 'MH02-CD-9012',
        'make': 'Hyundai',
        'model': 'Creta',
        'variant': 'SX',
        'year': 2018,
        'fuel_type': 'Diesel',
        'transmission': 'Automatic',
        'current_odometer': 98000,
        'ownership_status': 'SECOND'
    })

    for i in range(num_vehicles - 3):
        make, model, fuel, trans = random.choice(MAKES_MODELS)
        yr = random.randint(2015, 2023)
        v_id = f'VIN-{make[:2].upper()}{model[:2].upper()}-{yr}-{i+4:05d}'
        reg = f'{random.choice(["MH","DL","KA","MP","GJ"])}{random.randint(1,99):02d}-{chr(random.randint(65,90))}{chr(random.randint(65,90))}-{random.randint(1000,9999)}'
        odo = random.randint(15000, 140000)

        defect = random.random()
        if defect < 0.02:
            reg = None
        elif defect < 0.04:
            odo = -odo
        elif defect < 0.06:
            make = make.lower() + ' '

        vehicles.append({
            'vin': v_id,
            'registration_number': reg,
            'make': make,
            'model': model,
            'variant': 'Standard',
            'year': yr,
            'fuel_type': fuel,
            'transmission': trans,
            'current_odometer': abs(odo),
            'ownership_status': random.choice(['FIRST', 'SECOND', 'THIRD'])
        })

    for v in vehicles[:500]:
        num_services = random.randint(1, 5)
        for s_idx in range(num_services):
            s_year = v['year'] + s_idx + 1
            if s_year > 2026:
                continue
            service_records.append({
                'source_record_id': f'SRV-{random.randint(100000, 999999)}',
                'vin': v['vin'],
                'provider_name': random.choice(PROVIDERS),
                'service_date': f'{s_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}',
                'odometer_reading': random.randint(10000, 80000),
                'service_type': random.choice(['General Service', 'Oil & Filter Replacement', 'Brake Overhaul', 'Periodic Inspection']),
                'total_amount': float(random.randint(3000, 25000))
            })

    with open(os.path.join(raw_dir, 'vehicles.json'), 'w', encoding='utf-8') as f:
        json.dump(vehicles, f, indent=2)
    with open(os.path.join(raw_dir, 'service_records.json'), 'w', encoding='utf-8') as f:
        json.dump(service_records, f, indent=2)

    print(f'Saved {len(vehicles)} vehicles and {len(service_records)} service records into data/raw!')

if __name__ == '__main__':
    generate_synthetic_data(1000)
