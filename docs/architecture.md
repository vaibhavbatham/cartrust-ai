# Architecture Documentation — CarTrust AI

CarTrust AI is architected around the core principle of **truth-in-evidence**: the platform never claims knowledge that available, verifiable evidence cannot prove.

## Key Subsystems

### 1. Data Ingestion & Medallion Pipeline
- **Raw Layer**: Landed unmodified payloads from service centers, inspection logs, insurance carriers, and user-uploaded invoices.
- **Bronze Layer**: Append-only storage with immutable provenance metadata (`source_system`, `batch_id`, `ingestion_timestamp`).
- **Silver Layer**: Cleansed and standardized records. Enforces Data Quality rules (VIN checksums, non-negative mileage, chronological bounds) and performs vehicle entity resolution.
- **Gold Layer**: Feature aggregates, vehicle timeline facts, odometer progressions, and risk metrics.

### 2. Evidence Engine & Verification State Machine
Every recorded fact transitions through discrete verification states:
- `UNVERIFIED`: Raw claim or self-reported record without independent corroboration.
- `DOCUMENT_CHECKED`: Document has undergone OCR parsing and basic structural validation.
- `PARTIALLY_VERIFIED`: Corroborated by partial matches or secondary sources.
- `VERIFIED`: Independently verified via service provider API gateway or certified issuer.
- `INCONSISTENT`: Discrepancy between reported and verified values (e.g. amount mismatch or date conflict).
- `REJECTED`: Proven fraudulent or malformed.

### 3. Odometer Inconsistency Engine
- Analyzes chronological mileage sequences.
- Flags decreases in odometer readings as `ODOMETER_ROLLBACK_SUSPECTED`.
- Analyzes rate of travel to detect mathematically impossible speed (>1000 km/day).

### 4. Machine Learning Suite
- **Model A (Random Forest)**: Predicts upcoming maintenance risk based on vehicle age, mileage, time/distance since last service, and historical anomalies.
- **Model B (Isolation Forest)**: Detects multi-dimensional anomalies in vehicle service patterns.
- Evaluation metrics persisted in `ml/evaluation/metrics.json`.

### 5. Grounded GenAI Assistant
- RAG engine restricted by system prompts to retrieved records.
- Classifies uncertainty: `KNOWN`, `REPORTED`, `INFERRED`, `UNKNOWN`.
- Truthful fallback: Answers questions regarding unrecorded maintenance (e.g., clutch replacement) with: *"I found no available evidence confirming a clutch replacement for this vehicle."*
