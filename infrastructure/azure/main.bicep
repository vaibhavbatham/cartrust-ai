@description('The location into which the resources should be deployed')
param location string = resourceGroup().location

@description('Unique application naming prefix')
param appPrefix string = 'cartrust'

@description('Environment name (e.g. dev, staging, prod)')
param environment string = 'prod'

// 1. Log Analytics & Application Insights
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appPrefix}-law-${environment}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${appPrefix}-appinsights-${environment}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// 2. Azure Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: '${appPrefix}-kv-${environment}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// 3. Azure Data Lake Storage Gen2 (Medallion Store)
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${appPrefix}dls${environment}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    isHnsEnabled: true // Hierarchical Namespace for ADLS Gen2
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
  }
}

// 4. Azure Database for PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${appPrefix}-psql-${environment}'
  location: location
  sku: {
    name: 'Standard_B2s'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'cartrust_admin'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// 5. Container Apps Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${appPrefix}-cae-${environment}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// 6. Azure Static Web Apps (Frontend)
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${appPrefix}-frontend-${environment}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {}
}

output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName
output storageEndpoint string = storageAccount.properties.primaryEndpoints.dfs
