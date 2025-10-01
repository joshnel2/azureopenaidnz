#!/bin/bash

# Check Azure Deployment Method
# This script checks whether Azure is using container deployment or Oryx build

APP_NAME="dnz-ai1"
RESOURCE_GROUP="dnz-ai-rg"

echo "🔍 Checking Azure Deployment Method for $APP_NAME"
echo "================================================="

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"
echo ""

# Check container configuration
echo "🐳 Container Configuration:"
echo "=========================="
CONTAINER_CONFIG=$(az webapp config container show --name $APP_NAME --resource-group $RESOURCE_GROUP 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$CONTAINER_CONFIG" | jq -r '.[] | "Image: \(.dockerCustomImageName // "Not set")"'
    echo "$CONTAINER_CONFIG" | jq -r '.[] | "Registry: \(.dockerRegistryServerUrl // "Not set")"'
else
    echo "❌ Could not retrieve container configuration"
fi

echo ""

# Check app settings
echo "⚙️  Relevant App Settings:"
echo "========================="
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP --query "[?name=='WEBSITES_ENABLE_APP_SERVICE_STORAGE' || name=='WEBSITES_PORT' || name=='SCM_DO_BUILD_DURING_DEPLOYMENT' || name=='ENABLE_ORYX_BUILD'].{Name:name, Value:value}" --output table

echo ""

# Check general configuration
echo "🔧 General Configuration:"
echo "========================"
az webapp config show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "{linuxFxVersion:linuxFxVersion, appCommandLine:appCommandLine, alwaysOn:alwaysOn}" --output table

echo ""

# Check recent logs for deployment method indicators
echo "📋 Recent Log Analysis:"
echo "======================"
echo "Checking for Oryx vs Container indicators in logs..."

# Get recent logs and check for indicators
LOGS=$(az webapp log download --name $APP_NAME --resource-group $RESOURCE_GROUP --log-file temp_logs.zip 2>/dev/null && unzip -q temp_logs.zip && cat */LogFiles/*/docker*.log 2>/dev/null | tail -20 || echo "Could not retrieve logs")

if echo "$LOGS" | grep -q "oryx-manifest.toml"; then
    echo "🚨 ISSUE DETECTED: Oryx build system is being used!"
    echo "   - Found oryx-manifest.toml in logs"
    echo "   - Azure is ignoring your Docker container"
    echo ""
    echo "🔧 SOLUTION: Run './force-container-deployment.sh' to fix this"
elif echo "$LOGS" | grep -q "Starting Next.js application"; then
    echo "✅ SUCCESS: Container deployment is working!"
    echo "   - Found container startup messages"
elif echo "$LOGS" | grep -q "server.js"; then
    echo "✅ LIKELY SUCCESS: Container appears to be running"
    echo "   - Found server.js execution"
else
    echo "❓ UNCLEAR: Could not determine deployment method from logs"
    echo "   - Check logs manually: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
fi

# Cleanup
rm -f temp_logs.zip */LogFiles/*/docker*.log 2>/dev/null || true

echo ""
echo "🌐 App URL: https://$APP_NAME.azurewebsites.net"
echo "🏥 Health Check: https://$APP_NAME.azurewebsites.net/api/health"