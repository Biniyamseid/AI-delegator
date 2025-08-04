import { StateGraph, END } from '@langchain/langgraph';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from '../config/llm.js';
import ChartTool from '../tools/chart-tool.js';
import RAGAgent from './rag-agent.js';

class DelegatingAgent {
  constructor() {
    this.chartTool = new ChartTool();
    this.ragAgent = new RAGAgent();
    this.setupGraph();
  }

  setupGraph() {
    // Define the state schema
    const stateSchema = {
      messages: {
        value: (x, y) => x.concat(y),
        default: () => []
      },
      userQuery: {
        value: (x, y) => y,
        default: () => ''
      },
      decision: {
        value: (x, y) => y,
        default: () => null
      },
      chartResult: {
        value: (x, y) => y,
        default: () => null
      },
      ragResult: {
        value: (x, y) => y,
        default: () => null
      },
      finalResponse: {
        value: (x, y) => y,
        default: () => null
      }
    };

    // Create the state graph
    this.graph = new StateGraph({
      channels: stateSchema
    });

    // Add nodes
    this.graph.addNode('analyze_query', this.analyzeQuery.bind(this));
    this.graph.addNode('chart_tool', this.executeChartTool.bind(this));
    this.graph.addNode('rag_agent', this.executeRAGAgent.bind(this));
    this.graph.addNode('direct_response', this.directResponse.bind(this));
    this.graph.addNode('combine_results', this.combineResults.bind(this));

    // Set conditional edges from analyze_query
    this.graph.addConditionalEdges(
      'analyze_query',
      this.routeDecision.bind(this)
    );

    // Add edges from tools to combine_results
    this.graph.addEdge('chart_tool', 'combine_results');
    this.graph.addEdge('rag_agent', 'combine_results');
    this.graph.addEdge('direct_response', END);
    this.graph.addEdge('combine_results', END);

    // Set entry point
    this.graph.setEntryPoint('analyze_query');

    // Compile the graph
    this.app = this.graph.compile();
  }

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

  routeDecision(state) {
    const decision = state.decision;
    
    if (decision === 'chart') {
      return 'chart_tool';
    } else if (decision === 'rag') {
      return 'rag_agent';
    } else if (decision === 'both') {
      // For "both", we need to execute both tools
      // Since LangGraph doesn't support parallel execution easily, 
      // we'll start with chart and then handle RAG in combine_results
      return 'chart_tool';
    } else {
      return 'direct_response';
    }
  }

  async executeChartTool(state) {
    try {
      const userQuery = state.userQuery;
      
      // Determine chart type and parameters from the query
      const chartPrompt = ChatPromptTemplate.fromTemplate(`
Analyze the user query and extract chart parameters.

User Query: {query}

Extract the following information:
1. chartType: line, bar, pie, doughnut, or radar
2. title: A descriptive title for the chart
3. data: Description of what data should be visualized

Respond in JSON format:
{{
  "chartType": "line",
  "title": "Chart Title",
  "data": "Data description"
}}
`);

      const chain = chartPrompt.pipe(chatModel);
      const response = await chain.invoke({ query: userQuery });
      
      let chartParams;
      try {
        chartParams = JSON.parse(response.content);
      } catch (error) {
        chartParams = {
          chartType: 'bar',
          title: 'Data Visualization',
          data: userQuery
        };
      }

      const chartResult = await this.chartTool.invoke(JSON.stringify(chartParams));
      
      return {
        chartResult: JSON.parse(chartResult),
        messages: [...state.messages, { role: 'assistant', content: 'Chart tool executed' }]
      };

    } catch (error) {
      console.error('Chart tool error:', error);
      return {
        chartResult: { success: false, error: error.message },
        messages: [...state.messages, { role: 'assistant', content: 'Chart tool failed' }]
      };
    }
  }

