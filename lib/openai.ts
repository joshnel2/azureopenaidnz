import OpenAI from 'openai';

export const SYSTEM_PROMPT = `You are a helpful legal assistant for Dorf Nelson & Zauderer, a law firm specializing in corporate, litigation, and real estate law. Provide general information only—do not give personalized legal advice. Always disclaim: 'This is not legal advice; consult a qualified attorney.' Keep responses concise, professional, and cite general principles where relevant.`;

export function createOpenAIClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'o1-mini';

  console.log('Environment check:');
  console.log('- Endpoint:', endpoint ? 'Set' : 'Missing');
  console.log('- API Key:', apiKey ? 'Set' : 'Missing');
  console.log('- Deployment:', deploymentName);

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI endpoint and API key must be provided');
  }

  const baseURL = `${endpoint}openai/deployments/${deploymentName}`;
  console.log('- Base URL:', baseURL);

  return {
    client: new OpenAI({
      apiKey,
      baseURL,
      defaultQuery: { 'api-version': '2025-01-01-preview' },
      defaultHeaders: {
        'api-key': apiKey,
      },
    }),
    deploymentName
  };
}