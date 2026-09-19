export const DEMO_FLEET: any[] = [
  {
    id: '8477bd04-8038-458a-8be7-7812c5327892',
    vin: 'DEMO-VIN-HC-2019-001',
    registration_number: 'MP04AB1234',
    make: 'Honda',
    model: 'City',
    variant: '1.5 i-VTEC VX',
    year: 2019,
    registration_year: 2019,
    fuel_type: 'Petrol',
    transmission: 'Manual',
    current_odometer: 74100,
    price: 820000.0,
    location: 'Bhopal, Madhya Pradesh',
    color: 'Platinum White Pearl',
    engine_capacity: '1498 cc',
    engine_type: '1.5L i-VTEC DOHC 4-Cylinder',
    seating_capacity: 5,
    body_type: 'Sedan',
    mileage_efficiency: '17.8 km/l ARAI',
    is_synthetic: true,
    history_coverage_pct: 94.0,
    verified_invoices_count: 24,
    service_records_count: 6,
    description: 'Single owner Honda City VX Manual in pristine showroom condition. Comprehensive dealer service history with zero flood damage.'
  },
  {
    id: '763bd497-af6f-43c9-9ee3-76fee38c1cb5',
    vin: 'DEMO-VIN-SW-2020-002',
    registration_number: 'DL01XY5678',
    make: 'Maruti Suzuki',
    model: 'Swift',
    variant: 'ZXI Plus',
    year: 2020,
    registration_year: 2020,
    fuel_type: 'Petrol',
    transmission: 'Manual',
    current_odometer: 54000,
    price: 580000.0,
    location: 'New Delhi, Delhi',
    color: 'Solid Fire Red',
    engine_capacity: '1197 cc',
    engine_type: '1.2L K-Series DualJet Dual VVT',
    seating_capacity: 5,
    body_type: 'Hatchback',
    mileage_efficiency: '23.2 km/l ARAI',
    is_synthetic: true,
    history_coverage_pct: 68.0,
    verified_invoices_count: 4,
    service_records_count: 4,
    description: 'Maruti Suzuki Swift ZXI with verified periodic service history. Note: Odometer rollback flag recorded in CarTrust system.'
  },
  {
    id: 'dc953ad0-21c1-45e0-a6f6-dad8c4543bd3',
    vin: 'DEMO-VIN-CR-2018-003',
    registration_number: 'HR26CR9900',
    make: 'Hyundai',
    model: 'Creta',
    variant: 'SX Dual Tone Diesel',
    year: 2018,
    registration_year: 2018,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    current_odometer: 86400,
    price: 940000.0,
    location: 'Gurugram, Haryana',
    color: 'Phantom Black',
    engine_capacity: '1582 cc',
    engine_type: '1.6L CRDi VGT Diesel',
    seating_capacity: 5,
    body_type: 'SUV',
    mileage_efficiency: '17.1 km/l ARAI',
    is_synthetic: true,
    history_coverage_pct: 52.0,
    verified_invoices_count: 2,
    service_records_count: 2,
    description: 'Hyundai Creta SX Diesel Automatic. Verified collision claim documented in CarTrust insurance records with OEM repairs.'
  },
  {
    id: '67ff247e-2472-42d9-b032-4b7cb321d1db',
    vin: 'DEMO-VIN-NX-2022-004',
    registration_number: 'MP04NZ4422',
    make: 'Tata Motors',
    model: 'Nexon',
    variant: 'Fearless+ Diesel AMT',
    year: 2022,
    registration_year: 2022,
    fuel_type: 'Diesel',
    transmission: 'Automatic',
    current_odometer: 28500,
    price: 1180000.0,
    location: 'Bhopal, Madhya Pradesh',
    color: 'Daytona Grey',
    engine_capacity: '1497 cc',
    engine_type: '1.5L Turbocharged Revotorq',
    seating_capacity: 5,
    body_type: 'Compact SUV',
    mileage_efficiency: '24.1 km/l ARAI',
    is_synthetic: true,
    history_coverage_pct: 88.0,
    verified_invoices_count: 8,
    service_records_count: 3,
    description: 'Single owner Tata Nexon with comprehensive authorized Tata Motors service history and zero insurance claims.'
  },
  {
    id: 'f4e0a613-ac66-435e-8421-b19c13738612',
    vin: 'DEMO-VIN-IC-2021-005',
    registration_number: 'MH12AB9999',
    make: 'Toyota',
    model: 'Innova Crysta',
    variant: '2.4 ZX 7-Seater',
    year: 2021,
    registration_year: 2021,
    fuel_type: 'Diesel',
    transmission: 'Manual',
    current_odometer: 62000,
    price: 2250000.0,
    location: 'Pune, Maharashtra',
    color: 'Super White',
    engine_capacity: '2393 cc',
    engine_type: '2.4L 2GD-FTV Inline-4 Turbo Diesel',
    seating_capacity: 7,
    body_type: 'MUV',
    mileage_efficiency: '15.6 km/l ARAI',
    is_synthetic: true,
    history_coverage_pct: 96.0,
    verified_invoices_count: 16,
    service_records_count: 5,
    description: 'Toyota Innova Crysta 2.4 ZX top-model. Flawless Toyota dealer maintenance log, 7 captain seats, impeccably maintained.'
  }
];

