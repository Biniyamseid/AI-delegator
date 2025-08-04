# LangChainPro System Design Document

## 1. System Architecture Overview

### 1.1 High-Level System Architecture


```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile App  │  CLI Tools  │  API Clients  │  IoT Devices  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Express.js Server                                                          │
│  ├── REST API Endpoints                                                     │
│  ├── Request Validation                                                     │
│  ├── Authentication & Authorization                                        │
│  ├── Rate Limiting                                                         │
│  ├── CORS Configuration                                                    │
│  └── Error Handling                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             AGENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  LangGraph State Machine                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Delegating     │  │  RAG Agent      │  │  Chart Tool     │              │
│  │  Agent          │  │                 │  │                 │              │
│  │  ├── Query      │  │  ├── Vector     │  │  ├── Chart      │              │
│  │  │   Analysis   │  │  │   Search     │  │  │   Generation  │              │
│  │  ├── Decision   │  │  ├── Context    │  │  ├── Data       │              │
│  │  │   Making     │  │  │   Retrieval  │  │  │   Processing  │              │
│  │  └── Response   │  │  └── Answer     │  │  └── Config     │              │
│  │     Routing     │  │     Generation  │  │     Output      │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Weaviate Vector Database                                                   │
│  ├── Multi-Tenant Schema                                                   │
│  ├── Vector Embeddings                                                     │
│  ├── Semantic Search                                                       │
│  ├── GraphQL API                                                           │
│  └── Data Persistence                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

```
User Query
    │
    ▼
┌─────────────┐
│ API Gateway │ ──► Request Validation
└─────────────┘
    │
    ▼
┌─────────────┐
│ Delegating  │ ──► Query Analysis
│ Agent       │ ──► Decision Making
└─────────────┘
    │
    ▼
┌─────────────┐
│ LangGraph   │ ──► State Management
│ State       │ ──► Tool Routing
│ Machine     │ ──► Response Combination
└─────────────┘
    │
    ▼
┌─────────────┐  ┌─────────────┐
│ RAG Agent   │  │ Chart Tool  │
│             │  │             │
│ ┌─────────┐ │  │ ┌─────────┐ │
│ │ Vector  │ │  │ │ Chart   │ │
│ │ Search  │ │  │ │ Config  │ │
│ └─────────┘ │  │ └─────────┘ │
│ ┌─────────┐ │  │ ┌─────────┐ │
│ │ Context │ │  │ │ Data    │ │
│ │ Retrieval│ │  │ │ Processing│ │
│ └─────────┘ │  │ └─────────┘ │
│ ┌─────────┐ │  │ ┌─────────┐ │
│ │ Answer  │ │  │ │ Output  │ │
│ │ Generation│ │  │ │ Format  │ │
│ └─────────┘ │  │ └─────────┘ │
└─────────────┘  └─────────────┘
    │                   │
    └───────┬───────────┘
            ▼
┌─────────────┐
│ Response    │ ──► Answer + References + ChartConfig
│ Combination │
└─────────────┘
    │
    ▼
┌─────────────┐
│ API Gateway │ ──► Response Formatting
└─────────────┘
    │
    ▼
User Response
```

## 2. Database Design

### 2.1 Weaviate Schema Design

```json
{
  "class": "QuestionAnswer",
  "description": "Knowledge base for Q&A pairs with multi-tenancy support",
  "multiTenancyConfig": {
    "enabled": true
  },
  "properties": [
    {
      "name": "fileId",
      "dataType": ["text"],
      "description": "Unique identifier for each knowledge entry",
      "indexFilterable": false,
      "indexSearchable": false,
      "tokenization": "word"
    },
    {
      "name": "question",
      "dataType": ["text"],
      "description": "The question being asked",
      "indexFilterable": true,
      "indexSearchable": true,
      "tokenization": "word"
    },
    {
      "name": "answer",
      "dataType": ["text"],
      "description": "The answer to the question",
      "indexFilterable": true,
      "indexSearchable": true,
      "tokenization": "word"
    }
  ],
  "vectorizer": "text2vec-transformers"
}
```

### 2.2 Data Model Relationships

```
Tenant: "default"
├── QuestionAnswer Objects
│   ├── file_001
│   │   ├── question: "What is machine learning?"
│   │   └── answer: "Machine learning is a subset of artificial intelligence..."
│   │
│   ├── file_002
│   │   ├── question: "How does a neural network work?"
│   │   └── answer: "A neural network is a computational model..."
│   │
│   ├── file_003
│   │   ├── question: "What is the difference between supervised and unsupervised learning?"
│   │   └── answer: "Supervised learning uses labeled training data..."
│   │
│   ├── file_004
│   │   ├── question: "What are the main types of machine learning algorithms?"
│   │   └── answer: "The main types include: 1) Supervised Learning..."
│   │
│   └── file_005
│       ├── question: "How do you evaluate machine learning models?"
│       └── answer: "Model evaluation involves metrics like accuracy..."
```

### 2.3 Vector Search Strategy

```javascript
// Primary Search Strategy: Vector Similarity
const vectorSearch = async (query, limit = 3) => {
  return await client.graphql
    .get()
    .withClassName('QuestionAnswer')
    .withTenant('default')
    .withNearText({ concepts: [query] })
    .withFields('fileId question answer _additional { distance }')
    .withLimit(limit)
    .do();
};

