# Security & Trust Architecture — CarTrust AI

CarTrust AI is engineered with defense-in-depth principles across authentication, authorization, evidence integrity, input validation, and auditability.

---

## 1. Authentication & Session Management

- **Password Security**: Passwords are cryptographically hashed using **Argon2id** (the winner of the Password Hashing Competition) with high memory cost parameters (`time_cost=3`, `memory_cost=65536`, `parallelism=4`), providing maximum resistance against GPU/ASIC brute-force attacks.
- **Stateless Access Tokens**: Short-lived JSON Web Tokens (JWT) using `HS256` (or `RS256` in production cloud deployments) with a 15-minute expiration horizon.
- **Refresh Token Rotation**: Sliding-window refresh tokens (7-day validity) stored as salted hashes in the database. When a refresh token is exchanged, it is immediately revoked and replaced with a newly issued token pair to prevent replay attacks.
- **Multi-Factor & Mobile Verification**: OTP-based verification flow for user phone numbers and email confirmation tokens prior to permitting vehicle ownership claims.

---

## 2. Role-Based Access Control (RBAC)

CarTrust AI enforces strict principle-of-least-privilege access across 8 discrete roles:

| Role | Scope & Permissions |
|---|---|
| `BUYER` | Search vehicles, view public timelines, run grounded RAG queries, generate buyer reports, compare vehicles. |
| `SELLER` | Onboard personal vehicles, upload service history evidence, request verification reports. |
| `DEALER` | Batch inventory ingestion, wholesale discrepancy analysis, bulk report export. |
| `SERVICE_CENTER` | Record certified maintenance events, issue digital work orders, sign off on repaired items. |
| `INSURER` | Log verified damage claims, hail/flood loss reports, and salvage brandings. |
| `INSPECTOR` | Submit comprehensive multi-point roadworthiness inspections and component health grades. |
| `ANALYST` | Access aggregated analytics, model evaluation metrics, and market telemetry views. |
| `ADMIN` | Full administrative oversight: manual evidence moderation, user management, audit review, and DQ overrides. |

Role enforcement is handled via FastAPI dependency injection guards (`require_role("ADMIN")`), preventing privilege escalation.

---

## 3. Evidence Provenance & Cryptographic Integrity

1. **SHA-256 Content Hashing**: Every uploaded invoice or inspection document is hashed immediately upon upload. The SHA-256 digest is stored in the `documents` table, creating an immutable cryptographic fingerprint that guarantees files cannot be altered post-upload.
2. **Deterministic Extraction Verification**: Extracted invoice numbers, vendor names, dates, and amounts are validated against external issuer gateways via HMAC-signed or HTTPS API queries.
3. **Evidence Classification Taxonomy**:
   - `VERIFIED`: Confirmed directly by an authorized issuer API or cryptographically signed provider payload.
   - `DOCUMENT_CHECKED`: Validated by OCR checksum and format validation, but awaiting third-party provider attestation.
   - `PARTIALLY_VERIFIED`: Provider matched but invoice amount or itemized details show minor variance.
   - `UNVERIFIED`: Uploaded receipt without independent issuer or registry confirmation.
   - `INCONSISTENT`: Conflicts detected with official state registration, odometer timelines, or duplicate invoice numbers.
   - `REJECTED`: Proven fraudulent, altered, or issued by an unaccredited vendor.

---

## 4. Input Sanitization & Threat Mitigation

- **SQL Injection Prevention**: All database queries utilize SQLAlchemy 2.0 ORM query builders and strictly parameterized statements. Raw string concatenation in SQL queries is prohibited.
- **Strict Schema Enforcement**: Pydantic v2 schemas validate all request bodies, query parameters, and headers before business logic execution. Invalid VINs, malformed emails, or negative odometers fail at the API gateway layer.
- **Cross-Site Scripting (XSS) Mitigation**: React frontend sanitizes dynamic HTML bindings by default. Sensitive attributes (like URLs and download links) are validated against strict protocols (`https:`, `blob:`).
- **Cross-Origin Resource Sharing (CORS)**: Configurable origin allowlisting in FastAPI prevents unauthorized cross-origin calls from malicious domains.
- **File Upload Security**: Uploaded files are checked against allowed MIME types (`application/pdf`, `image/jpeg`, `image/png`) and file size limits (10MB maximum). Storage keys use randomized UUIDs to prevent directory traversal attacks.

---

## 5. Audit Logging & Compliance

- **Immutable Audit Trail**: All privileged actions (user creation, evidence moderation, vehicle onboarding, manual overrides) write an append-only entry to `audit_logs`.
- **Logged Metadata**:
  - `user_id`: Authenticated actor.
  - `action`: E.g., `EVIDENCE_APPROVED`, `VEHICLE_ONBOARDED`, `ODOMETER_OVERRIDE`.
  - `resource_type` & `resource_id`: Target database entity.
  - `ip_address` & `user_agent`: Request provenance.
  - `payload_diff`: JSON representation of previous vs updated state.
- **Zero-Knowledge Evidence Assertion**: Grounded RAG assistants never expose unauthenticated personal owner data or speculate beyond recorded facts.
