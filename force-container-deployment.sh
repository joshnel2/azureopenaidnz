#!/bin/bash

# Force Azure to use Container Deployment instead of Oryx
# This script will stop Azure from using automatic builds and force container deployment

set -e

# Configuration
RESOURCE_GROUP="dnz-ai-rg"
APP_NAME="dnz-ai1"
REGISTRY_NAME="dnzairegistry"
IMAGE_NAME="dnz-ai1"

echo "🔧 Forcing Azure to use Container Deployment"
echo "============================================"

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Stop the web app first
echo "⏸️  Stopping the web app..."
az webapp stop --name $APP_NAME --resource-group $RESOURCE_GROUP

# Get registry details
LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv 2>/dev/null || echo "")

if [ -z "$LOGIN_SERVER" ]; then
    echo "❌ Container registry '$REGISTRY_NAME' not found!"
    echo "Please run './deploy-docker-azure.sh' first to create the registry and build the image."
    exit 1
fi

# Get registry credentials
REGISTRY_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username --output tsv)
REGISTRY_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv)

echo "🐳 Configuring container deployment..."

# Force container deployment by setting the container image
az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-custom-image-name $LOGIN_SERVER/$IMAGE_NAME:latest \
    --docker-registry-server-url https://$LOGIN_SERVER \
    --docker-registry-server-user $REGISTRY_USERNAME \
    --docker-registry-server-password $REGISTRY_PASSWORD

# Set container-specific settings to override Oryx
echo "⚙️  Setting container-specific configuration..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_NAME \
    --settings \
        WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
        WEBSITES_PORT=3000 \
        PORT=3000 \
        NODE_ENV=production \
        NEXT_TELEMETRY_DISABLED=1 \
        SCM_DO_BUILD_DURING_DEPLOYMENT=false \
        ENABLE_ORYX_BUILD=false \
        DISABLE_COLLECTSTATIC=1

# Remove any startup command that might interfere
echo "🔄 Clearing startup command..."
az webapp config set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --startup-file ""

# Enable container logging
echo "📊 Enabling container logging..."
az webapp log config \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --docker-container-logging filesystem

# Start the web app
echo "▶️  Starting the web app..."
az webapp start --name $APP_NAME --resource-group $RESOURCE_GROUP

echo ""
echo "✅ Container deployment configured successfully!"
echo ""
echo "🔍 The app should now use your Docker container instead of Oryx."
echo ""
echo "📊 Monitor the logs to verify:"
echo "az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🌐 Your app: https://$APP_NAME.azurewebsites.net"
echo "🏥 Health check: https://$APP_NAME.azurewebsites.net/api/health"
echo ""
echo "⚠️  If you still see Oryx logs, the image might not exist in the registry."
echo "Run './deploy-docker-azure.sh' to build and push the Docker image."