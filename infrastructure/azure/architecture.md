# Azure Cloud Reference Architecture — CarTrust AI

This document details the production Azure Cloud implementation for the CarTrust AI Used-Car Intelligence Platform.

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client & Edge Tier
        User[End User / Browser] --> CDN[Azure Front Door / CDN]
        CDN --> SWA[Azure Static Web Apps: React 18 SPA]
    end

    subgraph Compute Tier: Azure Container Apps
        SWA -->|API Calls /api/v1| ACA_API[FastAPI Backend: Container App]
        ACA_API --> ACA_WORKER[Background Worker: Container App]
        ACA_API --> ACA_MOCK[Vendor Gateway: Container App]
    end

    subgraph Data & Storage Tier
        ACA_API --> PG[Azure Database for PostgreSQL Flexible Server]
        ACA_API --> REDIS[Azure Cache for Redis]
        ACA_API & ACA_WORKER --> ADLS[Azure Data Lake Storage Gen2]
        ADLS -->|Raw / Bronze / Silver / Gold| ADB[Azure Databricks / Spark]
        ADF[Azure Data Factory] -->|Orchestration| ADB
    end

    subgraph AI & Security Tier
        ACA_API --> AOAI[Azure OpenAI Service: GPT-4o-mini]
        ACA_API --> AKV[Azure Key Vault]
        ACA_API & ACA_WORKER --> APPI[Azure Monitor & Application Insights]
    end
```

## Component Mapping

1. **Frontend Hosting**: Azure Static Web Apps
   - Globally distributed content delivery
   - Automated SSL certificate management
   - Zero-downtime deployment previews via GitHub Actions

2. **Application Tier**: Azure Container Apps (Serverless Kubernetes)
   - Microservices: API Service, Celery Worker, Mock Provider
   - Dynamic autoscaling (KEDA) based on HTTP concurrency and Redis queue depth
   - Built-in Dapr integration for secret resolution

3. **Database Tier**: Azure Database for PostgreSQL Flexible Server
   - High availability with Zone-redundant standby
   - Automated daily backups and point-in-time recovery (PITR)
   - Read replicas for high-throughput vehicle lookups

4. **Data Lakehouse Tier**: Azure Data Lake Storage (ADLS Gen2) + Databricks
   - Hierarchical namespace storage: `/bronze`, `/silver`, `/gold`
   - Delta Lake formatting for ACID transactions on vehicle event logs
   - Data quality validation and entity resolution executed via PySpark jobs

5. **AI Services**: Azure OpenAI
   - Private endpoint connectivity
   - GPT-4o-mini deployment for grounded vehicle assistant RAG queries
   - Zero data retention policies enabled

6. **Security & Observability**:
   - Azure Key Vault for database passwords and JWT secrets
   - Application Insights for distributed request tracing, dependency maps, and latency logging
