require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

async function testDeployment() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  
  console.log('🧪 Testing your deployment after creation...\n');
  console.log(`Deployment name: ${deploymentName}`);
  
  const client = new OpenAI({
    apiKey,
    baseURL: `${endpoint}openai/deployments/${deploymentName}`,
    defaultQuery: { 'api-version': '2024-08-01-preview' },
    defaultHeaders: {
      'api-key': apiKey,
    },
  });

  try {
    console.log('Sending test message...');
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: 'You are a helpful legal assistant.' },
        { role: 'user', content: 'Hello, can you help me with a legal question?' }
      ],
      max_tokens: 50
    });
    
    console.log('✅ SUCCESS! Your deployment is working!');
    console.log('\n📝 Response:');
    console.log(response.choices[0].message.content);
    console.log('\n🎉 Your chatbot should now work perfectly!');
    
  } catch (error) {
    console.log('❌ Still not working:');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('DeploymentNotFound')) {
      console.log('\n💡 Make sure:');
      console.log('1. You created the deployment in Azure Portal');
      console.log('2. The deployment name matches exactly');
      console.log('3. Wait 2-5 minutes after creating the deployment');
    }
  }
}

testDeployment().catch(console.error);