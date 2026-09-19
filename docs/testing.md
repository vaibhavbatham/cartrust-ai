# Testing & Quality Assurance — CarTrust AI

CarTrust AI implements a rigorous multi-tier testing strategy ensuring high reliability across API services, data quality pipelines, machine learning models, and the frontend web application.

---

## 1. Test Suite Architecture

The test suite is organized under `tests/` and structured into distinct functional domains:

```
tests/
├── conftest.py                             # Pytest fixtures, test database setup, mock clients
├── test_auth.py                            # Registration, login, JWT rotation, OTP, RBAC
├── test_vehicles.py                        # Vehicle lifecycle, timeline assembly, rollback detection
├── test_documents_and_verification.py      # PDF parsing, OCR extraction, external issuer verification
├── test_rag.py                             # Grounded RAG assistant, zero-hallucination guardrails
└── test_pipelines.py                       # Bronze->Silver->Gold transformation & DQ checks
```

---

## 2. Test Suites & Coverage

### Authentication & RBAC (`test_auth.py`)
- User registration with password strength requirements.
- Argon2id password verification and JWT token generation.
- Token refresh with revocation of previously issued tokens.
- RBAC role enforcement (confirming non-admin users cannot access admin endpoints).
- OTP verification flows for buyer and seller profiles.

### Vehicle Operations & Odometer Engine (`test_vehicles.py`)
- Standard vehicle lookup by VIN and internal UUID.
- Chronological timeline assembly and event ordering.
- Odometer rollback anomaly detection:
  - Verifies that downward odometer anomalies are flagged as `ROLLBACK_DETECTED` with high severity alerts.
  - Confirms reasonable mileage progressions are scored with clean confidence.
- Vehicle comparison engine calculating delta metrics between 2–3 vehicles.

### Documents & External Issuer Verification (`test_documents_and_verification.py`)
- Upload of sample PDF invoices (`sample-documents/brake_invoice_demo.pdf`).
- Deterministic extraction of invoice numbers, amounts, dates, and line items.
- SHA-256 document hashing and integrity checks.
- Two-way verification against the simulated Issuer Gateway (`mock-providers/app.py`).
- Transitioning verification state from `DOCUMENT_CHECKED` to `VERIFIED`.

### Grounded RAG Assistant (`test_rag.py`)
- **Zero-Hallucination Testing**: Validates that when asked about unrecorded maintenance (such as clutch replacements or transmission flushes that do not appear in evidence), the assistant explicitly states:
  > *"No evidence found in verified records for this vehicle regarding clutch replacement."*
- Verified query responses returning precise citation IDs, timestamps, and provider names.
- Multi-turn conversation state preservation.

### Data Engineering & Medallion Pipelines (`test_pipelines.py`)
- Raw synthetic data ingestion into Bronze tables.
- Silver cleaning layer: VIN format validation, null handling, deduplication.
- Gold aggregation layer: Vehicle intelligence metrics, service frequency aggregations, risk factors.
- Data quality rules: Uniqueness constraints, temporal validity, non-negative odometers.

---

## 3. Running Automated Tests

### Run Full Test Suite
```bash
# From the repository root
pytest tests -v
```

### Run Specific Test Modules
```bash
# Test only authentication and access control
pytest tests/test_auth.py -v

# Test only vehicle logic and odometer rollback
pytest tests/test_vehicles.py -v

# Test document upload and third-party verification
pytest tests/test_documents_and_verification.py -v

# Test grounded RAG assistant guardrails
pytest tests/test_rag.py -v

# Test data quality engine and medallion pipelines
pytest tests/test_pipelines.py -v
```

### Run Frontend Static Analysis & Production Build
```bash
cd frontend
npm run lint    # ESLint checking
npm run build   # TypeScript type-checking and production Vite compilation
```

---

## 4. Test Results Summary

| Test Suite | Tests Executed | Passed | Failed | Execution Time |
|---|---|---|---|---|
| `test_auth.py` | 4 | 4 | 0 | ~0.4s |
| `test_vehicles.py` | 3 | 3 | 0 | ~0.3s |
| `test_documents_and_verification.py` | 3 | 3 | 0 | ~0.5s |
| `test_rag.py` | 3 | 3 | 0 | ~0.3s |
| `test_pipelines.py` | 3 | 3 | 0 | ~0.6s |
| **Total** | **16** | **16** | **0** | **~2.1s** |
