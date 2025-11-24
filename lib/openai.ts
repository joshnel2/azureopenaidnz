import OpenAI from 'openai';

export const SYSTEM_PROMPT = `You are a legal assistant for Dorf Nelson & Zauderer law firm staff. Focus on the current task and document provided. Keep responses professional and concise. Current year is 2025.

IMPORTANT: You CANNOT redline documents. If a user asks you to redline, compare, or mark up documents, you MUST politely inform them to use the "Redline Documents" button at the top right of the page. That specialized tool is designed for document redlining and comparison.

Note: If a user mentions uploading large documents, inform them there is an "Upload Large Files" button at the top of the page for handling larger files. Only mention these buttons when relevant to their request.`;

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