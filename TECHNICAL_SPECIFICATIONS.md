# LangChainPro Technical Specifications

## 1. System Architecture Specifications

### 1.1 Technology Stack Details

#### Backend Framework

```javascript
// Express.js Configuration
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware Configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Error Handling Middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message,
  });
});
```


#### AI/ML Framework Integration

```javascript
// LangChain Configuration
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StateGraph, END } from '@langchain/langgraph';

// LLM Configuration
const chatModel = new ChatGoogleGenerativeAI({
  model: process.env.LLM_MODEL || 'gemini-1.5-flash',
  temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
  maxOutputTokens: parseInt(process.env.MAX_TOKENS) || 1000,
  apiKey: process.env.GOOGLE_API_KEY,
});
```

### 1.2 Database Specifications

#### Weaviate Schema Definition

```javascript
// Schema Configuration
const schemaConfig = {
  class: 'QuestionAnswer',
  description: 'Knowledge base for Q&A pairs with multi-tenancy support',
  multiTenancyConfig: {
    enabled: true,
  },
  properties: [
    {
      name: 'fileId',
      dataType: ['text'],
      description: 'Unique identifier for each knowledge entry',
      indexFilterable: false,
      indexSearchable: false,
      tokenization: 'word',
    },
    {
      name: 'question',
      dataType: ['text'],
      description: 'The question being asked',
      indexFilterable: true,
      indexSearchable: true,
      tokenization: 'word',
    },
    {
      name: 'answer',
      dataType: ['text'],
      description: 'The answer to the question',
      indexFilterable: true,
      indexSearchable: true,
      tokenization: 'word',
    },
  ],
};
```

#### Database Connection Management

```javascript
// Weaviate Client Configuration
import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: 'http',
  host: process.env.WEAVIATE_URL || 'localhost:8081',
  apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY || ''),
});

// Connection Health Check
const checkDatabaseHealth = async () => {
  try {
    const meta = await client.misc.metaGetter().do();
    return {
      status: 'connected',
      version: meta.version,
      modules: meta.modules,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      error: error.message,
    };
  }
};
```

## 2. Agent System Specifications

### 2.1 LangGraph State Machine Implementation

#### State Schema Definition

```javascript
// State Schema with Merge Strategies
const stateSchema = {
  messages: {
    value: (x, y) => x.concat(y), // Append new messages
    default: () => [],
  },
  userQuery: {
    value: (x, y) => y, // Overwrite with latest query
    default: () => '',
  },
  decision: {
    value: (x, y) => y, // Overwrite decision
    default: () => null,
  },
  chartResult: {
    value: (x, y) => y, // Store chart result
    default: () => null,
  },
  ragResult: {
    value: (x, y) => y, // Store RAG result
    default: () => null,
  },
  finalResponse: {
    value: (x, y) => y, // Store final response
    default: () => null,
  },
};
```

#### State Machine Node Implementation

```javascript
// Query Analysis Node
async analyzeQuery(state) {
  const userQuery = state.userQuery;

  const prompt = ChatPromptTemplate.fromTemplate(`
You are a delegating agent that analyzes user queries and decides which tools to use.

Based on the user query, determine the appropriate action:
- If the query asks for charts, graphs, or data visualization → "chart"
- If the query asks for information, facts, or knowledge → "rag"
- If the query requires both charting and information → "both"
- If the query is a simple greeting or doesn't need tools → "direct"

User Query: {query}

Respond with only one of: "chart", "rag", "both", or "direct"
`);

  const chain = prompt.pipe(chatModel);
  const response = await chain.invoke({ query: userQuery });

  const decision = response.content.toLowerCase().trim();

  return {
    decision,
    messages: [...state.messages, { role: 'assistant', content: `Decision: ${decision}` }]
  };
}

// Decision Routing Node
routeDecision(state) {
  const decision = state.decision;

  if (decision === 'chart') {
    return 'chart_tool';
  } else if (decision === 'rag') {
    return 'rag_agent';
  } else if (decision === 'both') {
    return 'chart_tool'; // Start with chart, then RAG
  } else {
    return 'direct_response';
  }
}
```

### 2.2 RAG Agent Specifications

#### Vector Search Implementation