  async executeRAGAgent(state) {
    try {
      const userQuery = state.userQuery;
      const ragResult = await this.ragAgent.query(userQuery);
      
      return {
        ragResult,
        messages: [...state.messages, { role: 'assistant', content: 'RAG agent executed' }]
      };

    } catch (error) {
      console.error('RAG agent error:', error);
      return {
        ragResult: { success: false, error: error.message },
        messages: [...state.messages, { role: 'assistant', content: 'RAG agent failed' }]
      };
    }
  }

  async directResponse(state) {
    const userQuery = state.userQuery;
    
    const prompt = ChatPromptTemplate.fromTemplate(`
You are a helpful assistant. Provide a direct response to the user's query.

User Query: {query}

Provide a helpful and informative response.
`);

    const chain = prompt.pipe(chatModel);
    const response = await chain.invoke({ query: userQuery });
    
    return {
      finalResponse: {
        answer: response.content,
        references: {},
        fileIds: [],
        chartConfig: null
      },
      messages: [...state.messages, { role: 'assistant', content: response.content }]
    };
  }

  async combineResults(state) {
    try {
      const userQuery = state.userQuery;
      const chartResult = state.chartResult;
      let ragResult = state.ragResult;
      
      // If we have a chart result but no RAG result, and the decision was "both",
      // execute the RAG agent now
      if (chartResult && !ragResult && state.decision === 'both') {
        ragResult = await this.ragAgent.query(userQuery);
      }
      
      let finalAnswer = '';
      let references = {};
      let fileIds = [];
      let chartConfig = null;

      // Process chart result
      if (chartResult && chartResult.success) {
        chartConfig = chartResult.chartConfig;
        finalAnswer += `I've created a chart for you. `;
      }

      // Process RAG result
      if (ragResult && ragResult.success) {
        finalAnswer += ragResult.answer;
        fileIds = ragResult.sources || [];
        references = { ragSources: fileIds };
      }

      // If we have both, create a comprehensive response
      if (chartResult && ragResult && chartResult.success && ragResult.success) {
        const combinePrompt = ChatPromptTemplate.fromTemplate(`
You have both chart data and information from a knowledge base. Create a comprehensive response that combines both.

User Query: {query}
Chart Information: {chartInfo}
Knowledge Base Information: {ragInfo}

Create a response that:
1. Answers the user's question using the knowledge base information
2. Mentions the chart that was created
3. Integrates both pieces of information naturally

Keep the response concise and helpful.
`);

        const chain = combinePrompt.pipe(chatModel);
        const response = await chain.invoke({
          query: userQuery,
          chartInfo: JSON.stringify(chartResult),
          ragInfo: ragResult.answer
        });

        finalAnswer = response.content;
      }

      // If we only have one result, use it
      if (!finalAnswer) {
        if (chartResult && chartResult.success) {
          finalAnswer = chartResult.message || 'Chart created successfully.';
        } else if (ragResult && ragResult.success) {
          finalAnswer = ragResult.answer;
        } else {
          finalAnswer = 'I encountered an error processing your request.';
        }
      }



      return {
        finalResponse: {
          answer: finalAnswer,
          references,
          fileIds,
          chartConfig
        },
        messages: [...state.messages, { role: 'assistant', content: finalAnswer }]
      };

    } catch (error) {
      console.error('Combine results error:', error);
      return {
        finalResponse: {
          answer: 'I encountered an error while processing your request.',
          references: {},
          fileIds: [],
          chartConfig: null
        },
        messages: [...state.messages, { role: 'assistant', content: 'Error in combining results' }]
      };
    }
  }

  
  async processQuery(userQuery) {
    try {
      const initialState = {
        userQuery,
        messages: [{ role: 'user', content: userQuery }]
      };

      const result = await this.app.invoke(initialState);
      
      return result.finalResponse || {
        answer: 'No response generated.',
        references: {},
        fileIds: [],
        chartConfig: null
      };

    } catch (error) {
      console.error('Delegating agent error:', error);
      return {
        answer: 'I encountered an error while processing your query.',
        references: {},
        fileIds: [],
        chartConfig: null
      };
    }
  }
}

export default DelegatingAgent;
