import { OpenAIApi } from '@azure/openai';

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'o1-mini';

if (!endpoint || !apiKey) {
  throw new Error('Azure OpenAI endpoint and API key must be provided');
}

export const openaiClient = new OpenAIApi(endpoint, { key: apiKey });

export const SYSTEM_PROMPT = `You are a helpful legal assistant for Dorf Nelson & Zauderer, a law firm specializing in corporate, litigation, and real estate law. Provide general information only—do not give personalized legal advice. Always disclaim: 'This is not legal advice; consult a qualified attorney.' Keep responses concise, professional, and cite general principles where relevant.`;

export { deploymentName };