```javascript
// Multi-Strategy Search Implementation
async directSearch(query, limit = 3) {
  try {
    // Primary Strategy: Vector Similarity Search
    let result = await client.graphql
      .get()
      .withClassName(CLASS_NAME)
      .withTenant(TENANT_NAME)
      .withFields('fileId question answer _additional { distance }')
      .withNearText({ concepts: [query] })
      .withLimit(limit)
      .do();

    return {
      success: true,
      results: result.data.Get[CLASS_NAME].map(item => ({
        fileId: item.fileId,
        question: item.question,
        answer: item.answer,
        distance: item._additional?.distance
      })),
      count: result.data.Get[CLASS_NAME].length
    };

  } catch (error) {
    console.error('Vector search failed:', error);

    // Fallback Strategy: Keyword-Based Search
    try {
      const keywords = this.extractKeywords(query);

      if (keywords.length === 0) {
        // Final Fallback: Fetch All Objects
        const allObjects = await client.data
          .getter()
          .withClassName(CLASS_NAME)
          .withTenant(TENANT_NAME)
          .withLimit(limit)
          .do();

        return {
          success: true,
          results: allObjects.data.map(item => ({
            fileId: item.properties.fileId,
            question: item.properties.question,
            answer: item.properties.answer
          })),
          count: allObjects.data.length,
          note: 'Used fallback fetchObjects API'
        };
      }

      result = await client.graphql
        .get()
        .withClassName(CLASS_NAME)
        .withTenant(TENANT_NAME)
        .withFields('fileId question answer')
        .withWhere({
          operator: 'Or',
          operands: [
            {
              path: ['question'],
              operator: 'ContainsAny',
              valueText: keywords
            },
            {
              path: ['answer'],
              operator: 'ContainsAny',
              valueText: keywords
            }
          ]
        })
        .withLimit(limit)
        .do();

      return {
        success: true,
        results: result.data.Get[CLASS_NAME].map(item => ({
          fileId: item.fileId,
          question: item.question,
          answer: item.answer
        })),
        count: result.data.Get[CLASS_NAME].length,
        note: 'Used keyword search fallback'
      };

    } catch (fallbackError) {
      return {
        success: false,
        error: fallbackError.message,
        message: 'Both vector search and fallback failed'
      };
    }
  }
}

// Keyword Extraction Utility
extractKeywords(query) {
  const stopwords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

  return query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter(word => word.length > 2 && !stopwords.includes(word))
    .slice(0, 3); // Take first 3 meaningful keywords
}
```

#### Context-Aware Response Generation

```javascript
// RAG Response Generation
async generateRAGResponse(query, searchResults) {
  if (!searchResults.success || searchResults.results.length === 0) {
    return {
      success: false,
      answer: 'I could not find relevant information in the database.',
      sources: []
    };
  }

  const prompt = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant. Answer the user's question based on the following information retrieved from a knowledge base.

Retrieved Information:
{context}

User Question: {question}

Please provide a comprehensive answer based on the retrieved information. If the information doesn't fully answer the question, say so. Always mention the source file IDs when available.

Answer:
`);

  const context = searchResults.results.map(result =>
    `File: ${result.fileId}\nQuestion: ${result.question}\nAnswer: ${result.answer}\n`
  ).join('\n');

  const chain = prompt.pipe(chatModel);
  const response = await chain.invoke({
    context: context,
    question: query
  });

  return {
    success: true,
    answer: response.content,
    sources: searchResults.results.map(r => r.fileId)
  };
}
```

### 2.3 Chart Tool Specifications

#### Dynamic Chart Configuration Generation

```javascript
// Chart Tool Implementation
class ChartTool extends Tool {
  constructor() {
    super({
      name: 'chart_tool',
      description: 'Generates Chart.js configurations for data visualization',
      schema: {
        type: 'object',
        properties: {
          chartType: {
            type: 'string',
            description:
              'Type of chart to generate (bar, line, pie, doughnut, radar)',
          },
          data: {
            type: 'string',
            description: 'Description of the data to visualize',
          },
          title: {
            type: 'string',
            description: 'Title for the chart',
          },
        },
        required: ['chartType', 'data', 'title'],
      },
    });
  }

  async _call(input) {
    try {
      let chartType, data, title;

      // Handle different input formats
      if (typeof input === 'string') {
        try {
          const parsed = JSON.parse(input);
          chartType = parsed.chartType;
          data = parsed.data;
          title = parsed.title;
        } catch (e) {
          chartType = 'bar';
          data = input;
          title = 'Chart';
        }
      } else if (input && typeof input === 'object') {
        chartType = input.chartType;
        data = input.data;
        title = input.title;
      } else {
        chartType = 'bar';
        data = 'Data';
        title = 'Chart';
      }

      // Set defaults if any are missing
      chartType = chartType || 'bar';
      data = data || 'Data';
      title = title || 'Chart';

      // Generate mock data based on chart type
      const mockData = this.generateMockData(chartType, data);

      // Create Chart.js configuration
      const chartConfig = {
        type: chartType,
        data: mockData,
        options: this.generateChartOptions(chartType, title),
      };

      return JSON.stringify({
        success: true,
        chartConfig,
        message: `Generated ${chartType} chart configuration for: ${title}`,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to generate chart configuration',
      });
    }
  }

  generateMockData(chartType, dataDescription) {
    const baseData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June'],
      datasets: [
        {
          label: 'Data',
          data: [12, 19, 3, 5, 2, 3],
          backgroundColor: this.generateColors(6),
          borderColor: this.generateColors(6),
          borderWidth: 1,
        },
      ],
    };

