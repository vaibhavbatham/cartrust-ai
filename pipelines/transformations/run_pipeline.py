import os
import json
import datetime
import sys
base = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai'
sys.path.insert(0, os.path.join(base, 'backend'))
sys.path.insert(0, base)

from pipelines.quality.quality_engine import DataQualityEngine
from pipelines.entity_resolution.entity_resolver import EntityResolver

def run_medallion_pipeline():
    raw_path = os.path.join(base, 'data', 'raw', 'vehicles.json')
    bronze_dir = os.path.join(base, 'data', 'bronze')
    silver_dir = os.path.join(base, 'data', 'silver')
    gold_dir = os.path.join(base, 'data', 'gold')

    os.makedirs(bronze_dir, exist_ok=True)
    os.makedirs(silver_dir, exist_ok=True)
    os.makedirs(gold_dir, exist_ok=True)

    if not os.path.exists(raw_path):
        print('Raw data not found. Running synthetic generator first...')
        import subprocess
        subprocess.run(['python', os.path.join(base, 'scripts', 'generate_synthetic_data.py')], check=True)

    with open(raw_path, 'r', encoding='utf-8') as f:
        raw_vehicles = json.load(f)

    # 1. BRONZE LAYER
    batch_id = f'BATCH-{datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")}'
    bronze_records = []
    for idx, r in enumerate(raw_vehicles):
        bronze_records.append({
            'source_system': 'SYNTHETIC_PROVIDER_FEED',
            'batch_id': batch_id,
            'source_record_id': f'SRC-{idx:06d}',
            'ingestion_timestamp': datetime.datetime.utcnow().isoformat(),
            'payload': r
        })
    with open(os.path.join(bronze_dir, 'bronze_vehicles.json'), 'w', encoding='utf-8') as f:
        json.dump(bronze_records[:500], f, indent=2)
    print(f'Bronze layer produced: {len(bronze_records)} ingested records.')

    # 2. SILVER LAYER
    silver_records = []
    all_dq_issues = []
    for item in bronze_records:
        rec = item['payload']
        issues = DataQualityEngine.validate_vehicle_record(rec)
        for iss in issues:
            iss['vin'] = rec.get('vin')
            iss['batch_id'] = batch_id
            all_dq_issues.append(iss)

        norm_vin = (rec.get('vin') or '').strip().upper()
        norm_make = (rec.get('make') or '').strip().title()
        norm_model = (rec.get('model') or '').strip().title()
        norm_odo = abs(rec.get('current_odometer', 0))

        golden_id, match_method, confidence = EntityResolver.resolve_vehicle(rec)

        silver_records.append({
            'golden_vehicle_id': golden_id,
            'match_method': match_method,
            'match_confidence': confidence,
            'vin': norm_vin,
            'registration_number': rec.get('registration_number'),
            'make': norm_make,
            'model': norm_model,
            'variant': rec.get('variant'),
            'year': rec.get('year'),
            'fuel_type': rec.get('fuel_type'),
            'transmission': rec.get('transmission'),
            'current_odometer': norm_odo,
            'ownership_status': rec.get('ownership_status'),
            'has_dq_defects': len(issues) > 0
        })

    with open(os.path.join(silver_dir, 'silver_vehicles.json'), 'w', encoding='utf-8') as f:
        json.dump(silver_records[:500], f, indent=2)
    with open(os.path.join(silver_dir, 'silver_dq_issues.json'), 'w', encoding='utf-8') as f:
        json.dump(all_dq_issues, f, indent=2)
    print(f'Silver layer produced: {len(silver_records)} cleaned records, {len(all_dq_issues)} DQ issues caught.')

    # 3. GOLD LAYER
    gold_summary = {
        'total_vehicles': len(silver_records),
        'high_confidence_matches': sum(1 for s in silver_records if s['match_confidence'] >= 0.8),
        'dq_defect_rate_pct': round(len(all_dq_issues) / len(silver_records) * 100, 2),
        'processed_at': datetime.datetime.utcnow().isoformat()
    }
    with open(os.path.join(gold_dir, 'gold_vehicle_summary.json'), 'w', encoding='utf-8') as f:
        json.dump(gold_summary, f, indent=2)
    print('Gold layer produced analytics-ready summaries!')

if __name__ == '__main__':
    run_medallion_pipeline()
