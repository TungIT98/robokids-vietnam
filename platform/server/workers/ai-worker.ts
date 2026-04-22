/**
 * Cloudflare Worker: RoboKids AI API
 *
 * Edge AI endpoints for RoboBuddy tutor using MiniMax API.
 * Deploy: wrangler deploy workers/ai-worker.ts --env production
 */

interface Env {
  MINIMAX_API_KEY: string;
  MINIMAX_ENDPOINT?: string;
  MINIMAX_MODEL?: string;
  AI_CACHE_SIZE?: string;
  AI_CACHE_TTL_MS?: string;
  ALLOWED_ORIGINS?: string;
}

// ============================================
// SEMANTIC CACHE (LRU) FOR COMMON QUERIES
// ============================================

const CACHE_MAX_SIZE = 200;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min default

class SemanticCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = CACHE_MAX_SIZE, ttlMs = CACHE_TTL_MS) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  private hashKey(messages: { role: string; content: string }[]): string {
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private shouldCache(messages: { role: string; content: string }[]): boolean {
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMsg) return false;
    return lastUserMsg.content.length < 500;
  }

  get(messages: { role: string; content: string }[]): string | null {
    if (!this.shouldCache(messages)) return null;
    const key = this.hashKey(messages);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.response;
  }

  set(messages: { role: string; content: string }[], response: string): void {
    if (!this.shouldCache(messages)) return;
    const key = this.hashKey(messages);
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get stats() {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// ============================================
// AGE GROUP HELPERS
// ============================================

type AgeGroup = 'beginner' | 'intermediate' | 'advanced';

function getAgeGroup(age: number | null): AgeGroup {
  if (!age) return 'intermediate';
  if (age >= 6 && age <= 8) return 'beginner';
  if (age >= 9 && age <= 12) return 'intermediate';
  if (age >= 13 && age <= 16) return 'advanced';
  return 'intermediate';
}

// ============================================
// ROBOBUDDY SYSTEM PROMPTS (inline, no imports)
// ============================================

const AGE_SYSTEM_PROMPTS: Record<AgeGroup, string> = {
  beginner: `🌟 Chào mừng đến với HỌC VIỆN VŨ TRỤ ROBOKIDS! 🚀

Em là RoboBuddy - phi hành gia AI của các bạn! Em 7 tuổi và là hướng dẫn viên vũ trụ siêu cool! ⭐

Em giúp các phi hành gia nhí (các bạn học sinh Việt Nam) học lập trình robot để khám phá vũ trụ!
Nhiệm vụ của chúng ta: Cùng nhau lập trình robot tàu vũ trụ và hoàn thành các sứ mệnh vũ trụ! 🌌

Phong cách giao tiếp:
- Nói chuyện vui vẻ như một người bạn phi hành gia
- Luôn dùng emoji vũ trụ (🚀🌟⭐💫🌙🔭🛸👩‍🚀)
- Giải thích đơn giản bằng ví dụ từ đời thường
- Khen ngợi nhiệt tình khi làm đúng! 🎉

Khi phân tích code Blockly:
1. Dùng từ rất đơn giản, dễ hiểu
2. Dùng hình ảnh và emoji minh họa
3. Gợi ý bằng câu hỏi vui để các bạn tự khám phá
4. Luôn động viên tinh thần!

QUAN TRỌNG - Chế độ CHỦ ĐỘNG (Proactive):
- Theo dõi "đồng hồ vũ trụ" - nếu các bạn mất >3 phút trên một bài, hãy chủ động hỏi!
- Nếu thấy các bạn cố gắng nhiều lần mà chưa được, hãy gợi ý ngay!
- Luôn sẵn sàng hỗ trợ trước khi các bạn "mắc kẹt" trên vũ trụ! 🌠`,

  intermediate: `🌟 Chào mừng đến với HỌC VIỆN VŨ TRỤ ROBOKIDS! 🚀

Em là RoboBuddy - phi hành gia AI thân thiện! Em 10 tuổi và là hướng dẫn viên vũ trụ của các bạn! 🌌

Em giúp các phi hành gia trẻ (các bạn học sinh Việt Nam) học lập trình robot để khám phá vũ trụ!
Nhiệm vụ: Cùng nhau lập trình tàu vũ trụ, điều khiển robot hoàn thành các thử thách vũ trụ! 🛸

Phong cách:
- Thân thiện, nhiệt tình, vui vẻ
- Dùng emoji vũ trụ (🚀🌟⭐💫🌙🔭)
- Giải thích rõ ràng, dễ hiểu
- Động viên tinh thần học tập

Khi phân tích code Blockly XML:
1. Giải thích rõ ràng những gì code đang làm
2. Chỉ ra lỗi (nếu có) một cách nhẹ nhàng
3. Đề xuất cách sửa bằng tiếng Việt dễ hiểu

QUAN TRỌNG - Chế độ CHỦ ĐỘNG (Proactive):
- Theo dõi thời gian làm bài - nếu >5 phút mà chưa xong, hãy chủ động hỏi!
- Nếu thấy các bạn gặp khó khăn (nhiều lần thử sai), hãy gợi ý hỗ trợ!
- Luôn hỗ trợ trước khi các bạn "mắc kẹt" trên vũ trụ! 💫`,

  advanced: `🌟 Chào mừng đến với HỌC VIỆN VŨ TRỤ ROBOKIDS! 🚀

Em là RoboBuddy - phi hành gia AI cao cấp! Em 14 tuổi và là chuyên gia vũ trụ! 🧑‍🚀

Em giúp các phi hành gia tương lai (các bạn học sinh Việt Nam) học lập trình robot ở mức nâng cao để chinh phục vũ trụ!
Nhiệm vụ: Phân tích, tối ưu và mở rộng code robot cho các sứ mệnh vũ trụ phức tạp! 🌌

Phong cách:
- Chuyên nghiệp, chi tiết, chính xác
- Khuyến khích tư duy logic và phân tích
- Dùng thuật ngữ kỹ thuật khi cần
- Đưa ra các đề xuất tối ưu và mở rộng

Khi phân tích code Blockly XML hoặc JavaScript:
1. Giải thích luồng hoạt động chi tiết
2. Phân tích sâu lỗi logic và lỗi cú pháp
3. Đề xuất cách tối ưu code
4. Liên hệ với các khái niệm lập trình thực tế và best practices

QUAN TRỌNG - Chế độ CHỦ ĐỘNG (Proactive):
- Theo dõi tiến độ học tập - nếu thấy khó khăn kéo dài (>8 phút), hãy chủ động hỗ trợ!
- Phân tích patterns trong quá trình debug và đưa ra gợi ý có hệ thống
- Hỗ trợ chia nhỏ vấn đề phức tạp thành các bước đơn giản hơn
- Luôn sẵn sàng là đối tác debug hiệu quả! 🔧`
};

function buildSystemMessage(age: number | null): { role: string; content: string } {
  const group = getAgeGroup(age);
  return { role: 'system', content: AGE_SYSTEM_PROMPTS[group] };
}

// ============================================
// SESSION STORAGE (In-memory for Worker)
// ============================================

interface Session {
  messages: { role: string; content: string }[];
  lastActive: number;
  age: number | null;
  currentLesson: string | null;
}

const sessions = new Map<string, Session>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ============================================
// MINIMAX API CALL
// ============================================

async function chatWithAI(
  messages: { role: string; content: string }[],
  env: Env
): Promise<{ content: string; model: string; cached?: boolean; responseTimeMs: number }> {
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  const endpoint = env.MINIMAX_ENDPOINT || 'https://api.minimax.io/anthropic/v1/messages';
  const model = env.MINIMAX_MODEL || 'MiniMax-M2.5';

  const cache = new SemanticCache(
    parseInt(env.AI_CACHE_SIZE || '200'),
    parseInt(env.AI_CACHE_TTL_MS || String(CACHE_TTL_MS))
  );

  // Check semantic cache first
  const cachedResponse = cache.get(messages);
  if (cachedResponse) {
    return { content: cachedResponse, model, cached: true, responseTimeMs: 0 };
  }

  const startTime = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const responseText = result.content || result.message?.content || '';

  if (responseText) {
    cache.set(messages, responseText);
  }

  return {
    content: responseText,
    model: result.model || model,
    responseTimeMs: Date.now() - startTime
  };
}

// ============================================
// CORS HEADERS
// ============================================

function getCorsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || 'https://robokids.pages.dev,https://robokids.vn,https://www.robokids.vn',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

// ============================================
// REQUEST HANDLERS
// ============================================

async function handleHealthCheck(env: Env) {
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) {
    return jsonResponse({ success: false, error: 'MINIMAX_API_KEY not configured' }, 503, env);
  }

  try {
    const endpoint = env.MINIMAX_ENDPOINT || 'https://api.minimax.io/anthropic/v1/messages';
    const model = env.MINIMAX_MODEL || 'MiniMax-M2.5';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] })
    });

    if (response.ok) {
      return jsonResponse({ success: true, configured: true, endpoint, model }, 200, env);
    }
    return jsonResponse({ success: false, configured: true, error: `API error: ${response.status}` }, 503, env);
  } catch (err) {
    return jsonResponse({ success: false, configured: true, error: err instanceof Error ? err.message : 'Unknown error' }, 503, env);
  }
}

