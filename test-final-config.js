require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

async function testFinalConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  
  console.log('🧪 Testing final configuration...\n');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Deployment: ${deploymentName}`);
  console.log(`API Key: ${apiKey ? 'Set ✅' : 'Missing ❌'}\n`);
  
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}openai/deployments/${deploymentName}`,
      defaultQuery: { 'api-version': '2024-12-01-preview' },
      defaultHeaders: {
        'api-key': apiKey,
      },
    });

    console.log('Sending test message to o4-mini deployment...');
    
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful legal assistant for Dorf Nelson & Zauderer.'
        },
        {
          role: 'user',
          content: 'Hello, can you help me with a legal question?'
        }
      ],
      max_completion_tokens: 500
    });
    
    console.log('🎉 SUCCESS! Your Azure OpenAI deployment is working!\n');
    console.log('📝 Response:');
    console.log(response.choices[0].message.content);
    console.log('\n✅ Your legal assistant chatbot should now work perfectly!');
    
  } catch (error) {
    console.log('❌ Test failed:');
    console.log(`Error: ${error.message}`);
    
    if (error.status) {
      console.log(`Status: ${error.status}`);
    }
    if (error.code) {
      console.log(`Code: ${error.code}`);
    }
  }
}

testFinalConfig().catch(console.error);