export function findDemoVehicle(query: string) {
  const norm = query.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return DEMO_FLEET.find(v => 
    v.id === query ||
    v.vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === norm ||
    (v.registration_number && v.registration_number.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === norm)
  ) || DEMO_FLEET[0];
}

export function getDemoResponse(url: string, method: string = 'get', body?: any): { data: any } {
  const cleanUrl = url.replace(/^\/api\/v1/, '');

  if (cleanUrl === '/vehicles' || cleanUrl.startsWith('/vehicles?')) {
    return { data: DEMO_FLEET };
  }

  if (cleanUrl.startsWith('/vehicles/validate-plate/')) {
    const plate = cleanUrl.split('/')[3] || '';
    const v = findDemoVehicle(plate);
    return {
      data: {
        input_plate: plate,
        normalized_plate: plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
        is_valid: true,
        exists: !!v,
        message: 'Plate validated successfully',
        vehicle_id: v ? v.id : null
      }
    };
  }

  // Check /vehicles/:id or subroutes
  const vehicleMatch = cleanUrl.match(/^\/vehicles\/([^/?#]+)(.*)$/);
  if (vehicleMatch) {
    const vId = vehicleMatch[1];
    const sub = vehicleMatch[2];
    const v = findDemoVehicle(vId);

    if (sub === '' || sub === '/') {
      return { data: v };
    }
    if (sub === '/intelligence') {
      return {
        data: {
          vehicle_id: v.id,
          vin: v.vin,
          history_coverage_pct: v.history_coverage_pct || 88,
          maintenance_evidence_rating: 'HIGH',
          odometer_consistency_status: v.vin.includes('SW-2020') ? 'WARNING' : 'CONSISTENT',
          accident_summary: v.vin.includes('CR-2018') ? 'Front subframe repair on record' : 'No collision claims recorded',
          verified_claims_count: v.vin.includes('CR-2018') ? 1 : 0,
          data_conflicts_count: v.vin.includes('SW-2020') ? 1 : 0,
          open_alerts_count: 0
        }
      };
    }
    if (sub === '/timeline') {
      return {
        data: [
          { event_date: `${v.year}-04-10`, event_type: 'MANUFACTURE', title: 'Vehicle Rollout & OEM Inspection', description: `${v.make} Certified Factory Assembly`, odometer: 0, source: 'MANUFACTURER' },
          { event_date: `${v.year}-05-18`, event_type: 'REGISTRATION', title: 'RTO Registration & Number Plate Allocation', description: `Registered as ${v.registration_number}`, odometer: 120, source: 'RTO' },
          { event_date: `${v.year + 1}-06-15`, event_type: 'SERVICE', title: 'Periodic Maintenance & Oil Change', description: 'Authorized Dealer 10,000 km Scheduled Service', odometer: 10500, source: 'AUTHORIZED_SERVICE' },
          { event_date: '2025-03-10', event_type: 'SERVICE', title: 'Annual Comprehensive Inspection & Fluid Replacement', description: 'Document-backed full service with genuine OEM components', odometer: v.current_odometer, source: 'AUTHORIZED_SERVICE' }
        ]
      };
    }
    if (sub === '/service-history') {
      return {
        data: {
          total_expenditure: 24500,
          verified_expenditure: 24500,
          records_count: 3,
          records: [
            {
              id: 'srv-1',
              service_date: '2025-03-10',
              service_center: `${v.make} Authorized Center`,
              service_type: 'Periodic Maintenance',
              work_performed: 'Synthetic Engine Oil, Oil Filter, Air Filter, Front Brake Inspection',
              odometer_reading: v.current_odometer,
              total_amount: 8700,
              labor_cost: 2500,
              parts_cost: 6200,
              verification_status: 'VERIFIED',
              record_source: 'DOCUMENT_VERIFIED'
            },
            {
              id: 'srv-2',
              service_date: '2024-02-18',
              service_center: `${v.make} Authorized Center`,
              service_type: 'Brake Service & Pad Replacement',
              work_performed: 'Front Disc Brake Pads Replacement, Caliper Pin Greasing',
              odometer_reading: Math.max(0, v.current_odometer - 15000),
              total_amount: 6200,
              labor_cost: 1800,
              parts_cost: 4400,
              verification_status: 'VERIFIED',
              record_source: 'DOCUMENT_VERIFIED'
            }
          ]
        }
      };
    }
    if (sub === '/invoices') {
      return {
        data: [
          {
            id: 'inv-1',
            invoice_number: 'INV-2025-8841',
            vendor_name: `${v.make} Official Workshop`,
            invoice_date: '2025-03-10',
            category: 'MAINTENANCE',
            total_amount: 8700,
            odometer_reading: v.current_odometer,
            verification_status: 'VERIFIED',
            download_url: '#'
          }
        ]
      };
    }
    if (sub === '/claims') {
      if (v.vin.includes('CR-2018')) {
        return {
          data: [
            {
              claim_number: 'CLM-2021-CR-4402',
              claim_date: '2021-11-12',
              claim_type: 'COLLISION',
              damage_area: 'Front Subframe & Radiator Core Support',
              severity: 'MAJOR',
              claim_amount: 185000.0,
              repair_status: 'REPAIRED_OEM'
            }
          ]
        };
      }
      return { data: [] };
    }
    if (sub === '/odometer') {
      const isRollback = v.vin.includes('SW-2020');
      return {
        data: {
          rollback_detected: isRollback,
          status: isRollback ? 'WARNING' : 'CONSISTENT',
          total_readings: 4,
          anomalies: isRollback ? [{ reading: 54000, date: '2026-01-20', delta_km: -24000 }] : [],
          explanation: isRollback 
            ? 'Odometer rollback anomaly detected: reading dropped from 78,000 km to 54,000 km between dealer listing and seller submission.'
            : 'Odometer progression verified consistent across all chronological checkpoints.'
        }
      };
    }
  }

  // Compare endpoint
  if (cleanUrl.startsWith('/compare') || cleanUrl.startsWith('/vehicles/compare')) {
    const ids = (body && body.vehicle_ids) || [DEMO_FLEET[0].id, DEMO_FLEET[1].id];
    const compared = ids.map((idStr: string) => {
      const v = findDemoVehicle(idStr);
      return {
        vehicle_id: v.id,
        vin: v.vin,
        registration_number: v.registration_number,
        make: v.make,
        model: v.model,
        variant: v.variant,
        year: v.year,
        fuel_type: v.fuel_type,
        transmission: v.transmission,
        engine_capacity: v.engine_capacity,
        engine_type: v.engine_type,
        seating_capacity: v.seating_capacity,
        color: v.color,
        body_type: v.body_type,
        mileage: v.current_odometer,
        price: v.price,
        location: v.location,
        service_records_count: v.service_records_count || 4,
        repair_records_count: 1,
        verified_invoices_count: v.verified_invoices_count || 6,
        total_maintenance_expenditure: 24500.0,
        latest_service_date: '2025-03-10',
        latest_odometer_reading: v.current_odometer,
        accident_claims_count: v.vin.includes('CR-2018') ? 1 : 0,
        history_coverage_pct: v.history_coverage_pct || 85,
        maintenance_evidence_rating: 'HIGH',
        verified_claims_count: v.vin.includes('CR-2018') ? 1 : 0,
        odometer_consistency_status: v.vin.includes('SW-2020') ? 'WARNING' : 'CONSISTENT',
        data_conflicts_count: v.vin.includes('SW-2020') ? 1 : 0,
        ownership_status: 'FIRST',
        factual_highlights: [
          `Documented odometer reading: ${v.current_odometer.toLocaleString()} km`,
          `${v.verified_invoices_count || 6} verified service invoices on record`,
          v.vin.includes('CR-2018') ? '1 documented insurance collision claim' : 'Zero reported insurance damage claims'
        ]
      };
    });

    return {
      data: {
        comparison: compared,
        vehicles: compared,
        highlights: [
          `Comparing ${compared.map((c: any) => `${c.make} ${c.model}`).join(' vs ')}.`,
          `Mileage differs by ${(Math.abs(compared[0].mileage - (compared[1]?.mileage || 0))).toLocaleString()} km.`,
          'Side-by-side evidence matrix compiled from CarTrust verified records.'
        ],
        neutral_analysis: 'Factual Comparative Observations: Both vehicles show documented service histories. CarTrust provides neutral data to empower independent buyer verification.'
      }
    };
  }

  // Assistant query endpoint
  if (cleanUrl.startsWith('/assistant/query')) {
    const q = (body && body.query) || '';
    const v = findDemoVehicle((body && body.vehicle_id) || '');
    return {
      data: {
        answer: `[Grounded CarTrust Record for ${v.make} ${v.model} (${v.registration_number})]: The recorded odometer is ${v.current_odometer.toLocaleString()} km with ${v.verified_invoices_count || 6} verified service invoices on file. No structural discrepancies detected beyond recorded registry logs.`,
        grounded_evidence: [],
        actions: [],
        suggested_questions: [
          'What is the recorded service history?',
          'Are there any insurance claims?',
          'What is the fuel efficiency?'
        ],
        uncertainty_level: 'KNOWN',
        disclaimer: 'Generated from CarTrust verified database records.'
      }
    };
  }

  if (cleanUrl.startsWith('/auth/')) {
    return {
      data: {
        access_token: 'demo-token-cartrust-gh-pages',
        token_type: 'bearer',
        user: {
          id: 'demo-user-id',
          email: 'customer@cartrust.demo',
          first_name: 'Rahul',
          last_name: 'Sharma',
          roles: ['CUSTOMER']
        }
      }
    };
  }

  return { data: {} };
}
