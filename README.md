# Agent System

A sophisticated hierarchical agent system built with Node.js, LangGraph, LangChain, and Weaviate vector database. This system features a delegating agent that can intelligently route queries to specialized tools including a Chart.js visualization tool and a RAG (Retrieval-Augmented Generation) agent.

## 🏗️ Architecture

The system consists of three main components:

1. **Delegating Agent**: The main orchestrator that analyzes user queries and decides which tools to use
2. **Chart.js Tool**: Generates Chart.js configurations for data visualization
3. **RAG Agent**: Retrieves relevant information from the Weaviate vector database

## 🚀 Features

- **Multi-tenant Weaviate vector database** with Docker containerization
- **LangGraph-based agent hierarchy** for intelligent query routing
- **Chart.js integration** for data visualization
- **RAG capabilities** with vector similarity search
- **Fallback mechanisms** for robust error handling
- **RESTful API** for easy integration
- **Google Gemini AI** integration for LLM capabilities

## 📋 Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google Gemini API key (free tier available)

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd AI-delegator
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit `.env` and add your Google Gemini API key:

   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. **Start Weaviate database**

   ```bash
   npm run docker:up
   ```

5. **Set up the database schema and sample data**

   ```bash
   npm run setup
   ```

6. **Start the application**
   ```bash
   npm start
   ```

## 🐳 Docker Setup

The Weaviate vector database runs in Docker with the following configuration:

- **Port**: 8080
- **Vectorizer**: text2vec-transformers
- **Model**: sentence-transformers-multi-qa-MiniLM-L6-cos-v1
- **Multi-tenancy**: Enabled

To start/stop the database:

```bash
# Start
npm run docker:up

# Stop
npm run docker:down
```

## 📊 Database Schema

The Weaviate database uses the following schema:

```javascript
{
  class: 'QuestionAnswer',
  properties: [
    {
      name: 'fileId',        // String - Not vectorized
      dataType: ['text']
    },
    {
      name: 'question',      // Text - Vectorized
      dataType: ['text']
    },
    {
      name: 'answer',        // Text - Vectorized
      dataType: ['text']
    }
  ],
  multiTenancyConfig: {
    enabled: true
  }
}
```

## 🔌 API Endpoints

### Health Check

```http
GET /health
```

### Setup Database

```http
POST /setup
```

### Main Query

```http
POST /query
Content-Type: application/json

{
  "query": "What is machine learning?"
}
```

### Test Chart Tool

```http
POST /test/chart
Content-Type: application/json

{
  "chartType": "bar",
  "title": "Sales Data",
  "data": "Monthly sales figures"
}
```

### Test RAG Agent

```http
POST /test/rag
Content-Type: application/json

{
  "query": "How do neural networks work?"
}
```

### System Status

```http
GET /status
```

## 🎯 Usage Examples

### 1. Information Query

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is machine learning?"}'
```

**Response:**

```json
{
  "success": true,
  "query": "What is machine learning?",
  "response": {
    "answer": "Machine learning is a subset of artificial intelligence...",
    "references": { "ragSources": ["file_001"] },
    "fileIds": ["file_001"],
    "chartConfig": null
  }
}
```

### 2. Chart Request

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Create a bar chart showing sales data"}'
```

**Response:**

```json
{
  "success": true,
  "query": "Create a bar chart showing sales data",
  "response": {
    "answer": "I've created a bar chart for you.",
    "references": {},
    "fileIds": [],
    "chartConfig": {
      "type": "bar",
      "data": {...},
      "options": {...}
    }
  }
}
```

### 3. Combined Request


```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain machine learning and create a chart showing algorithm types"}'
```

**Response:**

```json
{
  "success": true,
  "query": "Explain machine learning and create a chart showing algorithm types",
  "response": {
    "answer": "Machine learning is a subset of AI... I've also created a chart showing the different types of ML algorithms...",
    "references": {"ragSources": ["file_001", "file_004"]},
    "fileIds": ["file_001", "file_004"],
    "chartConfig": {
      "type": "pie",
      "data": {...},
      "options": {...}
    }
  }
}
```

## 🔧 Agent Decision Logic

The delegating agent uses the following logic to route queries:

- **"chart"**: Queries asking for charts, graphs, or data visualization
- **"rag"**: Queries asking for information, facts, or knowledge
- **"both"**: Queries requiring both charting and information retrieval
- **"direct"**: Simple greetings or queries that don't need specialized tools

## 🛡️ Error Handling

The system includes robust error handling:

- **Vector search fallback**: If vector search fails, falls back to `fetchObjects` API
- **Tool execution errors**: Graceful handling of individual tool failures
- **Database connection**: Health checks and connection monitoring
- **API validation**: Input validation and error responses

## 📁 Project Structure

```
langchainpro/
├── src/
│   ├── agents/
│   │   ├── delegating-agent.js    # Main orchestrator
│   │   └── rag-agent.js           # RAG agent
│   ├── config/
│   │   ├── database.js            # Weaviate configuration
│   │   └── llm.js                 # LLM configuration
│   ├── setup/
│   │   └── weaviate-setup.js      # Database setup
│   ├── tools/
│   │   └── chart-tool.js          # Chart.js tool
│   └── index.js                   # Main application
├── docker-compose.yml             # Weaviate container
├── package.json                   # Dependencies
├── env.example                    # Environment template
└── README.md                      # This file
```

## 🧪 Testing

Test individual components:

```bash
# Test chart tool
curl -X POST http://localhost:3000/test/chart \
  -H "Content-Type: application/json" \
  -d '{"chartType": "line", "title": "Test Chart", "data": "Test data"}'

# Test RAG agent
curl -X POST http://localhost:3000/test/rag \
  -H "Content-Type: application/json" \
  -d '{"query": "What is supervised learning?"}'
```

## 🔍 Monitoring

Check system status:

```bash
# Health check
curl http://localhost:3000/health

# Database status
curl http://localhost:3000/status
```

## 🚨 Troubleshooting

### Common Issues

1. **Weaviate not starting**

   - Check Docker is running
   - Verify port 8080 is available
   - Check Docker logs: `docker-compose logs weaviate`

2. **API key issues**

   - Verify Google Gemini API key is set in `.env`
   - Check API key has proper permissions

3. **Database connection errors**

   - Ensure Weaviate container is running
   - Check network connectivity
   - Verify schema setup completed

4. **Agent initialization failures**
   - Run `/setup` endpoint first
   - Check all dependencies are installed
   - Verify LLM configuration

## 📈 Performance

- **Vector search**: Optimized with similarity scoring
- **Caching**: LLM responses cached for efficiency
- **Parallel processing**: Chart and RAG tools can run simultaneously
- **Memory management**: Efficient state management in LangGraph

## 🔮 Future Enhancements

- [ ] Add more chart types and customization options
- [ ] Implement conversation memory
- [ ] Add authentication and rate limiting
- [ ] Support for multiple vector databases
- [ ] Real-time data streaming
- [ ] Advanced analytics and monitoring

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ using Node.js, LangGraph, LangChain, and Weaviate**
