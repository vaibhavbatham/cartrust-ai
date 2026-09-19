# Deployment Guide — CarTrust AI

CarTrust AI supports three primary deployment paradigms: **Native Local Execution**, **Multi-Container Docker Compose**, and **Enterprise Azure Cloud Infrastructure**.

---

## 1. Local Native Deployment (Fastest for Development)

### Prerequisites
- Python 3.10+ (tested on Python 3.10–3.14)
- Node.js 18+ & npm
- Git

### Automated 1-Command Startup
The repository provides an orchestration script that starts the backend API, mock issuer gateway, and frontend Vite dev server concurrently:

```bash
# From the repository root
python scripts/run_local.py
```

This will automatically:
1. Verify Python virtual environment and dependencies.
2. Initialize and migrate the SQLite database (`cartrust.db`).
3. Seed canonical demo vehicles and user accounts.
4. Launch Mock Issuer Gateway at `http://localhost:8001`.
5. Launch FastAPI Backend at `http://localhost:8000`.
6. Launch React Vite SPA at `http://localhost:5173`.

### Manual Service-by-Service Startup

**Terminal 1 — Mock External Issuer Gateway**:
```bash
python mock-providers/app.py
# Running on http://127.0.0.1:8001
```

**Terminal 2 — FastAPI Backend**:
```bash
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
# Running on http://127.0.0.1:8000
```

**Terminal 3 — React Frontend**:
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

---

## 2. Docker Compose Multi-Container Deployment

Run the complete isolated production-like stack (PostgreSQL, FastAPI backend, Mock Issuer, and Nginx-served React frontend):

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and launch containers
docker compose up --build -d

# 3. Check container status
docker compose ps

# 4. Initialize database and seed demo data inside container
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed_demo.py
```

### Container Endpoints:
- **Frontend SPA**: `http://localhost:80`
- **FastAPI API & Swagger Docs**: `http://localhost:8000/docs`
- **Mock Issuer Gateway**: `http://localhost:8001/docs`
- **PostgreSQL Database**: `localhost:5432` (`cartrust_db`)

---

## 3. Azure Cloud Deployment (Production Architecture)

CarTrust AI provides enterprise Infrastructure-as-Code (IaC) via Azure Bicep templates located in `infrastructure/azure/`.

### Target Architecture:
- **Compute**: Azure Container Apps (serverless, autoscale-to-zero, microservices).
- **Database**: Azure Database for PostgreSQL Flexible Server (Burstable B1ms / General Purpose).
- **Object Storage**: Azure Blob Storage (LRS with private container endpoints for invoices & inspection PDFs).
- **Ingress & CDN**: Azure Front Door / Application Gateway with TLS termination and WAF.
- **Secrets Management**: Azure Key Vault.
- **Observability**: Azure Monitor & Application Insights.

### Deploying via Azure CLI:
```bash
# Login to Azure
az login

# Create resource group
az group create --name rg-cartrust-prod --location eastus

# Deploy Bicep template
az deployment group create \
  --resource-group rg-cartrust-prod \
  --template-file infrastructure/azure/main.bicep \
  --parameters environmentName=prod \
               dbAdminUsername=cartrustadmin \
               dbAdminPassword='<SecurePassword123!>' \
               jwtSecretKey='<32ByteHexSecretKey>'
```

For complete step-by-step instructions, cost estimation, and disaster recovery configurations, refer to:
- [`infrastructure/azure/architecture.md`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/infrastructure/azure/architecture.md)
- [`infrastructure/azure/azure_deployment_guide.md`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/infrastructure/azure/azure_deployment_guide.md)

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env` and configure appropriate variables:

```ini
# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=replace-with-a-secure-random-64-character-hex-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Connection (PostgreSQL or SQLite)
DATABASE_URL=postgresql+psycopg2://cartrust_user:SecurePass123!@localhost:5432/cartrust_db
# For local SQLite: sqlite:///./cartrust.db

# Storage
STORAGE_BACKEND=local
STORAGE_DIR=./uploads
# For Azure:
# STORAGE_BACKEND=azure_blob
# AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...

# External Services
MOCK_ISSUER_URL=http://localhost:8001
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:80
```
