# End-to-End Demo Walkthrough — CarTrust AI

This guide walks through the 13 canonical demonstration scenarios of the CarTrust AI platform, showcasing its data integrity, evidence provenance, machine learning risk models, and grounded AI assistant.

---

## Pre-Requisites & Demo Accounts

Ensure the platform is running locally (via `python scripts/run_local.py` or Docker Compose) and the database is seeded (`python scripts/seed_demo.py`).

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Buyer** | `customer@cartrust.demo` | `DemoPassword123!` | Public Search, Vehicle Detail, RAG Assistant, Compare |
| **Mechanic** | `mechanic@cartrust.demo` | `DemoPassword123!` | Service Logging, Invoice Upload, Issuer Verification |
| **Admin** | `admin@cartrust.demo` | `DemoPassword123!` | Evidence Moderation, Audit Trails, DQ Engine Health |

---

## Scenario Walkthroughs

### Scenario 1: Authentication & Role Switch
1. Navigate to `http://localhost:5173/login`.
2. Enter `customer@cartrust.demo` and `DemoPassword123!`.
3. Verify successful authentication, redirection to `/dashboard`, and display of user role (`BUYER`) in the navigation bar.

### Scenario 2: Search & Vehicle Discovery (Clean History)
1. In the search bar on the Dashboard or Landing page, search for:
   `DEMO-VIN-HC-2019-001` (or registration `DL-01-AB-1234`).
2. Click on the 2019 Honda Civic result.
3. Observe:
   - High Trust Score: **94/100 (A Grade - Excellent)**.
   - Low Maintenance Risk Index: **12%**.
   - Verified clean title with 0 active alerts.

### Scenario 3: Trust Score & Multi-Factor Intelligence Breakdown
1. On the vehicle detail page, navigate to the **Intelligence** tab.
2. Review the four core sub-scores:
   - **Odometer Integrity (98%)**: Monotonically increasing readings.
   - **Maintenance Consistency (92%)**: Adherence to manufacturer service schedule.
   - **Damage & Loss History (100%)**: No structural accident records or salvage titles.
   - **Evidence Confidence (88%)**: High ratio of issuer-verified invoices.
3. Observe the ML Random Forest Maintenance Risk prediction and feature importance weights.

### Scenario 4: Chronological Timeline & Evidence Provenance
1. Click the **Timeline** tab for `DEMO-VIN-HC-2019-001`.
2. Inspect the chronological sequence of events (Delivery, 10,000 km Service, 25,000 km Brake Service, 40,000 km Inspection).
3. Click on the **25,000 km Brake Service** event.
4. Expand the **Evidence Drawer** to view the associated tax invoice (`INV-2021-8841`), issuer name (`Metro Honda Care`), and cryptographic verification status.

### Scenario 5: Odometer Rollback Anomaly Detection
1. Search for vehicle: `DEMO-VIN-SW-2020-002` (2020 Maruti Suzuki Swift).
2. Look at the critical banner warning: **CRITICAL ALERT: Odometer Rollback Detected**.
3. Switch to the **Odometer** tab.
4. Review the anomaly chart and reading log:
   - *2021-04-10*: 18,200 km (Recorded at Authorized Service).
   - *2022-06-15*: 34,500 km (Annual Roadworthiness Inspection).
   - *2023-01-20*: **21,000 km** (Marketplace Listing / Dealership Inspection).
5. The rollback anomaly engine highlights the **-13,500 km downward drop** and flags it with severity `CRITICAL` and confidence `99%`.

### Scenario 6: Maintenance Gap Analysis (Sparse History)
1. Search for vehicle: `DEMO-VIN-CR-2018-003` (2018 Hyundai Creta).
2. Observe Trust Score: **48/100 (D Grade - High Risk)**.
3. Go to the **Maintenance** tab.
4. Review the gap analysis table:
   - Over 36 months and 45,000 km without recorded oil changes or scheduled manufacturer inspections.
   - Missing major timing belt inspection at 60,000 km.
   - ML Maintenance Risk Model flags this vehicle as **HIGH RISK (82%)** for impending component failure.

### Scenario 7: Insurance Claim & Structural Damage Flag
1. For `DEMO-VIN-CR-2018-003`, switch to the **Damage & Claims** tab.
2. Review the verified insurance event from *2021-11-12*:
   - Claim Type: **Frontal Collision**.
   - Structural Impact: **Front Subframe & Radiator Core Support**.
   - Claim Payout: $6,400.