async function handleChat(request: Request, env: Env) {
  try {
    const body = await request.json() as {
      messages?: { role: string; content: string }[];
      sessionId?: string;
      age?: number;
      currentLesson?: string;
    };

    if (!body.messages || !Array.isArray(body.messages)) {
      return jsonResponse({ error: 'messages array is required' }, 400, env);
    }

    let sessionHistory: { role: string; content: string }[] = [];
    let effectiveAge: number | null = body.age || null;
    let currentLesson = body.currentLesson;

    if (body.sessionId) {
      const session = sessions.get(body.sessionId);
      if (session) {
        session.lastActive = Date.now();
        sessionHistory = session.messages;
        if (!effectiveAge && session.age) effectiveAge = session.age;
        if (!currentLesson && session.currentLesson) currentLesson = session.currentLesson;
      }
    }

    const systemMsg = buildSystemMessage(effectiveAge);
    const fullMessages = sessionHistory.length > 0
      ? [systemMsg, ...sessionHistory, ...body.messages]
      : [systemMsg, ...body.messages];

    const result = await chatWithAI(fullMessages, env);

    if (body.sessionId) {
      const session = sessions.get(body.sessionId) || { messages: [], lastActive: Date.now(), age: body.age };
      for (const msg of body.messages) session.messages.push(msg);
      session.messages.push({ role: 'assistant', content: result.content });
      session.lastActive = Date.now();
      if (effectiveAge) session.age = effectiveAge;
      if (currentLesson) session.currentLesson = currentLesson;
      sessions.set(body.sessionId, session);
    }

    return jsonResponse({
      response: result.content,
      model: result.model,
      cached: result.cached,
      responseTimeMs: result.responseTimeMs
    }, 200, env);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500, env);
  }
}

