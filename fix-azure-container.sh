#!/bin/bash

# Fix Azure Container Configuration Script
# This script will properly configure Azure to use Docker container instead of Oryx

set -e

# Configuration
RESOURCE_GROUP="dnz-ai-rg"
APP_NAME="dnz-ai1"
REGISTRY_NAME="dnzairegistry"
IMAGE_NAME="dnz-ai1"

echo "🔧 Fixing Azure Container Configuration..."
echo "========================================="

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Get registry details
LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv 2>/dev/null || echo "")

if [ -z "$LOGIN_SERVER" ]; then
    echo "❌ Container registry not found. Creating it first..."
    
    # Create Azure Container Registry
    az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic --admin-enabled true --output table
    LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
    
    echo "✅ Created container registry: $LOGIN_SERVER"
fi

# Get registry credentials
REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)

echo "🐳 Configuring app to use container deployment..."

# Configure the web app to use container
az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $LOGIN_SERVER/$IMAGE_NAME:latest \
    --docker-registry-server-url https://$LOGIN_SERVER \
    --docker-registry-server-user $REGISTRY_USERNAME \
    --docker-registry-server-password $REGISTRY_PASSWORD

# Set container-specific app settings
echo "⚙️  Setting container-specific configuration..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
        WEBSITES_PORT=3000 \
        PORT=3000 \
        NODE_ENV=production \
        NEXT_TELEMETRY_DISABLED=1

# Enable container logging
az webapp log config \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-container-logging filesystem

echo "🔄 Restarting the web app..."
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

echo ""
echo "✅ Configuration updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Build and push your Docker image:"
echo "   az acr login --name $REGISTRY_NAME"
echo "   docker build -t $IMAGE_NAME ."
echo "   docker tag $IMAGE_NAME $LOGIN_SERVER/$IMAGE_NAME:latest"
echo "   docker push $LOGIN_SERVER/$IMAGE_NAME:latest"
echo ""
echo "2. Set your environment variables:"
echo "   az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings \\"
echo "     AZURE_OPENAI_ENDPOINT='your-endpoint' \\"
echo "     AZURE_OPENAI_API_KEY='your-key' \\"
echo "     AZURE_OPENAI_DEPLOYMENT_NAME='your-deployment'"
echo ""
echo "3. Monitor the logs:"
echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🌐 Your app will be available at: https://$APP_NAME.azurewebsites.net"