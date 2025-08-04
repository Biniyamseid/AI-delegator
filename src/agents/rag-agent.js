import { ChatPromptTemplate } from '@langchain/core/prompts';
import { chatModel } from '../config/llm.js';
import client from '../config/database.js';

const CLASS_NAME = 'QuestionAnswer';
const TENANT_NAME = 'default';

class RAGAgent {
  constructor() {
    // Don't setup the complex agent, just use direct methods
  }

  async query(userQuery) {
    try {
      // First, search the database
      const searchResults = await this.directSearch(userQuery, 3);
      
      if (!searchResults.success || searchResults.results.length === 0) {
        return {
          success: false,
          answer: 'I could not find relevant information in the database.',
          sources: []
        };
      }

      // Create a prompt with the retrieved information
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
        question: userQuery 
      });

      return {
        success: true,
        answer: response.content,
        sources: searchResults.results.map(r => r.fileId)
      };

    } catch (error) {
      console.error('RAG Agent error:', error);
      return {
        success: false,
        error: error.message,
        answer: 'I encountered an error while processing your query.'
      };
    }
  }

  // Direct search method for when you need more control
  async directSearch(query, limit = 3) {
    try {
      let result;
      try {
        result = await client.graphql
          .get()
          .withClassName(CLASS_NAME)
          .withTenant(TENANT_NAME)
          .withFields('fileId question answer _additional { distance }')
          .withNearText({ concepts: [query] })
          .withLimit(limit)
          .do();
      } catch (error) {
                  // Fallback to simple text search - use meaningful keywords
          const keywords = query.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(' ')
            .filter(word => word.length > 2 && !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word))
            .slice(0, 3); // Take first 3 meaningful keywords
          
          if (keywords.length === 0) {
            // If no meaningful keywords, just get all data
            result = await client.data
              .getter()
              .withClassName(CLASS_NAME)
              .withTenant(TENANT_NAME)
              .withLimit(limit)
              .do();
          } else {
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
          }
      }

      const results = result.data.Get[CLASS_NAME] || [];
      
      return {
        success: true,
        results: results.map(item => ({
          fileId: item.fileId,
          question: item.question,
          answer: item.answer,
          distance: item._additional?.distance
        })),
        count: results.length
      };

    } catch (error) {
      console.error('Direct search error:', error);
      
      // Fallback to fetchObjects
      try {
        const allObjects = await client.data
          .getter()
          .withClassName(CLASS_NAME)
          .withTenant(TENANT_NAME)
          .withLimit(limit)
          .do();

        const results = allObjects.data || [];
        
        return {
          success: true,
          results: results.map(item => ({
            fileId: item.properties.fileId,
            question: item.properties.question,
            answer: item.properties.answer
          })),
          count: results.length,
          note: 'Used fallback fetchObjects API'
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
}

export default RAGAgent; 
