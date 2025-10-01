# Azure Deployment Troubleshooting Guide

## 409 Conflict Error - Common Causes and Solutions

The 409 Conflict error typically occurs when there are deployment conflicts or resource conflicts in Azure. Here are the main causes and solutions:

### 1. **Resource Already Exists Conflict**
**Cause**: Trying to create a resource that already exists
**Solution**: Use the cleanup script first, then redeploy

```bash
./cleanup-azure-deployment.sh
./deploy-azure-fixed.sh
```

### 2. **Deployment Method Mismatch**
**Cause**: Your app has conflicting deployment configurations (Docker vs traditional Node.js)
**Solution**: The fixed deployment script handles this by using consistent Docker deployment

### 3. **App Service Busy/Locked**
**Cause**: Previous deployment is still running or app is locked
**Solution**: Stop the app service before redeploying

```bash
az webapp stop --name dnz-ai1 --resource-group dnz-ai-rg
# Wait 30 seconds
az webapp start --name dnz-ai1 --resource-group dnz-ai-rg
```

### 4. **Container Registry Issues**
**Cause**: Problems with Azure Container Registry authentication or image conflicts
**Solution**: Clear old images and re-authenticate

```bash
# Login to ACR
az acr login --name dnzairegistry

# List and delete old images if needed
az acr repository list --name dnzairegistry --output table
az acr repository delete --name dnzairegistry --image dnz-ai1:old-tag --yes
```

## Fixed Configuration Changes

The following changes were made to resolve deployment issues:

### 1. **Next.js Configuration** (`next.config.js`)
- Added `output: 'standalone'` for Docker compatibility
- This generates the required `server.js` file for container deployment

### 2. **App.js Configuration**
- Changed hostname from `'localhost'` to `process.env.HOSTNAME || '0.0.0.0'`
- This allows the app to accept connections from Azure's load balancer

### 3. **Deployment Strategy**
- Uses timestamped Docker images to avoid caching conflicts
- Properly stops existing apps before updating
- Handles both new deployments and updates

## Step-by-Step Deployment Process

### Option 1: Clean Deployment (Recommended for 409 errors)

1. **Clean up existing resources** (if you have deployment conflicts):
   ```bash
   ./cleanup-azure-deployment.sh
   ```

2. **Deploy with the fixed script**:
   ```bash
   ./deploy-azure-fixed.sh
   ```

3. **Set environment variables**:
   ```bash
   az webapp config appsettings set --resource-group dnz-ai-rg --name dnz-ai1 --settings \
     AZURE_OPENAI_ENDPOINT='https://your-resource.openai.azure.com/' \
     AZURE_OPENAI_API_KEY='your-api-key' \
     AZURE_OPENAI_DEPLOYMENT_NAME='your-deployment-name'
   ```

### Option 2: Quick Update (for existing working deployments)

1. **Just run the fixed deployment script**:
   ```bash
   ./deploy-azure-fixed.sh
   ```

## Monitoring and Verification

### Check Deployment Status
```bash
# Check app status
az webapp show --name dnz-ai1 --resource-group dnz-ai-rg --query "{name:name,state:state,defaultHostName:defaultHostName}"

# Check logs
az webapp log tail --name dnz-ai1 --resource-group dnz-ai-rg

# Test health endpoint
curl https://dnz-ai1.azurewebsites.net/api/health
```

### Common Health Check Issues

1. **App not responding**: Check if environment variables are set
2. **500 errors**: Check application logs for missing dependencies
3. **Container won't start**: Verify Docker image was built correctly

## Environment Variables Required

Make sure these are set in Azure App Service:

```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
NODE_ENV=production
PORT=3000
WEBSITES_PORT=3000
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

## Document Processing Features

Your app now supports:
- PDF document upload and processing
- DOCX document upload and processing  
- Text extraction from scanned documents
- AI-powered document analysis

The PDF.js worker is properly configured for Azure deployment.

## Cost Optimization

- **Development**: Use B1 Basic tier (~$13/month)
- **Production**: Use S1 Standard tier (~$56/month) for better performance
- **Container Registry**: Basic tier is sufficient (~$5/month)

## Security Best Practices

1. **Never commit API keys** to your repository
2. **Use Azure Key Vault** for production secrets (optional)
3. **Enable HTTPS only** (enabled by default in Azure App Service)
4. **Set up custom domain** with SSL certificate if needed

## Getting Help

If you continue to have issues:

1. **Check the logs**: `az webapp log tail --name dnz-ai1 --resource-group dnz-ai-rg`
2. **Verify environment variables**: `az webapp config appsettings list --name dnz-ai1 --resource-group dnz-ai-rg`
3. **Test locally**: `docker build -t test . && docker run -p 3000:3000 test`
4. **Contact Azure Support** if the issue persists

## Quick Commands Reference

```bash
# Deploy (clean)
./cleanup-azure-deployment.sh
./deploy-azure-fixed.sh

# Set environment variables
az webapp config appsettings set --resource-group dnz-ai-rg --name dnz-ai1 --settings \
  AZURE_OPENAI_ENDPOINT='your-endpoint' \
  AZURE_OPENAI_API_KEY='your-key' \
  AZURE_OPENAI_DEPLOYMENT_NAME='your-deployment'

# Monitor
az webapp log tail --name dnz-ai1 --resource-group dnz-ai-rg

# Restart if needed
az webapp restart --name dnz-ai1 --resource-group dnz-ai-rg

# Check status
curl https://dnz-ai1.azurewebsites.net/api/health
```