// Fallback Strategy: Keyword Search
const keywordSearch = async (query, limit = 3) => {
  const keywords = extractKeywords(query);
  return await client.graphql
    .get()
    .withClassName('QuestionAnswer')
    .withTenant('default')
    .withWhere({
      operator: 'Or',
      operands: [
        { path: ['question'], operator: 'ContainsAny', valueText: keywords },
        { path: ['answer'], operator: 'ContainsAny', valueText: keywords },
      ],
    })
    .withFields('fileId question answer')
    .withLimit(limit)
    .do();
};

// Final Fallback: Fetch All Objects
const fetchAllObjects = async (limit = 3) => {
  return await client.data
    .getter()
    .withClassName('QuestionAnswer')
    .withTenant('default')
    .withLimit(limit)
    .do();
};
```

## 3. Agent Architecture Design

### 3.1 LangGraph State Machine Design

```javascript
// State Schema Definition
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

// State Machine Nodes
const nodes = {
  analyze_query: analyzeQueryNode,
  chart_tool: chartToolNode,
  rag_agent: ragAgentNode,
  direct_response: directResponseNode,
  combine_results: combineResultsNode,
};

// State Transitions
const edges = [
  ['analyze_query', 'chart_tool'],
  ['analyze_query', 'rag_agent'],
  ['analyze_query', 'direct_response'],
  ['chart_tool', 'combine_results'],
  ['rag_agent', 'combine_results'],
  ['direct_response', 'END'],
  ['combine_results', 'END'],
];
```

### 3.2 Decision Matrix

| Query Pattern  | Keywords                                              | Decision | Tools Executed  | Response Type            |
| -------------- | ----------------------------------------------------- | -------- | --------------- | ------------------------ |
| Information    | "What is", "Explain", "How", "Define"                 | `rag`    | RAG Agent       | Answer + Sources         |
| Visualization  | "Create chart", "Show graph", "Visualize", "Plot"     | `chart`  | Chart Tool      | Chart Config             |
| Combined       | "Explain X and create chart", "Show data and explain" | `both`   | Both Tools      | Answer + Sources + Chart |
| Conversational | "Hello", "How are you", "Thanks"                      | `direct` | Direct Response | Simple Answer            |

### 3.3 Agent Decision Logic

```javascript
async analyzeQuery(state) {
  const userQuery = state.userQuery.toLowerCase();

  // Decision patterns
  const patterns = {
    information: /(what|how|explain|define|describe|tell me about)/i,
    visualization: /(chart|graph|visualize|plot|show|create)/i,
    combined: /(and|also|plus|with|including)/i,
    conversational: /(hello|hi|how are you|thanks|thank you)/i
  };

  // Decision logic
  if (patterns.combined.test(userQuery) &&
      (patterns.information.test(userQuery) || patterns.visualization.test(userQuery))) {
    return 'both';
  } else if (patterns.visualization.test(userQuery)) {
    return 'chart';
  } else if (patterns.information.test(userQuery)) {
    return 'rag';
  } else if (patterns.conversational.test(userQuery)) {
    return 'direct';
  } else {
    return 'rag'; // Default to RAG for unknown queries
  }
}
```

## 4. API Design

### 4.1 RESTful API Endpoints

```yaml
# Health & Monitoring
GET /health
  Description: System health check
  Response: { status: "healthy", timestamp: "ISO", services: {...} }

GET /status
  Description: Detailed system status
  Response: { weaviate: {...}, agent: "initialized" }

# Core Operations
POST /setup
  Description: Initialize database and agents
  Request: {}
  Response: { success: true, message: "..." }

POST /query
  Description: Main query endpoint
  Request: { query: "string" }
  Response: { success: true, query: "string", response: {...} }

# Testing & Debug
POST /test/rag
  Description: Test RAG agent directly
  Request: { query: "string" }
  Response: { success: true, result: {...} }

POST /test/chart
  Description: Test chart tool directly
  Request: { chartType: "string", title: "string", data: "string" }
  Response: { success: true, result: {...} }
```

### 4.2 Request/Response Schemas

```typescript
// Query Request Schema
interface QueryRequest {
  query: string;
}

// Query Response Schema
interface QueryResponse {
  success: boolean;
  query: string;
  response: {
    answer: string;
    references: Record<string, any>;
    fileIds: string[];
    chartConfig: ChartConfig | null;
  };
}

