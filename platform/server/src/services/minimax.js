const MINIMAX_ENDPOINT = process.env.MINIMAX_ENDPOINT || 'https://api.minimax.io/anthropic/v1/messages';
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.5';

// Rate limiting
const RATE_LIMIT_REQUESTS = parseInt(process.env.MINIMAX_RATE_LIMIT_REQUESTS) || 30;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.MINIMAX_RATE_LIMIT_WINDOW_MS) || 60000;

// In-memory rate limiter
const requestCounts = new Map();

function checkRateLimit(apiKey) {
  const now = Date.now();
  const key = apiKey.substring(0, 8); // Use truncated key for identification

  const record = requestCounts.get(key);
  if (!record) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1 };
  }

  // Reset if window has passed
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

// ============================================
// SEMANTIC CACHE (LRU) FOR COMMON QUERIES
// ============================================
const CACHE_MAX_SIZE = parseInt(process.env.AI_CACHE_SIZE) || 200;
const CACHE_TTL_MS = parseInt(process.env.AI_CACHE_TTL_MS) || 5 * 60 * 1000; // 5 min default

// Simple LRU cache with hash-based key matching
class SemanticCache {
  constructor(maxSize = CACHE_MAX_SIZE, ttlMs = CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  _hashKey(messages) {
    // Create a deterministic hash from message content
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  _shouldCache(messages) {
    // Only cache messages that are short and don't contain user-specific data
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMsg) return false;
    // Don't cache if message is too long (>500 chars)
    return lastUserMsg.content.length < 500;
  }

  get(messages) {
    if (!this._shouldCache(messages)) return null;

    const key = this._hashKey(messages);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.response;
  }

  set(messages, response) {
    if (!this._shouldCache(messages)) return;

    const key = this._hashKey(messages);

    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  get stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

const semanticCache = new SemanticCache();

// Age-specific system prompts - imported from robobuddy-templates
import { getSystemPromptForAge, getAgeGroup, AGE_GROUPS } from './robobuddy-templates.js';
import { buildCurriculumSystemPrompt } from './curriculum-context.js';

// Legacy prompt for backward compatibility (default to intermediate/10-year-old)
const ROBOBUDDY_PROMPT = `Em là RoboBuddy, một AI tutor vui vẻ và thân thiện, 10 tuổi.
Em giúp các bạn học sinh Việt Nam học lập trình robot.
Nếu code có lỗi, hãy giải thích bằng từ đơn giản, vui vẻ.
Nếu đúng, hãy khen và gợi ý cải tiện.
Luôn trả lời bằng tiếng Việt.
Khi phân tích code Blockly XML, hãy:
1. Giải thích những gì code đang làm
2. Chỉ ra lỗi (nếu có)
3. Đề xuất cách sửa bằng tiếng Việt dễ hiểu`;

export async function chatWithAI(messages, options = {}) {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  // Check rate limit
  const rateLimit = checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    const error = new Error('Rate limit exceeded');
    error.statusCode = 429;
    error.retryAfter = rateLimit.retryAfter;
    throw error;
  }

  // Check semantic cache first (only for non-streaming)
  if (!options.stream) {
    const cachedResponse = semanticCache.get(messages);
    if (cachedResponse) {
      return { content: cachedResponse, cached: true };
    }
  }

  const startTime = Date.now();
  const response = await fetch(MINIMAX_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: options.maxTokens || 4096,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const responseText = result.content || result.message?.content || '';

  // Cache the response for common queries
  if (responseText && !options.stream) {
    semanticCache.set(messages, responseText);
  }

  return {
    content: responseText,
    model: result.model || MODEL,
    responseTimeMs: Date.now() - startTime
  };
}

/**
 * Build system message - uses age-specific prompt with curriculum context if age is provided
 * @param {number} [age] - Student age (optional, defaults to 10-year-old intermediate)
 * @param {number} [currentLesson] - Optional current lesson number for curriculum context
 * @returns {object} - System message object
 */
export function buildSystemMessage(age, currentLesson = null) {
  if (age) {
    // Use curriculum-aware prompt if lesson is provided
    if (currentLesson) {
      return {
        role: 'system',
        content: buildCurriculumSystemPrompt(age, currentLesson)
      };
    }
    return {
      role: 'system',
      content: getSystemPromptForAge(age)
    };
  }
  return {
    role: 'system',
    content: ROBOBUDDY_PROMPT
  };
}

/**
 * Build chat messages with age-appropriate system prompt
 * @param {string} userMessage - User message
 * @param {number} [age] - Student age (optional)
 * @param {string} [codeContext] - Optional code context
 * @returns {Array} - Messages array for AI API
 */
export function buildChatMessages(userMessage, age, codeContext = null) {
  const systemMsg = buildSystemMessage(age);
  let userContent = userMessage;
  if (codeContext) {
    userContent = `${userMessage}\n\nCode của bạn:\n\`\`\`\n${codeContext}\n\`\`\``;
  }
  return [
    systemMsg,
    { role: 'user', content: userContent }
  ];
}

export function getCacheStats() {
  return semanticCache.stats;
}

export function clearCache() {
  semanticCache.clear();
}

export async function testConnection() {
  const apiKey = process.env.MINIMAX_API_KEY;
  const orgId = process.env.MINIMAX_ORGANIZATION_ID;

  if (!apiKey) {
    return {
      success: false,
      error: 'MINIMAX_API_KEY not configured',
      configured: false
    };
  }

  try {
    // Send a minimal test request
    const response = await fetch(MINIMAX_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      return {
        success: true,
        configured: true,
        endpoint: MINIMAX_ENDPOINT,
        model: MODEL
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        configured: true,
        error: `API error: ${response.status}`,
        details: errorText
      };
    }
  } catch (err) {
    return {
      success: false,
      configured: true,
      error: err.message
    };
  }
}