3. Note that the evidence is tagged as `INSURER_RECORD` with confidence `95%`.

### Scenario 8: Document Upload & Deterministic OCR
1. Log in as `mechanic@cartrust.demo` (or use the customer account).
2. Navigate to `/upload` (or click "Upload Invoice" on the vehicle page).
3. Select vehicle `DEMO-VIN-HC-2019-001`.
4. Upload `sample-documents/brake_invoice_demo.pdf`.
5. Click **Process Document**.
6. Watch the real-time extraction pipeline:
   - Extracts Invoice Number: `INV-2022-9901`
   - Extracts Issuer: `Downtown Auto Care Centre`
   - Extracts Tax ID: `TAX-998822`
   - Extracts Total Amount: `$342.50`
   - Extracts Line Items: Brake Rotor Resurfacing, Ceramic Brake Pads, Labor
   - Computes document SHA-256 hash and sets state to `DOCUMENT_CHECKED`.

### Scenario 9: Independent External Issuer Gateway Attestation
1. After uploading, click **Verify with Issuer Gateway**.
2. CarTrust AI submits the extracted invoice metadata directly to the simulated external issuer endpoint (`http://localhost:8001/api/v1/mock-issuer/verify`).
3. The gateway checks its internal ledger, validates the invoice amount, provider registration, and timestamp.
4. The system updates the invoice state from `DOCUMENT_CHECKED` to **`VERIFIED`** with an attestation timestamp and confidence score of 1.0.

### Scenario 10: Grounded RAG Assistant & Zero-Hallucination Guardrail
1. Navigate to `/assistant` (or click the AI Assistant widget).
2. Select vehicle `DEMO-VIN-HC-2019-001`.
3. Ask a verified question:
   > *"When were the front brake pads last replaced and at what mileage?"*
   - Response returns exact evidence citation: Replaced at 25,000 km on 2021-08-14 at Metro Honda Care (Invoice `INV-2021-8841`).
4. Ask a question regarding unrecorded maintenance:
   > *"Has the clutch plate ever been replaced on this vehicle?"*
   - Response demonstrates **zero-hallucination guardrail**:
   > *"Based on all verified records, there is NO evidence of clutch replacement for this vehicle. CarTrust AI records do not indicate any clutch or transmission maintenance."*

### Scenario 11: Dynamic PDF Report Generation & Download
1. On `DEMO-VIN-HC-2019-001` vehicle page, click **Download Official Intelligence Report (PDF)**.
2. The backend dynamically compiles a multi-page ReportLab PDF including:
   - Header with VIN, Verification Seal, and Generation Timestamp.
   - Trust Score Gauge and Multi-Category Health Matrix.
   - Odometer Progression Graph and Certified Mileage Log.
   - Complete Itemized Evidence Table with Verification States.
   - Cryptographic Report Fingerprint (SHA-256) for offline verification.
3. Open the downloaded PDF and inspect the professional formatting.

### Scenario 12: Side-by-Side Vehicle Comparison
1. Navigate to `/compare`.
2. Select or enter:
   - Vehicle 1: `DEMO-VIN-HC-2019-001` (Honda Civic)
   - Vehicle 2: `DEMO-VIN-SW-2020-002` (Suzuki Swift)
   - Vehicle 3: `DEMO-VIN-CR-2018-003` (Hyundai Creta)
3. Click **Compare Vehicles**.
4. Review the side-by-side comparison matrix:
   - Trust Score comparison (94 vs 42 vs 48).
   - Odometer consistency (Clean vs Rollback vs Incomplete).
   - Maintenance compliance percentage.
   - Structural accident flags.
   - Total verified service spend.

### Scenario 13: Admin Governance, DQ Monitoring & Audit Logs
1. Log in with `admin@cartrust.demo` / `DemoPassword123!`.
2. Navigate to `/admin`.
3. View the **Administrative Governance Center**:
   - **System Telemetry**: Total registered vehicles, verified documents, active alerts.
   - **Data Quality (DQ) Violations**: Real-time list of detected pipeline anomalies (e.g., negative odometer readings, malformed VINs, temporal inversions).
   - **Evidence Review Queue**: Ability to manually inspect and approve/reject pending evidence documents.
   - **Immutable Audit Trail**: Chronological log of all user logins, document uploads, and administrative actions with IP addresses and change diffs.
