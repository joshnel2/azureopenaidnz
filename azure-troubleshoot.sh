#!/bin/bash

# Azure Troubleshooting Script for DNZ AI Assistant
# Run this script to diagnose and get logs from your Azure deployment

APP_NAME="dnz-ai1"
RESOURCE_GROUP="dnz-ai-rg"

echo "🔍 Azure Deployment Troubleshooting for $APP_NAME"
echo "=================================================="

# Check if Azure CLI is installed and user is logged in
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"
echo ""

# Get application logs
echo "📋 Getting application logs..."
echo "================================"
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP --timeout 30 &
LOG_PID=$!

sleep 5
kill $LOG_PID 2>/dev/null

echo ""
echo "📊 Getting deployment logs..."
echo "============================="
az webapp log deployment list --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

echo ""
echo "⚙️  Current app settings..."
echo "=========================="
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP --output table

echo ""
echo "🐳 Container settings..."
echo "======================"
az webapp config container show --name $APP_NAME --resource-group $RESOURCE_GROUP

echo ""
echo "📈 App service status..."
echo "======================"
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "{name:name,state:state,hostNames:defaultHostName,location:location}" --output table

echo ""
echo "🔧 Recommended fixes:"
echo "===================="
echo "1. Check if these environment variables are set:"
echo "   - AZURE_OPENAI_ENDPOINT"
echo "   - AZURE_OPENAI_API_KEY"
echo "   - AZURE_OPENAI_DEPLOYMENT_NAME"
echo "   - WEBSITES_PORT (should be 3000)"
echo ""
echo "2. If environment variables are missing, set them with:"
echo "   az webapp config appsettings set --resource-group $RESOURCE_GROUP --name $APP_NAME --settings AZURE_OPENAI_ENDPOINT='your-endpoint'"
echo ""
echo "3. Restart the app after setting variables:"
echo "   az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "4. Monitor logs in real-time:"
echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"