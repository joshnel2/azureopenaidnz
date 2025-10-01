# Azure Deployment Guide for DNZ AI Assistant

This guide will help you deploy your Next.js application to Microsoft Azure while keeping your Netlify deployment intact.

## Files Created for Azure Deployment

The following files have been created to support Azure deployment:

- `Dockerfile` - Container configuration for Azure App Service
- `.dockerignore` - Optimizes Docker build by excluding unnecessary files
- `startup.sh` - Azure-specific startup script
- `web.config` - IIS configuration for Azure App Service
- `azure-pipelines.yml` - CI/CD pipeline configuration
- `.env.example` - Environment variables template

## Deployment Options

### Option 1: Azure App Service with Container (Recommended)

1. **Build and Push Docker Image**
   ```bash
   # Build the Docker image locally (optional - for testing)
   docker build -t dnz-ai1 .
   
   # Test locally (optional)
   docker run -p 3000:3000 -e AZURE_OPENAI_ENDPOINT="your-endpoint" -e AZURE_OPENAI_API_KEY="your-key" -e AZURE_OPENAI_DEPLOYMENT_NAME="your-deployment" dnz-ai1
   ```

2. **Deploy to Azure Container Registry**
   ```bash
   # Login to Azure
   az login
   
   # Create a resource group (if not exists)
   az group create --name dnz-ai-rg --location "East US"
   
   # Create Azure Container Registry
   az acr create --resource-group dnz-ai-rg --name dnzairegistry --sku Basic --admin-enabled true
   
   # Get login server
   az acr show --name dnzairegistry --resource-group dnz-ai-rg --query loginServer --output table
   
   # Login to ACR
   az acr login --name dnzairegistry
   
   # Tag and push image
   docker tag dnz-ai1 dnzairegistry.azurecr.io/dnz-ai1:latest
   docker push dnzairegistry.azurecr.io/dnz-ai1:latest
   ```

3. **Create Azure App Service**
   ```bash
   # Create App Service Plan
   az appservice plan create --name dnz-ai-plan --resource-group dnz-ai-rg --sku B1 --is-linux
   
   # Create Web App with container
   az webapp create --resource-group dnz-ai-rg --plan dnz-ai-plan --name dnz-ai1 --deployment-container-image-name dnzairegistry.azurecr.io/dnz-ai1:latest
   
   # Configure container registry credentials
   az webapp config container set --name dnz-ai1 --resource-group dnz-ai-rg --docker-custom-image-name dnzairegistry.azurecr.io/dnz-ai1:latest --docker-registry-server-url https://dnzairegistry.azurecr.io --docker-registry-server-user dnzairegistry --docker-registry-server-password $(az acr credential show --name dnzairegistry --query passwords[0].value --output tsv)
   ```

### Option 2: Azure App Service with GitHub Actions

1. **Set up GitHub Repository Secrets**
   Add these secrets to your GitHub repository:
   - `AZURE_WEBAPP_PUBLISH_PROFILE` - Download from Azure portal
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT_NAME`

2. **Create GitHub Actions Workflow**
   Create `.github/workflows/azure-deploy.yml`:
   ```yaml
   name: Deploy to Azure
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
       
       - name: Set up Docker Buildx
         uses: docker/setup-buildx-action@v2
       
       - name: Log in to Azure Container Registry
         uses: azure/docker-login@v1
         with:
           login-server: dnzairegistry.azurecr.io
           username: ${{ secrets.REGISTRY_USERNAME }}
           password: ${{ secrets.REGISTRY_PASSWORD }}
       
       - name: Build and push Docker image
         uses: docker/build-push-action@v4
         with:
           context: .
           push: true
           tags: dnzairegistry.azurecr.io/dnz-ai1:${{ github.sha }}
       
       - name: Deploy to Azure Web App
         uses: azure/webapps-deploy@v2
         with:
           app-name: 'dnz-ai1'
           publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
           images: 'dnzairegistry.azurecr.io/dnz-ai1:${{ github.sha }}'
   ```

## Environment Variables Configuration

Set these environment variables in Azure App Service:

1. Go to Azure Portal → App Services → Your App → Configuration
2. Add these Application Settings:
   - `AZURE_OPENAI_ENDPOINT` = Your Azure OpenAI endpoint
   - `AZURE_OPENAI_API_KEY` = Your Azure OpenAI API key
   - `AZURE_OPENAI_DEPLOYMENT_NAME` = Your deployment name
   - `NODE_ENV` = production
   - `PORT` = 3000
   - `WEBSITES_PORT` = 3000 (Azure-specific)

## Troubleshooting Common Issues

### Container Exits Immediately
- **Cause**: Missing environment variables or incorrect Dockerfile
- **Solution**: Ensure all required environment variables are set and Dockerfile is properly configured

### Build Failures
- **Cause**: Missing dependencies or incorrect Node.js version
- **Solution**: Verify package.json and use Node.js 18 in Dockerfile

### Port Issues
- **Cause**: Azure expects the app to listen on the PORT environment variable
- **Solution**: Ensure your app uses `process.env.PORT || 3000`

### Static Files Not Loading
- **Cause**: Incorrect static file serving configuration
- **Solution**: Verify the standalone output configuration in next.config.js

## Monitoring and Logs

1. **View Application Logs**:
   ```bash
   az webapp log tail --name dnz-ai1 --resource-group dnz-ai-rg
   ```

2. **Enable Application Insights** (optional):
   - Go to Azure Portal → App Services → Your App → Application Insights
   - Enable and configure monitoring

## Cost Optimization

- Use B1 (Basic) tier for development/testing
- Use S1 (Standard) or higher for production
- Consider Azure Container Instances for lower costs if high availability isn't required

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to repository
2. **HTTPS**: Azure App Service provides free SSL certificates
3. **Authentication**: Consider adding Azure AD authentication if needed
4. **Network Security**: Configure network access restrictions if required

## Next Steps

1. Test the deployment thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (if needed)
4. Set up backup strategies
5. Consider implementing CI/CD pipelines for automated deployments

Your Netlify deployment will remain unaffected by these changes since all Azure-specific files are optional and don't interfere with Netlify's build process.