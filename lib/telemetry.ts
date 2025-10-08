import { TelemetryClient } from 'applicationinsights';

let client: TelemetryClient | null = null;

export function getTelemetryClient() {
  if (!client && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    const appInsights = require('applicationinsights');
    appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true)
      .start();
    
    client = appInsights.defaultClient;
  }
  return client;
}

export function logChatMessage(userId: string, userMessage: string, assistantMessage: string) {
  const telemetry = getTelemetryClient();
  if (telemetry) {
    telemetry.trackEvent({
      name: 'ChatMessage',
      properties: {
        userId,
        userMessage,
        assistantMessage,
        timestamp: new Date().toISOString()
      }
    });
  }
}
