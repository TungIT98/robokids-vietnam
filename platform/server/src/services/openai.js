/**
 * RoboBuddy AI Tutor - OpenAI GPT-4o Service with MiniMax Fallback
 * Primary: GPT-4o for superior conversation quality
 * Fallback: MiniMax if GPT-4o fails or is unavailable
 */

import OpenAI from 'openai';
import { chatWithAI as chatWithMiniMax, buildSystemMessage as buildMiniMaxSystemMessage } from './minimax.js';
import { getSystemPromptForAge, getAgeGroup, AGE_GROUPS } from './robobuddy-templates.js';

// OpenAI client
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    openaiClient = new OpenAI({
      apiKey,
      organization: process.env.OPENAI_ORGANIZATION_ID || undefined,
      defaultHeaders: {
        'User-Agent': 'RoboKids/1.0'
      }
    });
  }
  return openaiClient;
}

// Rate limiting for GPT-4o (stricter than MiniMax due to cost)
const RATE_LIMIT_REQUESTS = parseInt(process.env.OPENAI_RATE_LIMIT_REQUESTS) || 20;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.OPENAI_RATE_LIMIT_WINDOW_MS) || 60000;

const requestCounts = new Map();

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = apiKey.substring(0, 8);

  const record = requestCounts.get(key);
  if (!record) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }

  if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((record.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)
    };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - record.count };
}

/**
 * Convert MiniMax-style messages to OpenAI format
 * MiniMax uses {role, content} same as OpenAI, so mostly passthrough
 * But we need to handle potential differences
 */
function convertMessagesForOpenAI(messages) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

/**
 * Build system message for OpenAI - uses age-specific prompts
 */
export function buildSystemMessage(age) {
  return {
    role: 'system',
    content: getSystemPromptForAge(age)
  };
}

/**
 * Chat with GPT-4o primary, MiniMax fallback
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {object} options - Options { maxTokens, temperature, model }
 * @returns {object} - { content, model, provider }
 */
export async function chatWithAI(messages, options = {}) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;

  // Try GPT-4o first
  if (openaiKey) {
    const rateLimit = checkRateLimit(openaiKey);
    if (!rateLimit.allowed) {
      // Rate limited on OpenAI, try MiniMax fallback
      console.warn('OpenAI rate limited, falling back to MiniMax');
      return await fallbackToMiniMax(messages, options);
    }

    try {
      const client = getOpenAIClient();
      if (!client) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await client.chat.completions.create({
        model: options.model || 'gpt-4o',
        messages: convertMessagesForOpenAI(messages),
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.8
      });

      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model || 'gpt-4o',
        provider: 'openai',
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : null
      };
    } catch (openaiError) {
      console.error('OpenAI error, falling back to MiniMax:', openaiError.message);

      // Fallback to MiniMax on any OpenAI error
      if (minimaxKey) {
        return await fallbackToMiniMax(messages, options);
      }

      // No fallback available, throw original error
      throw openaiError;
    }
  }

  // No OpenAI key, use MiniMax directly
  if (minimaxKey) {
    return await fallbackToMiniMax(messages, options);
  }

  throw new Error('No AI provider configured: set OPENAI_API_KEY or MINIMAX_API_KEY');
}

/**
 * Fallback to MiniMax when GPT-4o fails
 */
async function fallbackToMiniMax(messages, options) {
  const result = await chatWithMiniMax(messages, options);
  return {
    content: result.content || result.message?.content || '',
    model: result.model || 'minimax',
    provider: 'minimax',
    fallback: true
  };
}

/**
 * Test connection for health check
 * Tests OpenAI first, then MiniMax as backup
 */
export async function testConnection() {
  const openaiKey = process.env.OPENAI_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;

  // Test OpenAI
  if (openaiKey) {
    try {
      const client = getOpenAIClient();
      if (client) {
        await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }]
        });

        return {
          success: true,
          configured: true,
          primary: 'openai',
          primaryModel: 'gpt-4o',
          fallback: minimaxKey ? 'minimax' : null
        };
      }
    } catch (err) {
      console.error('OpenAI health check failed:', err.message);
      // Continue to test MiniMax
    }
  }

  // Test MiniMax as primary or fallback
  if (minimaxKey) {
    const { testConnection: testMiniMax } = await import('./minimax.js');
    const result = await testMiniMax();
    return {
      ...result,
      primary: openaiKey ? 'openai' : 'minimax',
      primaryModel: openaiKey ? 'gpt-4o' : result.model,
      fallback: null
    };
  }

  return {
    success: false,
    configured: false,
    error: 'No AI provider configured'
  };
}

/**
 * Get estimated cost per 1K tokens (for display in UI)
 */
export function getCostEstimate() {
  return {
    gpt4o: { input: 0.005, output: 0.015 }, // $0.005/1K input, $0.015/1K output
    gpt4oMini: { input: 0.00015, output: 0.0006 },
    minimax: { input: 0.01, output: 0.01 } // approximate
  };
}
