#!/bin/bash

# Fixed Azure Deployment Script for DNZ AI Assistant
# This script handles conflicts and ensures clean deployment

set -e

# Configuration
RESOURCE_GROUP="dnz-ai-rg"
LOCATION="East US"
REGISTRY_NAME="dnzairegistry"
APP_NAME="dnz-ai1"
PLAN_NAME="dnz-ai-plan"
IMAGE_NAME="dnz-ai1"

echo "🚀 Fixed Azure Deployment for DNZ AI Assistant"
echo "=============================================="

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker is available"

# Create resource group if it doesn't exist
echo "📦 Ensuring resource group exists..."
az group create --name $RESOURCE_GROUP --location "$LOCATION" --output none

# Create Azure Container Registry if it doesn't exist
echo "🐳 Setting up Azure Container Registry..."
if ! az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
    echo "Creating new ACR..."
    az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic --admin-enabled true --output table
else
    echo "ACR already exists, continuing..."
fi

# Get ACR login server
LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo "📝 Registry: $LOGIN_SERVER"

# Login to ACR
echo "🔑 Logging into Azure Container Registry..."
az acr login --name $REGISTRY_NAME

# Build Docker image with unique tag to avoid conflicts
TIMESTAMP=$(date +%Y%m%d%H%M%S)
IMAGE_TAG="v$TIMESTAMP"
echo "🔨 Building Docker image with tag: $IMAGE_TAG..."
docker build -t $IMAGE_NAME:$IMAGE_TAG .

# Tag and push image
echo "📤 Pushing image to registry..."
docker tag $IMAGE_NAME:$IMAGE_TAG $LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG
docker tag $IMAGE_NAME:$IMAGE_TAG $LOGIN_SERVER/$IMAGE_NAME:latest
docker push $LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG
docker push $LOGIN_SERVER/$IMAGE_NAME:latest

# Create App Service Plan if it doesn't exist
echo "📋 Setting up App Service Plan..."
if ! az appservice plan show --name $PLAN_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
    echo "Creating new App Service Plan..."
    az appservice plan create --name $PLAN_NAME --resource-group $RESOURCE_GROUP --sku B1 --is-linux --output table
else
    echo "App Service Plan already exists, continuing..."
fi

# Handle existing Web App - this is where the 409 conflict often occurs
echo "🌐 Handling Web App deployment..."
if az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
    echo "Web App already exists, stopping it first to avoid conflicts..."
    az webapp stop --name $APP_NAME --resource-group $RESOURCE_GROUP
    
    # Wait a moment for the app to fully stop
    echo "⏳ Waiting for app to stop..."
    sleep 10
    
    echo "🔄 Updating existing Web App with new container image..."
    # Get registry credentials
    REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
    REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)
    
    # Update container settings
    az webapp config container set \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --docker-custom-image-name $LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
        --docker-registry-server-url https://$LOGIN_SERVER \
        --docker-registry-server-user $REGISTRY_USERNAME \
        --docker-registry-server-password $REGISTRY_PASSWORD
else
    echo "Creating new Web App..."
    az webapp create \
        --resource-group $RESOURCE_GROUP \
        --plan $PLAN_NAME \
        --name $APP_NAME \
        --deployment-container-image-name $LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
        --output table
    
    # Get registry credentials and configure
    REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
    REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)
    
    # Configure container settings
    az webapp config container set \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --docker-custom-image-name $LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG \
        --docker-registry-server-url https://$LOGIN_SERVER \
        --docker-registry-server-user $REGISTRY_USERNAME \
        --docker-registry-server-password $REGISTRY_PASSWORD
fi

# Configure app settings for container
echo "🔧 Setting application configuration..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
        WEBSITES_PORT=3000 \
        PORT=3000 \
        NODE_ENV=production \
        NEXT_TELEMETRY_DISABLED=1 \
        HOSTNAME="0.0.0.0"

# Enable container logging
echo "📊 Enabling container logging..."
az webapp log config \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-container-logging filesystem

# Start the app
echo "▶️  Starting the application..."
az webapp start --name $APP_NAME --resource-group $RESOURCE_GROUP

# Wait a moment for startup
echo "⏳ Waiting for application to start..."
sleep 15

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "⚠️  IMPORTANT: Set your environment variables now:"
echo "az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings \\"
echo "  AZURE_OPENAI_ENDPOINT='https://your-resource.openai.azure.com/' \\"
echo "  AZURE_OPENAI_API_KEY='your-api-key' \\"
echo "  AZURE_OPENAI_DEPLOYMENT_NAME='your-deployment-name'"
echo ""
echo "🌐 Your app will be available at: https://$APP_NAME.azurewebsites.net"
echo ""
echo "📊 Monitor logs with:"
echo "az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🔍 Check health status at: https://$APP_NAME.azurewebsites.net/api/health"
echo ""
echo "🏷️  Deployed image tag: $IMAGE_TAG"