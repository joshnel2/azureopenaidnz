import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check - verify environment variables are present
    const requiredEnvVars = [
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_DEPLOYMENT_NAME'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      return NextResponse.json(
        { 
          status: 'unhealthy', 
          message: 'Missing required environment variables',
          missing: missingVars,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      message: 'Application is running correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}