async function handleAnalyze(request: Request, env: Env) {
  try {
    const body = await request.json() as {
      blocklyXml?: string;
      context?: string;
      sessionId?: string;
      age?: number;
      currentLesson?: string;
    };

    if (!body.blocklyXml) {
      return jsonResponse({ error: 'blocklyXml is required' }, 400, env);
    }

    const userMsg: { role: string; content: string } = {
      role: 'user',
      content: `Hãy phân tích đoạn code Blockly XML sau đây:\n\n${body.blocklyXml}\n\n${body.context ? `Ngữ cảnh thêm: ${body.context}` : ''}`
    };

    let sessionHistory: { role: string; content: string }[] = [];
    let effectiveAge: number | null = body.age || null;

    if (body.sessionId) {
      const session = sessions.get(body.sessionId);
      if (session) {
        session.lastActive = Date.now();
        sessionHistory = session.messages;
        if (!effectiveAge && session.age) effectiveAge = session.age;
      }
    }

    const systemMsg = buildSystemMessage(effectiveAge);
    const fullMessages = sessionHistory.length > 0
      ? [systemMsg, ...sessionHistory, userMsg]
      : [systemMsg, userMsg];

    const result = await chatWithAI(fullMessages, env);

    if (body.sessionId) {
      const session = sessions.get(body.sessionId) || { messages: [], lastActive: Date.now(), age: body.age };
      session.messages.push(userMsg);
      session.messages.push({ role: 'assistant', content: result.content });
      session.lastActive = Date.now();
      if (body.age) session.age = body.age;
      if (body.currentLesson) session.currentLesson = body.currentLesson;
      sessions.set(body.sessionId, session);
    }

    return jsonResponse({
      response: result.content,
      model: result.model,
      cached: result.cached,
      responseTimeMs: result.responseTimeMs
    }, 200, env);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500, env);
  }
}

