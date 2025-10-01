#!/bin/bash

# Azure Deployment Script for DNZ AI Assistant
# Make sure you have Azure CLI installed and are logged in

set -e

# Configuration
RESOURCE_GROUP="dnz-ai-rg"
LOCATION="East US"
REGISTRY_NAME="dnzairegistry"
APP_NAME="dnz-ai1"
PLAN_NAME="dnz-ai-plan"
IMAGE_NAME="dnz-ai1"

echo "🚀 Starting Azure deployment for DNZ AI Assistant..."

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Create resource group
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location "$LOCATION" --output table

# Create Azure Container Registry
echo "🐳 Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic --admin-enabled true --output table

# Get ACR login server
LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "📝 Registry login server: $LOGIN_SERVER"

# Login to ACR
echo "🔑 Logging into Azure Container Registry..."
az acr login --name $REGISTRY_NAME

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME .

# Tag and push image
echo "📤 Pushing image to registry..."
docker tag $IMAGE_NAME $LOGIN_SERVER/$IMAGE_NAME:latest
docker push $LOGIN_SERVER/$IMAGE_NAME:latest

# Create App Service Plan
echo "📋 Creating App Service Plan..."
az appservice plan create --name $PLAN_NAME --resource-group $RESOURCE_GROUP --sku B1 --is-linux --output table

# Get registry credentials
REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)

# Create Web App
echo "🌐 Creating Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $PLAN_NAME \
    --name $APP_NAME \
    --deployment-container-image-name $LOGIN_SERVER/$IMAGE_NAME:latest \
    --output table

# Configure container settings
echo "⚙️  Configuring container settings..."
az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $LOGIN_SERVER/$IMAGE_NAME:latest \
    --docker-registry-server-url https://$LOGIN_SERVER \
    --docker-registry-server-user $REGISTRY_USERNAME \
    --docker-registry-server-password $REGISTRY_PASSWORD

# Configure app settings
echo "🔧 Configuring app settings..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        NODE_ENV=production \
        PORT=3000 \
        WEBSITES_PORT=3000 \
        NEXT_TELEMETRY_DISABLED=1

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Azure Portal:"
echo "   - AZURE_OPENAI_ENDPOINT"
echo "   - AZURE_OPENAI_API_KEY" 
echo "   - AZURE_OPENAI_DEPLOYMENT_NAME"
echo ""
echo "2. Your app will be available at: https://$APP_NAME.azurewebsites.net"
echo ""
echo "3. Monitor logs with: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "⚠️  Remember to set your environment variables before the app will work properly!"