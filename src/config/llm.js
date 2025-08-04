import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);


// Create LangChain chat model
const modelName = process.env.LLM_MODEL || 'gemini-1.5-flash';
console.log('Using LLM model:', modelName);

const chatModel = new ChatGoogleGenerativeAI({
  model: modelName,
  temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
  maxOutputTokens: parseInt(process.env.MAX_TOKENS) || 1000,
  apiKey: process.env.GOOGLE_API_KEY,
});

export { genAI, chatModel }; 