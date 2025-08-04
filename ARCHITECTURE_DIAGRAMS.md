# LangChainPro Architecture Diagrams

## 1. System Overview Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Browser]
        B[Mobile App]
        C[CLI Tools]
        D[API Clients]
    end

    subgraph "API Gateway Layer"
        E[Express.js Server]
        F[REST API Endpoints]
        G[Request Validation]
        H[Error Handling]
    end

    subgraph "Agent Layer"
        I[LangGraph State Machine]
        J[Delegating Agent]
        K[RAG Agent]
        L[Chart Tool]
    end

    subgraph "Data Layer"
        M[Weaviate Vector DB]
        N[Multi-Tenant Schema]
        O[Vector Embeddings]
    end

    subgraph "External Services"
        P[Google Gemini AI]
    end

    A --> E
    B --> E
    C --> E
    D --> E
    E --> I
    I --> J
    I --> K
    I --> L
    K --> M
    J --> P
    K --> P
    L --> P
```

## 2. Agent Decision Flow

```mermaid
flowchart TD
    A[User Query] --> B[Query Analysis]
    B --> C{Query Type Detection}

    C -->|Information Query| D[RAG Agent]
    C -->|Visualization Query| E[Chart Tool]
    C -->|Combined Query| F[Both Tools]
    C -->|Conversational| G[Direct Response]

    D --> H[Vector Search]
    H --> I[Context Retrieval]
    I --> J[Answer Generation]

    E --> K[Chart Parameters]
    K --> L[Chart Generation]
    L --> M[Chart Config]

    F --> N[Sequential Execution]
    N --> O[Chart Tool]
    N --> P[RAG Agent]
    O --> Q[Response Combination]
    P --> Q

    G --> R[Simple Response]

    J --> S[Final Response]
    M --> S
    Q --> S
    R --> S

    S --> T[Response Formatting]
    T --> U[Client Response]
```

## 3. LangGraph State Machine

```mermaid
stateDiagram-v2
    [*] --> analyze_query

    analyze_query --> routeDecision
    routeDecision --> chart_tool : decision = 'chart'
    routeDecision --> rag_agent : decision = 'rag'
    routeDecision --> direct_response : decision = 'direct'
    routeDecision --> chart_tool : decision = 'both'

    chart_tool --> combine_results
    rag_agent --> combine_results
    direct_response --> [*]

    combine_results --> [*]

    note right of analyze_query
        Analyze user query and
        determine routing decision
    end note

    note right of routeDecision
        Route to appropriate
        tool based on decision
    end note

    note right of combine_results
        Combine results from
        multiple tools if needed
    end note
```

## 4. Database Schema Design

```mermaid
erDiagram
    TENANT {
        string name PK
        boolean enabled
        timestamp created_at
    }

    QUESTION_ANSWER {
        string fileId PK
        string question
        string answer
        string tenant FK
        vector embedding
        timestamp created_at
    }

    TENANT ||--o{ QUESTION_ANSWER : contains
```

## 5. API Request/Response Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Agent
    participant Weaviate
    participant Gemini

    Client->>API: POST /query {query: "What is ML?"}
    API->>Agent: processQuery(query)
    Agent->>Agent: analyzeQuery()
    Agent->>Agent: routeDecision()
    Agent->>Weaviate: vectorSearch(query)
    Weaviate-->>Agent: searchResults
    Agent->>Gemini: generateAnswer(context)
    Gemini-->>Agent: answer
    Agent->>Agent: combineResults()
    Agent-->>API: finalResponse
    API-->>Client: {answer, references, fileIds}
```

## 6. Error Handling Flow

```mermaid
flowchart TD
    A[Request] --> B{Input Validation}
    B -->|Valid| C[Process Request]
    B -->|Invalid| D[Return 400 Error]

    C --> E{Database Connection}
    E -->|Connected| F[Execute Query]
    E -->|Failed| G[Return 503 Error]

    F --> H{Vector Search}
    H -->|Success| I[Generate Response]
    H -->|Failed| J[Keyword Search]

    J -->|Success| I
    J -->|Failed| K[Fetch All Objects]

    K -->|Success| I
    K -->|Failed| L[Return Error Response]

    I --> M{LLM Generation}
    M -->|Success| N[Return Response]
    M -->|Failed| O[Return Fallback Response]
```

## 7. Deployment Architecture

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx]
    end

    subgraph "Application Layer"
        APP1[App Instance 1]
        APP2[App Instance 2]
        APP3[App Instance 3]
    end

    subgraph "Database Layer"
        WEAVIATE[Weaviate Container]
        REDIS[Redis Cache]
    end

    subgraph "External Services"
        GEMINI[Google Gemini AI]
    end

    LB --> APP1
    LB --> APP2
    LB --> APP3

    APP1 --> WEAVIATE
    APP2 --> WEAVIATE
    APP3 --> WEAVIATE

    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS

    APP1 --> GEMINI
    APP2 --> GEMINI
    APP3 --> GEMINI