// Chart Configuration Schema
interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar';
  data: {
    labels: string[];
    datasets: Dataset[];
  };
  options: {
    responsive: boolean;
    plugins: {
      title: { display: boolean; text: string; font: FontConfig };
      legend: { display: boolean; position: string };
    };
    scales?: ScaleConfig;
  };
}

// RAG Response Schema
interface RAGResponse {
  success: boolean;
  answer: string;
  sources: string[];
  error?: string;
}
```

## 5. Performance Design

### 5.1 Response Time Targets

| Operation        | Target | Current | Optimization Strategy      |
| ---------------- | ------ | ------- | -------------------------- |
| RAG Query        | <3s    | 2-5s    | Vector search optimization |
| Chart Generation | <2s    | 1-2s    | Mock data caching          |
| Combined Query   | <8s    | 4-8s    | Parallel execution         |
| Direct Response  | <1s    | <1s     | LLM response caching       |

### 5.2 Scalability Considerations

```javascript
// Horizontal Scaling Strategy
const scalingStrategy = {
  api: {
    stateless: true,
    loadBalancer: 'nginx',
    instances: 'auto-scaling',
    healthChecks: '/health',
  },
  database: {
    weaviate: {
      clustering: true,
      sharding: true,
      replication: true,
    },
  },
  caching: {
    redis: {
      responseCache: true,
      sessionStore: true,
      rateLimit: true,
    },
  },
};
```

### 5.3 Error Handling Strategy

```javascript
// Graceful Degradation Pattern
const errorHandling = {
  vectorSearch: {
    primary: 'vector similarity search',
    fallback: 'keyword search',
    final: 'fetch all objects',
  },
  llmGeneration: {
    primary: 'gemini-1.5-flash',
    fallback: 'gemini-pro',
    final: 'static response',
  },
  chartGeneration: {
    primary: 'dynamic chart config',
    fallback: 'default chart config',
    final: 'error message',
  },
};
```

## 6. Security Design

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: Network Security                                                  │
│  ├── HTTPS/TLS Encryption                                                  │
│  ├── Firewall Configuration                                                │
│  └── DDoS Protection                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: Application Security                                             │
│  ├── Input Validation & Sanitization                                      │
│  ├── Rate Limiting                                                         │
│  ├── CORS Configuration                                                    │
│  └── Error Handling (No Information Disclosure)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Data Security                                                    │
│  ├── Multi-Tenancy Isolation                                              │
│  ├── API Key Authentication                                               │
│  ├── Data Encryption at Rest                                              │
│  └── Secure Environment Variables                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Security Implementation

```javascript
// Input Validation
const validateQuery = (query) => {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query format');
  }
  if (query.length > 1000) {
    throw new Error('Query too long');
  }
  // Sanitize input
  return query.replace(/[<>]/g, '');
};

// Rate Limiting
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
};

// CORS Configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};
```

## 7. Deployment Architecture

### 7.1 Docker Compose Architecture

```yaml
version: '3.4'
services:
  # Vector Database
  weaviate:
    image: semitechnologies/weaviate:1.22.4
    ports:
      - '8081:8080'
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      CLUSTER_HOSTNAME: 'node1'
    volumes:
      - weaviate_data:/var/lib/weaviate
    restart: on-failure:0

  # Application Server
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - WEAVIATE_URL=http://weaviate:8080
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - PORT=3000
    depends_on:
      - weaviate
    restart: on-failure:0

  # Load Balancer (Optional)
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  weaviate_data:
```

### 7.2 Production Deployment

```bash
# Production Deployment Script
#!/bin/bash

# 1. Environment Setup
export NODE_ENV=production
export GOOGLE_API_KEY="your-production-api-key"

# 2. Database Migration
docker-compose up -d weaviate
sleep 30

# 3. Application Deployment
docker-compose up -d app

# 4. Health Check
curl -f http://localhost:3000/health || exit 1

# 5. Setup Database
curl -X POST http://localhost:3000/setup

echo "Deployment completed successfully"
```

## 8. Monitoring and Observability

### 8.1 Health Check Endpoints

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
    // Check Weaviate
    const weaviateHealth = await checkWeaviateHealth();
    health.services.weaviate = weaviateHealth ? 'running' : 'down';

    // Check Agent
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

### 8.2 Metrics Collection

```javascript
// Metrics Implementation
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    byEndpoint: {},
  },
  performance: {
    responseTimes: [],
    averageResponseTime: 0,
  },
  agents: {
    ragQueries: 0,
    chartQueries: 0,
    combinedQueries: 0,
    directQueries: 0,
  },
};

// Middleware for metrics collection
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.requests.total++;
    metrics.performance.responseTimes.push(duration);

    if (res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }

    // Update endpoint metrics
    const endpoint = req.path;
    metrics.requests.byEndpoint[endpoint] =
      (metrics.requests.byEndpoint[endpoint] || 0) + 1;
  });

  next();
});
```

This system design document provides a comprehensive overview of the LangChainPro architecture, covering all aspects from high-level design to implementation details, security considerations, and deployment strategies.
