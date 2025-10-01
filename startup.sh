#!/bin/bash

# Azure App Service startup script for Next.js
echo "Starting Next.js application..."

# Set default port if not provided
export PORT=${PORT:-3000}

# Start the application
exec node server.js