```

## 8. Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Input Processing"
        A[User Query]
        B[Query Analysis]
        C[Decision Making]
    end

    subgraph "Tool Execution"
        D[RAG Agent]
        E[Chart Tool]
        F[Direct Response]
    end

    subgraph "Data Sources"
        G[Weaviate Vector DB]
        H[Google Gemini AI]
        I[Chart.js Configs]
    end

    subgraph "Response Generation"
        J[Context Retrieval]
        K[Answer Generation]
        L[Response Combination]
    end

    A --> B
    B --> C
    C --> D
    C --> E
    C --> F

    D --> G
    D --> H
    E --> H
    E --> I
    F --> H

    G --> J
    H --> K
    I --> L
    J --> L
    K --> L
```

## 9. Security Architecture

```mermaid
graph TB
    subgraph "Network Security"
        FW[Firewall]
        LB[Load Balancer]
    end

    subgraph "Application Security"
        VAL[Input Validation]
        RATE[Rate Limiting]
        CORS[CORS Configuration]
        AUTH[Authentication]
    end

    subgraph "Data Security"
        ENC[Data Encryption]
        TENANT[Multi-Tenancy]
        BACKUP[Backup & Recovery]
    end

    FW --> LB
    LB --> VAL
    VAL --> RATE
    RATE --> CORS
    CORS --> AUTH
    AUTH --> ENC
    ENC --> TENANT
    TENANT --> BACKUP
```

## 10. Monitoring and Observability

```mermaid
graph TB
    subgraph "Application Metrics"
        REQ[Request Count]
        TIME[Response Time]
        ERR[Error Rate]
        CPU[CPU Usage]
        MEM[Memory Usage]
    end

    subgraph "Business Metrics"
        RAG[RAG Queries]
        CHART[Chart Queries]
        COMBINED[Combined Queries]
        DIRECT[Direct Queries]
    end

    subgraph "Infrastructure Metrics"
        DB[Database Health]
        API[API Health]
        AGENT[Agent Status]
    end

    subgraph "Alerting"
        ALERT[Alert Manager]
        EMAIL[Email Notifications]
        SLACK[Slack Notifications]
    end

    REQ --> ALERT
    TIME --> ALERT
    ERR --> ALERT
    CPU --> ALERT
    MEM --> ALERT
    DB --> ALERT
    API --> ALERT
    AGENT --> ALERT

    ALERT --> EMAIL
    ALERT --> SLACK
```

## 11. Performance Optimization Flow

```mermaid
flowchart TD
    A[Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Response]
    B -->|No| D[Process Request]

    D --> E{Parallel Execution?}
    E -->|Yes| F[Execute Tools in Parallel]
    E -->|No| G[Execute Tools Sequentially]

    F --> H[Combine Results]
    G --> H

    H --> I[Cache Response]
    I --> J[Return Response]
    C --> K[End]
    J --> K
```

## 12. Component Interaction Matrix

| Component            | Delegating Agent | RAG Agent       | Chart Tool     | Weaviate | Gemini AI |
| -------------------- | ---------------- | --------------- | -------------- | -------- | --------- |
| **Delegating Agent** | -                | Calls           | Calls          | -        | Calls     |
| **RAG Agent**        | Returns Results  | -               | -              | Queries  | Calls     |
| **Chart Tool**       | Returns Results  | -               | -              | -        | Calls     |
| **Weaviate**         | -                | Returns Data    | -              | -        | -         |
| **Gemini AI**        | -                | Returns Answers | Returns Config | -        | -         |

## 13. Technology Stack Visualization

```mermaid
graph TB
    subgraph "Frontend"
        HTML[HTML/CSS/JS]
        REACT[React.js]
        CHART[Chart.js]
    end

    subgraph "Backend"
        NODE[Node.js]
        EXPRESS[Express.js]
        LANGCHAIN[LangChain]
        LANGGRAPH[LangGraph]
    end

    subgraph "Database"
        WEAVIATE[Weaviate]
        DOCKER[Docker]
    end

    subgraph "AI/ML"
        GEMINI[Google Gemini]
        VECTOR[Vector Search]
        RAG[RAG Pattern]
    end

    subgraph "Infrastructure"
        COMPOSE[Docker Compose]
        NGINX[Nginx]
        REDIS[Redis]
    end

    HTML --> NODE
    REACT --> NODE
    CHART --> NODE

    NODE --> EXPRESS
    EXPRESS --> LANGCHAIN
    LANGCHAIN --> LANGGRAPH

    LANGGRAPH --> WEAVIATE
    LANGGRAPH --> GEMINI

    WEAVIATE --> DOCKER
    NODE --> COMPOSE
    COMPOSE --> NGINX
    COMPOSE --> REDIS
```

These diagrams provide a comprehensive visual representation of the LangChainPro system architecture, helping senior developers understand the complex interactions and design decisions made in the project.


