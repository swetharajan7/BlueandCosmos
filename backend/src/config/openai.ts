import OpenAI from 'openai';
import { config } from 'dotenv';

config();

// Polyfill fetch for older Node.js versions
if (!globalThis.fetch) {
  const fetch = require('node-fetch');
  globalThis.fetch = fetch;
}

// OpenAI Configuration
export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4',
  maxTokens: 4000,
  temperature: 0.7,
  rateLimits: {
    requestsPerMinute: 60,
    tokensPerMinute: 90000,
    requestsPerDay: 10000
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  }
};

// Initialize OpenAI client lazily
let _openaiClient: OpenAI | null = null;

export const getOpenAIClient = (): OpenAI => {
  if (!_openaiClient) {
    if (!openaiConfig.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    _openaiClient = new OpenAI({
      apiKey: openaiConfig.apiKey,
    });
  }
  return _openaiClient;
};

// For backward compatibility
export const openaiClient = {
  get chat() {
    return getOpenAIClient().chat;
  }
};

// Validate OpenAI configuration
export const validateOpenAIConfig = (): boolean => {
  if (!openaiConfig.apiKey) {
    console.error('OpenAI API key is not configured');
    return false;
  }
  
  if (!openaiConfig.model) {
    console.error('OpenAI model is not configured');
    return false;
  }
  
  return true;
};