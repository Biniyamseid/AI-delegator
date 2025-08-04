import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import DelegatingAgent from './agents/delegating-agent.js';
import setupWeaviate from './setup/weaviate-setup.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


// Initialize the delegating agent
let delegatingAgent;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      weaviate: 'running',
      agent: delegatingAgent ? 'initialized' : 'not initialized'
    }
  });
});

// Setup endpoint to initialize Weaviate
app.post('/setup', async (req, res) => {
  try {
    console.log('Setting up Weaviate database...');
    await setupWeaviate();
    
    // Initialize the delegating agent after setup
    delegatingAgent = new DelegatingAgent();
    
    res.json({ 
      success: true, 
      message: 'Weaviate database and agent system initialized successfully' 
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Main query endpoint
app.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }

    if (!delegatingAgent) {
      return res.status(503).json({ 
        success: false, 
        error: 'Agent system not initialized. Please run /setup first.' 
      });
    }

    console.log('Processing query:', query);
    
    const result = await delegatingAgent.processQuery(query);
    
    res.json({
      success: true,
      query,
      response: result
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoints for individual components
app.post('/test/chart', async (req, res) => {
  try {
    const { chartType, title, data } = req.body;
    
    if (!delegatingAgent) {
      return res.status(503).json({ 
        success: false, 
        error: 'Agent system not initialized' 
      });
    }

    const chartResult = await delegatingAgent.chartTool.invoke(JSON.stringify({
      chartType: chartType || 'bar',
      title: title || 'Test Chart',
      data: data || 'Test data'
    }));

    res.json({
      success: true,
      result: JSON.parse(chartResult)
    });

  } catch (error) {
    console.error('Chart test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/test/rag', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: 'Query is required' 
      });
    }

    if (!delegatingAgent) {
      return res.status(503).json({ 
        success: false, 
        error: 'Agent system not initialized' 
      });
    }

    const ragResult = await delegatingAgent.ragAgent.query(query);

    res.json({
      success: true,
      result: ragResult
    });

  } catch (error) {
    console.error('RAG test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get database status
app.get('/status', async (req, res) => {
  try {
    const client = (await import('./config/database.js')).default;
    
    // Check if Weaviate is accessible
    const meta = await client.misc.metaGetter().do();
    
    res.json({
      success: true,
      weaviate: {
        status: 'connected',
        version: meta.version,
        modules: meta.modules
      },
      agent: delegatingAgent ? 'initialized' : 'not initialized'
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      weaviate: 'disconnected'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Setup endpoint: http://localhost:${PORT}/setup`);
  console.log(`❓ Query endpoint: http://localhost:${PORT}/query`);
  console.log(`📈 Chart test: http://localhost:${PORT}/test/chart`);
  console.log(`🔍 RAG test: http://localhost:${PORT}/test/rag`);
  console.log(`📋 Status: http://localhost:${PORT}/status`);
});

export default app; 