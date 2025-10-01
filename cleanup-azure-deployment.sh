#!/bin/bash

# Azure Deployment Cleanup Script
# Use this script to clean up existing deployments that might be causing conflicts

set -e

# Configuration
RESOURCE_GROUP="dnz-ai-rg"
APP_NAME="dnz-ai1"
PLAN_NAME="dnz-ai-plan"
REGISTRY_NAME="dnzairegistry"

echo "🧹 Azure Deployment Cleanup Script"
echo "=================================="

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure first: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Function to safely delete resources
safe_delete() {
    local resource_type=$1
    local resource_name=$2
    local resource_group=$3
    
    case $resource_type in
        "webapp")
            if az webapp show --name $resource_name --resource-group $resource_group &>/dev/null; then
                echo "🗑️  Deleting Web App: $resource_name"
                az webapp delete --name $resource_name --resource-group $resource_group --yes
                echo "✅ Web App deleted"
            else
                echo "ℹ️  Web App $resource_name doesn't exist"
            fi
            ;;
        "plan")
            if az appservice plan show --name $resource_name --resource-group $resource_group &>/dev/null; then
                echo "🗑️  Deleting App Service Plan: $resource_name"
                az appservice plan delete --name $resource_name --resource-group $resource_group --yes
                echo "✅ App Service Plan deleted"
            else
                echo "ℹ️  App Service Plan $resource_name doesn't exist"
            fi
            ;;
        "acr")
            if az acr show --name $resource_name --resource-group $resource_group &>/dev/null; then
                echo "🗑️  Deleting Container Registry: $resource_name"
                az acr delete --name $resource_name --resource-group $resource_group --yes
                echo "✅ Container Registry deleted"
            else
                echo "ℹ️  Container Registry $resource_name doesn't exist"
            fi
            ;;
    esac
}

echo ""
echo "🔍 Checking existing resources..."

# Check what exists
echo "Current resources in resource group $RESOURCE_GROUP:"
if az group show --name $RESOURCE_GROUP &>/dev/null; then
    az resource list --resource-group $RESOURCE_GROUP --output table
else
    echo "ℹ️  Resource group $RESOURCE_GROUP doesn't exist"
    exit 0
fi

echo ""
read -p "Do you want to delete the Web App '$APP_NAME'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    safe_delete "webapp" $APP_NAME $RESOURCE_GROUP
fi

echo ""
read -p "Do you want to delete the App Service Plan '$PLAN_NAME'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    safe_delete "plan" $PLAN_NAME $RESOURCE_GROUP
fi

echo ""
read -p "Do you want to delete the Container Registry '$REGISTRY_NAME'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    safe_delete "acr" $REGISTRY_NAME $RESOURCE_GROUP
fi

echo ""
read -p "Do you want to delete the entire resource group '$RESOURCE_GROUP'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Deleting entire resource group: $RESOURCE_GROUP"
    az group delete --name $RESOURCE_GROUP --yes --no-wait
    echo "✅ Resource group deletion initiated (running in background)"
fi

echo ""
echo "🎉 Cleanup completed!"
echo ""
echo "💡 Next steps:"
echo "1. Wait a few minutes for all resources to be fully deleted"
echo "2. Run the deployment script again: ./deploy-azure-fixed.sh"
echo "3. Make sure to set your environment variables after deployment"