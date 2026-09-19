# REST API Reference — CarTrust AI

All endpoints reside under `/api/v1`. Interactive Swagger documentation is accessible at `/docs`.

## Authentication & Identity

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user account | No |
| `POST` | `/auth/login` | Authenticate and obtain access + refresh tokens | No |
| `POST` | `/auth/google` | Authenticate or register with Google ID token / credentials | No |
| `POST` | `/auth/refresh` | Rotate access & refresh tokens | No |
| `POST` | `/auth/verify-email` | Verify email with security token | No |
| `POST` | `/auth/phone/otp-request` | Request mobile verification OTP (Dev: `123456`) | No |
| `POST` | `/auth/phone/otp-verify` | Verify mobile phone OTP | Yes |
| `GET` | `/me` | Get current authenticated user profile | Yes |
| `PATCH` | `/me` | Update user profile | Yes |

## Vehicles & Intelligence

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/vehicles` | List or search vehicles by registration plate, VIN, make, model | Optional |
| `POST` | `/vehicles` | Onboard a new vehicle (with Indian plate format & duplicate prevention) | Yes |
| `GET` | `/vehicles/validate-plate/{plate}` | Validate Indian registration plate format, normalize, check existence | Optional |
| `GET` | `/vehicles/{id}` | Retrieve vehicle profile (by ID, VIN, or normalized plate) | Optional |
| `GET` | `/vehicles/{id}/timeline` | Retrieve chronological vehicle timeline | Optional |
| `GET` | `/vehicles/{id}/odometer` | Analyze odometer consistency & detect rollbacks | Optional |
| `GET` | `/vehicles/{id}/maintenance` | Compare history against manufacturer schedule | Optional |
| `GET` | `/vehicles/{id}/claims` | Retrieve verified insurance accident claims | Optional |
| `GET` | `/vehicles/{id}/evidence` | List all supporting evidence with verification states | Optional |
| `GET` | `/vehicles/{id}/intelligence` | Multi-category score breakdown and anomaly ratings | Optional |
| `POST` | `/vehicles/compare` | Compare 2–3 vehicles side-by-side | No |

## Documents & Invoices

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/vehicles/{id}/documents` | Upload PDF/image invoice, extract via OCR | Yes |
| `GET` | `/documents/{id}` | Retrieve document metadata & extracted text | No |
| `POST` | `/invoices/{id}/verify-issuer`| Query simulated issuer API for independent verification | Yes |

## Reports & Grounded AI

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/vehicles/{id}/reports` | Generate snapshot intelligence report | Optional |
| `GET` | `/reports/{id}/pdf` | Download dynamic multi-page ReportLab PDF | No |
| `POST` | `/assistant/query` | Grounded AI Vehicle Assistant query | No |

## Administration (Role: ADMIN)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/admin/dashboard` | Platform counts, DQ violations, pipeline health | ADMIN |
| `GET` | `/admin/users` | List registered accounts | ADMIN |
| `GET` | `/admin/providers` | List service and inspection providers | ADMIN |
| `GET` | `/admin/evidence/review` | Moderate pending/unverified evidence | ADMIN |
| `PATCH`| `/admin/evidence/{id}` | Verify or reject evidence manually | ADMIN |
| `GET` | `/admin/audit` | View immutable audit log | ADMIN |
