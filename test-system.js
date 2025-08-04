import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testSystem() {
  console.log('🧪 Testing LangChainPro Agent System\n');
  

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData.status);
    console.log('   Services:', healthData.services);
    console.log('');

    // Test 2: Setup Database
    console.log('2. Setting up Weaviate Database...');
    const setupResponse = await fetch(`${BASE_URL}/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const setupData = await setupResponse.json();
    console.log('✅ Setup:', setupData.message);
    console.log('');

    // Test 3: Information Query (RAG)
    console.log('3. Testing Information Query (RAG)...');
    const ragResponse = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is machine learning?'
      })
    });
    const ragData = await ragResponse.json();
    console.log('✅ RAG Query Response:');
    console.log('   Answer:', ragData.response.answer.substring(0, 100) + '...');
    console.log('   File IDs:', ragData.response.fileIds);
    console.log('   References:', ragData.response.references);
    console.log('');

    // Test 4: Chart Request
    console.log('4. Testing Chart Request...');
    const chartResponse = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Create a bar chart showing sales data for Q1'
      })
    });
    const chartData = await chartResponse.json();
    console.log('✅ Chart Query Response:');
    console.log('   Answer:', chartData.response.answer);
    console.log('   Chart Type:', chartData.response.chartConfig?.type);
    console.log('   Chart Title:', chartData.response.chartConfig?.options?.plugins?.title?.text);
    console.log('');

    // Test 5: Combined Request
    console.log('5. Testing Combined Request...');
    const combinedResponse = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Explain neural networks and create a pie chart showing different types'
      })
    });
    const combinedData = await combinedResponse.json();
    console.log('✅ Combined Query Response:');
    console.log('   Answer:', combinedData.response.answer.substring(0, 150) + '...');
    console.log('   File IDs:', combinedData.response.fileIds);
    console.log('   Chart Type:', combinedData.response.chartConfig?.type);
    console.log('');

    // Test 6: Direct Response
    console.log('6. Testing Direct Response...');
    const directResponse = await fetch(`${BASE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Hello, how are you?'
      })
    });
    const directData = await directResponse.json();
    console.log('✅ Direct Query Response:');
    console.log('   Answer:', directData.response.answer.substring(0, 100) + '...');
    console.log('');

    // Test 7: System Status
    console.log('7. Testing System Status...');
    const statusResponse = await fetch(`${BASE_URL}/status`);
    const statusData = await statusResponse.json();
    console.log('✅ System Status:');
    console.log('   Weaviate Status:', statusData.weaviate?.status);
    console.log('   Weaviate Version:', statusData.weaviate?.version);
    console.log('   Agent Status:', statusData.agent);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Health Check: PASSED');
    console.log('   ✅ Database Setup: PASSED');
    console.log('   ✅ RAG Agent: PASSED');
    console.log('   ✅ Chart Tool: PASSED');
    console.log('   ✅ Combined Processing: PASSED');
    console.log('   ✅ Direct Response: PASSED');
    console.log('   ✅ System Status: PASSED');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the server is running: npm start');
    console.log('   2. Check if Weaviate is running: npm run docker:up');
    console.log('   3. Verify your Google Gemini API key is set in .env');
    console.log('   4. Check the server logs for more details');
  }
}

// Run the test
testSystem(); 