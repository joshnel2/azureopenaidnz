import OpenAI from 'openai';

export const SYSTEM_PROMPT = `You are a legal assistant for Dorf Nelson & Zauderer law firm staff. Focus on the current task and document provided. Keep responses professional and concise. Current year is 2025.

Note: If a user mentions redlining documents or uploading large documents, inform them there are buttons at the top of the page for these features. Only mention this if relevant to their request.`;

export function createOpenAIClient() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  const baseURL = `${endpoint}/openai/deployments/${deploymentName}`;

  return {
    client: new OpenAI({
      apiKey,
      baseURL,
      defaultQuery: { 'api-version': '2024-08-01-preview' },
      defaultHeaders: {
        'api-key': apiKey,
      },
    }),
    deploymentName
  };
}