    // Chart-type specific modifications
    switch (chartType) {
      case 'pie':
      case 'doughnut':
        return {
          labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
          datasets: [
            {
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: this.generateColors(6, 0.8),
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        };

      case 'line':
        return {
          ...baseData,
          datasets: [
            {
              ...baseData.datasets[0],
              fill: false,
              tension: 0.4,
            },
          ],
        };

      case 'radar':
        return {
          labels: [
            'Speed',
            'Reliability',
            'Compatibility',
            'Memory',
            'Storage',
            'Battery',
          ],
          datasets: [
            {
              label: 'Performance',
              data: [65, 59, 90, 81, 56, 55],
              fill: true,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgb(54, 162, 235)',
              pointBackgroundColor: 'rgb(54, 162, 235)',
              pointBorderColor: '#fff',
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderColor: 'rgb(54, 162, 235)',
            },
          ],
        };

      default:
        return baseData;
    }
  }

  generateChartOptions(chartType, title) {
    const baseOptions = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
    };

    // Add scales for non-pie/doughnut charts
    if (
      chartType !== 'pie' &&
      chartType !== 'doughnut' &&
      chartType !== 'radar'
    ) {
      baseOptions.scales = {
        y: {
          beginAtZero: true,
        },
      };
    }

    return baseOptions;
  }

  generateColors(count, alpha = 0.2) {
    const colors = [
      'rgba(255, 99, 132, ' + alpha + ')',
      'rgba(54, 162, 235, ' + alpha + ')',
      'rgba(255, 206, 86, ' + alpha + ')',
      'rgba(75, 192, 192, ' + alpha + ')',
      'rgba(153, 102, 255, ' + alpha + ')',
      'rgba(255, 159, 64, ' + alpha + ')',
    ];

    return colors.slice(0, count);
  }
}
```

## 3. API Specifications

### 3.1 RESTful API Endpoints

#### Health Check Endpoint

```javascript
// Health Check Implementation
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      weaviate: 'unknown',
      agent: 'unknown',
    },
  };

  try {
    // Check Weaviate health
    const weaviateHealth = await checkWeaviateHealth();
    health.services.weaviate = weaviateHealth ? 'running' : 'down';

    // Check agent health
    health.services.agent = delegatingAgent ? 'initialized' : 'not initialized';

    const isHealthy =
      health.services.weaviate === 'running' &&
      health.services.agent === 'initialized';

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});
```

#### Main Query Endpoint

```javascript
// Main Query Endpoint Implementation
app.post('/query', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string',
      });
    }

    if (!delegatingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Agent system not initialized',
      });
    }

    console.log('Processing query:', query);

    const response = await delegatingAgent.processQuery(query);

    res.json({
      success: true,
      query: query,
      response: response,
    });
  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

### 3.2 Request/Response Validation

#### Input Validation Middleware

```javascript
// Request Validation Middleware
const validateQueryRequest = (req, res, next) => {
  const { query } = req.body;

  // Check if query exists
  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query field is required',
    });
  }

  // Check if query is string
  if (typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Query must be a string',
    });
  }

  // Check query length
  if (query.length > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Query too long (max 1000 characters)',
    });
  }

  // Sanitize query
  req.body.query = query.trim().replace(/[<>]/g, '');

  next();
};

// Apply validation middleware
app.post('/query', validateQueryRequest, async (req, res) => {
  // Query processing logic
});
```

## 4. Performance Specifications

### 4.1 Response Time Targets

```javascript
// Performance Monitoring Middleware
const performanceMonitor = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const endpoint = req.path;

    // Log performance metrics
    console.log(`[PERFORMANCE] ${req.method} ${endpoint} - ${duration}ms`);

    // Alert on slow responses
    if (duration > 10000) {
      // 10 seconds
      console.warn(
        `[SLOW_RESPONSE] ${req.method} ${endpoint} took ${duration}ms`
      );
    }
  });

  next();
};

// Apply performance monitoring
app.use(performanceMonitor);
```

### 4.2 Caching Strategy

```javascript
// Response Caching Implementation
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedResponse = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// Caching middleware
const cacheMiddleware = (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const cacheKey = `${req.path}?${JSON.stringify(req.query)}`;
  const cached = getCachedResponse(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  // Store original send method
  const originalSend = res.json;

  // Override send method to cache response
  res.json = function (data) {
    setCachedResponse(cacheKey, data);
    originalSend.call(this, data);
  };

  next();
};
```

## 5. Security Specifications

### 5.1 Rate Limiting

```javascript
// Rate Limiting Implementation
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(apiLimiter);
```

### 5.2 Input Sanitization

```javascript
// Input Sanitization Utility
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Apply sanitization to all inputs
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }

  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }

  next();
});
```

## 6. Error Handling Specifications

### 6.1 Global Error Handler

```javascript
// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Log error details
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };

  console.error('Error log:', errorLog);

  // Send appropriate response
  res.status(error.status || 500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});
```

### 6.2 Custom Error Classes

```javascript
// Custom Error Classes
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
    this.status = 503;
  }
}

class AgentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AgentError';
    this.status = 500;
  }
}

// Error handling in routes
app.post('/query', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      throw new ValidationError('Query is required');
    }

    if (!delegatingAgent) {
      throw new AgentError('Agent system not initialized');
    }

    const response = await delegatingAgent.processQuery(query);
    res.json({ success: true, query, response });
  } catch (error) {
    next(error);
  }
});
```

These technical specifications provide comprehensive details about the implementation, ensuring that senior developers can understand and recreate the system with full knowledge of the design decisions and technical requirements.