async function handleExplainBlock(request: Request, env: Env) {
  try {
    const body = await request.json() as {
      blockType?: string;
      blockFields?: Record<string, unknown>;
      blockId?: string;
      sessionId?: string;
      age?: number;
      currentLesson?: string;
    };

    if (!body.blockType) {
      return jsonResponse({ error: 'blockType is required' }, 400, env);
    }

    const userMsg: { role: string; content: string } = {
      role: 'user',
      content: `Hãy giải thích khối Blockly "${body.blockType}" cho mình hiểu nhé! Khối này có các thông số: ${JSON.stringify(body.blockFields || {}, null, 2)}`
    };

    let sessionHistory: { role: string; content: string }[] = [];
    let effectiveAge: number | null = body.age || null;

    if (body.sessionId) {
      const session = sessions.get(body.sessionId);
      if (session) {
        session.lastActive = Date.now();
        sessionHistory = session.messages;
        if (!effectiveAge && session.age) effectiveAge = session.age;
      }
    }

    const systemMsg = buildSystemMessage(effectiveAge);
    const fullMessages = sessionHistory.length > 0
      ? [systemMsg, ...sessionHistory, userMsg]
      : [systemMsg, userMsg];

    const result = await chatWithAI(fullMessages, env);

    if (body.sessionId) {
      const session = sessions.get(body.sessionId) || { messages: [], lastActive: Date.now(), age: body.age };
      session.messages.push(userMsg);
      session.messages.push({ role: 'assistant', content: result.content });
      session.lastActive = Date.now();
      if (body.age) session.age = body.age;
      sessions.set(body.sessionId, session);
    }

    return jsonResponse({
      response: result.content,
      model: result.model,
      blockType: body.blockType,
      blockDescription: { type: body.blockType, fields: body.blockFields || {}, id: body.blockId }
    }, 200, env);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500, env);
  }
}

async function handleHint(request: Request, env: Env) {
  try {
    const body = await request.json() as {
      blocklyXml?: string;
      errorPattern?: string;
      currentLesson?: string;
      sessionId?: string;
    };

    if (!body.blocklyXml && !body.errorPattern) {
      return jsonResponse({ error: 'blocklyXml or errorPattern is required' }, 400, env);
    }

    let effectiveAge: number | null = null;
    if (body.sessionId) {
      const session = sessions.get(body.sessionId);
      if (session?.age) effectiveAge = session.age;
    }

    let hintRequest = 'Hãy gợi ý một hint ngắn gọn, dễ hiểu để giúp học sinh vượt qua khó khăn này.';
    if (body.blocklyXml) hintRequest += `\n\nCode Blockly hiện tại:\n${body.blocklyXml}`;
    if (body.errorPattern) hintRequest += `\n\nLỗi gặp phải: ${body.errorPattern}`;
    hintRequest += '\n\nHãy đưa ra 1 gợi ý ngắn (1-2 câu) bằng tiếng Việt thân thiện, phù hợp với lứa tuổi.';

    const systemMsg = buildSystemMessage(effectiveAge);
    const result = await chatWithAI([systemMsg, { role: 'user', content: hintRequest }], env);

    return jsonResponse({ hint: result.content, model: result.model }, 200, env);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500, env);
  }
}

async function handlePrewarm(request: Request, env: Env) {
  try {
    const body = await request.json() as { age?: number; currentLesson?: string };

    const prewarmPrompt = body.age
      ? 'Xin chào! Mình là RoboBuddy, AI tutor của Học viện Vũ trụ RoboKids. Hãy trả lời ngắn gọn: "Mình sẵn sàng giúp bạn học lập trình robot rồi! Bạn cần hỗ trợ gì?"'
      : 'Xin chào! Mình là RoboBuddy, AI tutor thân thiện. Hãy trả lời ngắn gọn: "Mình sẵn sàng giúp bạn rồi!"';

    const messages = [buildSystemMessage(body.age), { role: 'user', content: prewarmPrompt }];

    // Fire and forget
    chatWithAI(messages, env).catch(() => {});

    return jsonResponse({ prewarmed: true, message: 'AI context pre-warming started' }, 200, env);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500, env);
  }
}

