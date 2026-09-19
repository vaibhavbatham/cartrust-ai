# Azure Production Deployment Guide — CarTrust AI

This guide walks through deploying CarTrust AI to Microsoft Azure using Azure CLI and GitHub Actions.

## Prerequisites

1. Azure CLI (`az`) installed and authenticated via `az login`
2. An active Azure Subscription with Owner or Contributor permissions
3. Azure Resource Group created:
   ```bash
   az group create --name rg-cartrust-prod --location eastus
   ```

## Step 1: Provision Infrastructure via Bicep

Deploy the foundational cloud infrastructure:

```bash
az deployment group create \
  --resource-group rg-cartrust-prod \
  --template-file infrastructure/azure/main.bicep \
  --parameters appPrefix=cartrust environment=prod
```

## Step 2: Build & Push Container Images to Azure Container Registry (ACR)

```bash
# Create ACR
az acr create --resource-group rg-cartrust-prod --name acrcartrustprod --sku Standard --admin-enabled true

# Build & Push Backend
az acr build --registry acrcartrustprod --image cartrust-backend:latest --file backend/Dockerfile .

# Build & Push Mock Provider
az acr build --registry acrcartrustprod --image cartrust-mock-provider:latest --file mock-providers/Dockerfile .
```

## Step 3: Deploy Azure Container Apps

```bash
# Deploy Backend API Container App
az containerapp create \
  --name cartrust-backend \
  --resource-group rg-cartrust-prod \
  --environment cartrust-cae-prod \
  --image acrcartrustprod.azurecr.io/cartrust-backend:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --env-vars \
    DATABASE_URL="postgresql+psycopg2://cartrust_admin:YourSecretPass@cartrust-psql-prod.postgres.database.azure.com:5432/cartrust_db" \
    APP_ENV="production"
```

## Step 4: Deploy Static Web App (Frontend)

1. Connect your repository to Azure Static Web Apps:
   - App Location: `/frontend`
   - Output Location: `dist`
2. Set API route forwarding or configure environment variable `VITE_API_BASE_URL` to point to the Azure Container App URL.
