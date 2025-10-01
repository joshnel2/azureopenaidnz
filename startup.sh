#!/bin/bash

# Azure App Service startup script for Next.js
echo "Starting Next.js application..."
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Set default port if not provided
export PORT=${PORT:-3000}
echo "Using PORT: $PORT"

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "Error: server.js not found!"
    echo "Current directory: $(pwd)"
    echo "Files in current directory:"
    ls -la
    exit 1
fi

echo "Starting server.js..."

# Start the application with error handling
exec node server.js