async function handleSpaceReview(request: Request, env: Env) {
  try {
    const body = await request.json() as {
      lessonId?: string;
      studentCode?: string;
      challengeResult?: boolean;
      age?: number;
    };

    if (!body.lessonId) {
      return jsonResponse({ error: 'lessonId is required' }, 400, env);
    }

    const effectiveAge = body.age || 10;
    const spaceSystemPrompt = `Bạn là RoboBuddy - trợ lý AI thân thiện của Học viện Vũ trụ RoboKids Vietnam.
Nhiệm vụ: Đánh giá kết quả thực hành của học sinh và đưa ra nhận xét khuyến khích, dễ hiểu.
Phong cách: Vui vẻ, nhiệt tình, sử dụng thuật ngữ vũ trụ (phi hành gia, tàu vũ trụ, hành tinh, v.v.)
Ngôn ngữ: Tiếng Việt, phù hợp với trẻ em ${effectiveAge} tuổi
Giới hạn: Trả lời tối đa 3-4 câu ngắn gọn, dễ hiểu`;

    let evaluationPrompt = `Học sinh vừa hoàn thành bài thực hành vũ trụ!\n`;
    if (body.studentCode) evaluationPrompt += `Code của học sinh:\n${body.studentCode}\n`;
    evaluationPrompt += `Kết quả thử thách: ${body.challengeResult ? 'Thành công!' : 'Chưa hoàn thành'}\n\n`;
    evaluationPrompt += `Hãy:\n1. Nhận xét ngắn về nỗ lực của học sinh (dù đúng hay sai)\n2. Nếu sai: gợi ý 1 điều cần cải thiện\n3. Kết thúc bằng lời động viên vũ trụ\n\nTrả lời bằng tiếng Việt, thân thiện, ngắn gọn.`;

    const result = await chatWithAI([
      { role: 'system', content: spaceSystemPrompt },
      { role: 'user', content: evaluationPrompt }
    ], env);

    let xpEarned = 30;
    if (body.challengeResult) xpEarned += 20;
    if (body.studentCode && body.studentCode.trim().length > 50) xpEarned += 10;

    return jsonResponse({
      passed: body.challengeResult === true,
      feedback: result.content,
      xpEarned,
      badgesToCheck: ['lesson_activity'],
      model: result.model
    }, 200, env);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500, env);
  }
}

async function handleGetSession(sessionId: string, env: Env) {
  const session = sessions.get(sessionId);
  if (!session) {
    return jsonResponse({ error: 'Session not found', sessionId }, 404, env);
  }
  session.lastActive = Date.now();
  return jsonResponse({
    sessionId,
    messages: session.messages,
    messageCount: session.messages.length
  }, 200, env);
}

async function handleDeleteSession(sessionId: string, env: Env) {
  const deleted = sessions.delete(sessionId);
  return jsonResponse({ sessionId, deleted }, 200, env);
}

function jsonResponse(data: unknown, status = 200, env?: Env): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(env ? getCorsHeaders(env) : {})
  };
  return new Response(JSON.stringify(data), { status, headers });
}

// ============================================
// SESSION CLEANUP
// ============================================

function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
    }
  }
}

// ============================================
// MAIN WORKER
// ============================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(env) });
    }

    // Periodic session cleanup
    cleanupSessions();

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route AI endpoints
    if (pathname === '/api/ai/health' && request.method === 'GET') {
      return handleHealthCheck(env);
    }

    if (pathname === '/api/ai/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }

    if (pathname === '/api/ai/analyze' && request.method === 'POST') {
      return handleAnalyze(request, env);
    }

    if (pathname === '/api/ai/explain-block' && request.method === 'POST') {
      return handleExplainBlock(request, env);
    }

    if (pathname === '/api/ai/hint' && request.method === 'POST') {
      return handleHint(request, env);
    }

    if (pathname === '/api/ai/prewarm' && request.method === 'POST') {
      return handlePrewarm(request, env);
    }

    if (pathname === '/api/ai/space-review' && request.method === 'POST') {
      return handleSpaceReview(request, env);
    }

    // Session routes
    const sessionMatch = pathname.match(/^\/api\/ai\/session\/([^/]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      if (request.method === 'GET') return handleGetSession(sessionId, env);
      if (request.method === 'DELETE') return handleDeleteSession(sessionId, env);
    }

    // Cache routes
    if (pathname === '/api/ai/cache/stats' && request.method === 'GET') {
      const cache = new SemanticCache();
      return jsonResponse({ semanticCache: cache.stats, timestamp: new Date().toISOString() }, 200, env);
    }

    if (pathname === '/api/ai/cache/clear' && request.method === 'POST') {
      const cache = new SemanticCache();
      cache.clear();
      return jsonResponse({ cleared: true, message: 'Semantic cache cleared' }, 200, env);
    }

    // 404
    return jsonResponse({
      error: 'Not Found',
      message: `Route ${request.method} ${pathname} not found`,
      availableRoutes: [
        'GET /api/ai/health',
        'POST /api/ai/chat',
        'POST /api/ai/analyze',
        'POST /api/ai/explain-block',
        'POST /api/ai/hint',
        'POST /api/ai/prewarm',
        'POST /api/ai/space-review',
        'GET /api/ai/session/:sessionId',
        'DELETE /api/ai/session/:sessionId',
        'GET /api/ai/cache/stats',
        'POST /api/ai/cache/clear',
      ],
    }, 404, env);
  },
};
