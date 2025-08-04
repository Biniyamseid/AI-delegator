import weaviate from 'weaviate-ts-client';
import dotenv from 'dotenv';

dotenv.config();

const client = weaviate.client({
  scheme: 'http',
  host: process.env.WEAVIATE_URL?.replace('http://', '') || 'localhost:8081',
  apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY || ''),
});

export default client; 
