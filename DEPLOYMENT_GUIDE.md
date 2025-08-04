# LangChainPro Deployment Guide

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows with WSL2
- **Node.js**: Version 18.0.0 or higher
- **Docker**: Version 20.10.0 or higher
- **Docker Compose**: Version 2.0.0 or higher
- **Git**: Version 2.30.0 or higher

### Required Accounts

- **Google Cloud Platform**: For Gemini AI API access
- **GitHub**: For code repository (optional)

## Step 1: Environment Setup

### 1.1 Clone the Repository

```bash
git clone <repository-url>
cd langchainpro
```

### 1.2 Install Dependencies

```bash
npm install
```

### 1.3 Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```env
# Google Gemini API Configuration
GOOGLE_API_KEY=your_google_api_key_here

# Weaviate Configuration
WEAVIATE_URL=http://localhost:8081
WEAVIATE_API_KEY=

# Application Configuration
PORT=3000
NODE_ENV=development

# LLM Configuration
LLM_MODEL=gemini-1.5-flash
TEMPERATURE=0.7
MAX_TOKENS=1000
```

### 1.4 Get Google Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

## Step 2: Database Setup

### 2.1 Start Weaviate Container

```bash
# Start Weaviate using Docker Compose
docker-compose up -d weaviate

# Verify container is running
docker ps | grep weaviate
```

### 2.2 Verify Weaviate Health

```bash
# Wait for Weaviate to be ready (30-60 seconds)
sleep 30

# Check Weaviate health
curl http://localhost:8081/v1/meta
```

**Expected Response:**

```json
{
  "hostname": "http://[::]:8080",
  "modules": {},
  "version": "1.22.4"
}
```

## Step 3: Application Setup

### 3.1 Initialize Database and Agents

```bash
# Start the application
npm start

# In a new terminal, initialize the system
curl -X POST http://localhost:3000/setup
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Weaviate database and agent system initialized successfully"
}
```

### 3.2 Verify System Health

```bash
# Check system health
curl http://localhost:3000/health

# Check detailed status
curl http://localhost:3000/status
```

## Step 4: Testing the System

### 4.1 Test RAG Agent

```bash
curl -X POST http://localhost:3000/test/rag \
  -H "Content-Type: application/json" \
  -d '{"query": "What is machine learning?"}'
```

### 4.2 Test Chart Tool

```bash
curl -X POST http://localhost:3000/test/chart \
  -H "Content-Type: application/json" \
  -d '{"chartType": "pie", "title": "Sales Data", "data": "Monthly sales"}'
```

### 4.3 Test Main Query Endpoint

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain machine learning and create a chart showing algorithm types"}'
```

## Step 5: Production Deployment

### 5.1 Production Environment Setup

```bash
# Create production environment file
cp env.example .env.production

# Update production settings
nano .env.production
```

**Production Environment Variables:**

```env
NODE_ENV=production
PORT=3000
GOOGLE_API_KEY=your_production_api_key
WEAVIATE_URL=http://weaviate:8080
LLM_MODEL=gemini-1.5-flash
TEMPERATURE=0.7
MAX_TOKENS=1000
```

### 5.2 Docker Production Build

```bash
# Build production Docker image
docker build -t langchainpro:latest .

# Create production docker-compose file
cat > docker-compose.prod.yml << EOF
version: '3.4'
services:
  weaviate:
    image: semitechnologies/weaviate:1.22.4
    ports:
      - "8081:8080"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      CLUSTER_HOSTNAME: 'node1'
    volumes:
      - weaviate_data:/var/lib/weaviate
    restart: on-failure:0

  app:
    image: langchainpro:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - WEAVIATE_URL=http://weaviate:8080
      - GOOGLE_API_KEY=\${GOOGLE_API_KEY}
      - PORT=3000
    depends_on:
      - weaviate
    restart: on-failure:0

volumes:
  weaviate_data:
EOF
```

### 5.3 Deploy to Production

```bash
# Deploy using production compose file
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps

# Check application health
curl http://localhost:3000/health
```

## Step 6: Monitoring and Maintenance

### 6.1 Log Monitoring

```bash
# View application logs
docker-compose logs -f app

# View Weaviate logs
docker-compose logs -f weaviate

# View all logs
docker-compose logs -f
```

### 6.2 Performance Monitoring

```bash
# Monitor system resources
docker stats

# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 6.3 Backup and Recovery

```bash
# Backup Weaviate data
docker run --rm -v langchainpro_weaviate_data:/data -v $(pwd):/backup alpine tar czf /backup/weaviate-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore Weaviate data
docker run --rm -v langchainpro_weaviate_data:/data -v $(pwd):/backup alpine tar xzf /backup/weaviate-backup-YYYYMMDD.tar.gz -C /data
```

## Step 7: Troubleshooting

### 7.1 Common Issues

#### Issue: Weaviate Container Won't Start

```bash
# Check Docker logs
docker-compose logs weaviate

# Check port availability
netstat -tulpn | grep 8081

# Restart container
docker-compose restart weaviate
```

#### Issue: Application Can't Connect to Weaviate

```bash
# Check Weaviate health
curl http://localhost:8081/v1/meta

# Check network connectivity
docker exec langchainpro-app-1 ping weaviate

# Restart application
docker-compose restart app
```

#### Issue: Google API Key Errors

```bash
# Verify API key format
echo $GOOGLE_API_KEY

# Test API key
curl -H "Authorization: Bearer $GOOGLE_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models
```

### 7.2 Debug Mode

```bash
# Enable debug logging
export DEBUG=langchainpro:*

# Start with debug output
npm run dev
```

### 7.3 Reset System

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker-compose down -v

# Rebuild and restart
docker-compose up --build -d
```

## Step 8: Scaling and Optimization

### 8.1 Horizontal Scaling

```bash
# Scale application instances
docker-compose up -d --scale app=3

# Add load balancer
cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream app_servers {
        server app:3000;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://app_servers;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF
```

### 8.2 Performance Optimization

```bash
# Enable response caching
npm install redis

# Configure Redis in docker-compose
echo "  redis:
    image: redis:alpine
    ports:
      - \"6379:6379\"" >> docker-compose.yml
```

## Step 9: Security Hardening

### 9.1 Network Security

```bash
# Configure firewall
sudo ufw allow 3000
sudo ufw allow 8081
sudo ufw enable

# Use HTTPS (production)
npm install express-rate-limit helmet
```

### 9.2 Environment Security

```bash
# Secure environment variables
chmod 600 .env

# Use secrets management
docker secret create google_api_key .env
```

## Step 10: Documentation and Support

### 10.1 API Documentation

```bash
# Generate API documentation
npm install swagger-jsdoc swagger-ui-express

# Access API docs
curl http://localhost:3000/api-docs
```

### 10.2 System Documentation

```bash
# Generate system documentation
npm install jsdoc

# Build documentation
npm run docs
```

## Verification Checklist

- [ ] Environment variables configured
- [ ] Weaviate container running
- [ ] Application container running
- [ ] Database initialized
- [ ] Agents initialized
- [ ] Health checks passing
- [ ] RAG agent working
- [ ] Chart tool working
- [ ] Combined queries working
- [ ] Error handling working
- [ ] Logs accessible
- [ ] Monitoring configured
- [ ] Security measures in place

## Support and Resources


- **Project Repository**: [GitHub Link]
- **Documentation**: [Documentation Link]
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]

## License

This project is licensed under the MIT License - see the LICENSE file for details.
