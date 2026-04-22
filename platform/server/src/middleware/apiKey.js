import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '../lib/supabase.js';

/**
 * Generate a new API key
 */
export function generateApiKey() {
  const key = randomBytes(32).toString('hex');
  const prefix = key.substring(0, 8);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify API key and get associated client
 */
export async function verifyApiKey(key) {
  if (!key || !key.startsWith('rk_')) {
    return null;
  }

  const hash = hashApiKey(key);

  const { data: apiKey } = await supabaseAdmin
    .from('api_keys')
    .select('*, api_clients(*)')
    .eq('key_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .single();

  if (!apiKey || !apiKey.api_clients || apiKey.api_clients.status !== 'active') {
    return null;
  }

  // Update last used timestamp
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  return {
    client: apiKey.api_clients,
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      tier: apiKey.api_clients.tier
    }
  };
}

/**
 * Rate limit configuration by tier
 */
const TIER_LIMITS = {
  free: { perMinute: 15, perDay: 1000, perMonth: 10000 },
  starter: { perMinute: 60, perDay: 10000, perMonth: 100000 },
  professional: { perMinute: 300, perDay: 100000, perMonth: 1000000 },
  enterprise: { perMinute: 1000, perDay: 1000000, perMonth: 10000000 }
};

/**
 * Check rate limit for API client
 */
export async function checkRateLimit(clientId, tier) {
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const now = new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Count requests in current minute
  const { count: minuteCount } = await supabaseAdmin
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', minuteStart.toISOString())
    .lt('created_at', now.toISOString());

  // Count requests today
  const { count: dayCount } = await supabaseAdmin
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', now.toISOString());

  // Count requests this month
  const { count: monthCount } = await supabaseAdmin
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', now.toISOString());

  const remaining = {
    minute: Math.max(0, limits.perMinute - (minuteCount || 0)),
    day: Math.max(0, limits.perDay - (dayCount || 0)),
    month: Math.max(0, limits.perMonth - (monthCount || 0))
  };

  const isLimited = {
    minute: (minuteCount || 0) >= limits.perMinute,
    day: (dayCount || 0) >= limits.perDay,
    month: (monthCount || 0) >= limits.perMonth
  };

  return {
    limit: limits,
    remaining,
    limited: isLimited.minute || isLimited.day || isLimited.month,
    reason: isLimited.minute ? 'minute' : isLimited.day ? 'day' : isLimited.month ? 'month' : null
  };
}

/**
 * Record API usage
 */
export async function recordUsage(clientId, endpoint, method, statusCode, responseTimeMs) {
  await supabaseAdmin
    .from('api_usage')
    .insert({
      client_id: clientId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs
    });
}

/**
 * API Key authentication middleware
 */
export function apiKeyAuth() {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Include your API key using X-Api-Key header or api_key query parameter'
      });
    }

    const authResult = await verifyApiKey(apiKey);
    if (!authResult) {
      return res.status(401).json({
        error: 'Invalid or expired API key'
      });
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(authResult.client.id, authResult.client.tier);
    if (rateLimit.limited) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: rateLimit.limit[rateLimit.reason],
        period: rateLimit.reason,
        message: `You have exceeded your ${rateLimit.reason} rate limit. Upgrade your tier for higher limits.`
      });
    }

    req.apiClient = authResult.client;
    req.apiKey = authResult.apiKey;
    req.rateLimit = rateLimit;

    // Start timing for usage tracking
    req._usageStart = Date.now();

    next();
  };
}

/**
 * Optional API key auth - doesn't require key but attaches client if present
 */
export function optionalApiKeyAuth() {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      req.apiClient = null;
      return next();
    }

    const authResult = await verifyApiKey(apiKey);
    if (authResult) {
      req.apiClient = authResult.client;
      req.apiKey = authResult.apiKey;
      req.rateLimit = await checkRateLimit(authResult.client.id, authResult.client.tier);
    }

    next();
  };
}

/**
 * Usage tracking middleware - records API calls
 */
export function trackUsage() {
  return async (req, res, next) => {
    // Skip if no API client
    if (!req.apiClient) {
      return next();
    }

    // Hook into response finish
    res.on('finish', () => {
      const responseTime = req._usageStart ? Date.now() - req._usageStart : null;
      recordUsage(
        req.apiClient.id,
        req.originalUrl,
        req.method,
        res.statusCode,
        responseTime
      ).catch(err => {
        console.error('Failed to record API usage:', err);
      });
    });

    next();
  };
}

export default {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  checkRateLimit,
  recordUsage,
  apiKeyAuth,
  optionalApiKeyAuth,
  trackUsage,
  TIER_LIMITS
};
