-- ============================================================
-- CarTrust AI — Power BI & Analytics Gold Views
-- Pre-aggregated SQL views for enterprise BI reporting & executive dashboards
-- ============================================================

-- 1. Vehicle Processing & Coverage Metrics
CREATE VIEW IF NOT EXISTS vw_powerbi_vehicle_coverage AS
SELECT 
    v.id AS vehicle_id,
    v.vin,
    v.make,
    v.model,
    v.year,
    v.current_odometer,
    COUNT(DISTINCT e.id) AS total_evidence_count,
    COUNT(DISTINCT CASE WHEN e.verification_status = 'VERIFIED' THEN e.id END) AS verified_evidence_count,
    COUNT(DISTINCT CASE WHEN e.verification_status = 'PARTIALLY_VERIFIED' THEN e.id END) AS partially_verified_count,
    COUNT(DISTINCT CASE WHEN e.verification_status = 'UNVERIFIED' THEN e.id END) AS unverified_count,
    COUNT(DISTINCT CASE WHEN e.verification_status = 'INCONSISTENT' THEN e.id END) AS inconsistent_count,
    ROUND(CAST(COUNT(DISTINCT CASE WHEN e.verification_status = 'VERIFIED' THEN e.id END) AS FLOAT) / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 2) AS verified_evidence_pct
FROM vehicles v
LEFT JOIN evidence e ON v.id = e.vehicle_id
GROUP BY v.id, v.vin, v.make, v.model, v.year, v.current_odometer;

-- 2. Odometer Anomaly Monitoring
CREATE VIEW IF NOT EXISTS vw_powerbi_odometer_anomalies AS
SELECT 
    v.id AS vehicle_id,
    v.vin,
    v.make,
    v.model,
    COUNT(o.id) AS total_readings,
    SUM(CASE WHEN o.is_flagged = 1 OR o.is_flagged = TRUE THEN 1 ELSE 0 END) AS flagged_readings_count,
    MAX(o.reading) - MIN(o.reading) AS lifetime_mileage_spread
FROM vehicles v
JOIN odometer_readings o ON v.id = o.vehicle_id
GROUP BY v.id, v.vin, v.make, v.model;

-- 3. Insurance Claims Breakdown
CREATE VIEW IF NOT EXISTS vw_powerbi_claims_by_type AS
SELECT 
    claim_type,
    damage_area,
    severity,
    COUNT(*) AS total_claims,
    SUM(claim_amount) AS total_claims_cost,
    AVG(claim_amount) AS avg_claim_cost
FROM insurance_events
GROUP BY claim_type, damage_area, severity;

-- 4. Data Quality Violations Summary
CREATE VIEW IF NOT EXISTS vw_powerbi_dq_summary AS
SELECT 
    rule,
    severity,
    status,
    COUNT(*) AS issue_count,
    MIN(detected_at) AS first_detected,
    MAX(detected_at) AS last_detected
FROM data_quality_issues
GROUP BY rule, severity, status;
