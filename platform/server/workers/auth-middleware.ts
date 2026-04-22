/**
 * Cloudflare Worker: Auth Middleware
 *
 * Lightweight edge function for JWT verification before requests hit PocketBase.
 * This runs at the edge (closest to user) for minimum latency.
 *
 * Deploy: wrangler deploy workers/auth-middleware.ts
 */

interface Env {
  POCKETBASE_URL: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
}

interface RequestWithAuth extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Skip auth for public routes
    const publicPaths = ['/api/health', '/api/public', '/auth/', '/_/'];
    if (publicPaths.some(path => url.pathname.startsWith(path))) {
      // Forward to PocketBase
      const pbUrl = `${env.POCKETBASE_URL}${url.pathname}${url.search}`;
      const pbResponse = await fetch(pbUrl, {
        method: request.method,
        headers: this.getProxyHeaders(request),
        body: request.method !== 'GET' ? request.clone().body : undefined,
      });

      return this.proxyResponse(pbResponse, corsHeaders);
    }

    // Extract and verify JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT (simple HS256 verification)
      const payload = await this.verifyJWT(token, env.JWT_SECRET);

      // Add user info to request headers before forwarding
      const headers = this.getProxyHeaders(request);
      headers.set('X-User-Id', payload.id || '');
      headers.set('X-User-Email', payload.email || '');
      headers.set('X-User-Role', payload.role || 'user');

      // Forward authenticated request to PocketBase
      const pbUrl = `${env.POCKETBASE_URL}${url.pathname}${url.search}`;
      const pbResponse = await fetch(pbUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' ? request.clone().body : undefined,
      });

      return this.proxyResponse(pbResponse, corsHeaders);

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid token',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },

  getProxyHeaders(request: Request): Headers {
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Skip hop-by-hop headers
      if (!['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });
    return headers;
  },

  async proxyResponse(response: Response, corsHeaders: Record<string, string>): Promise<Response> {
    const body = await response.text();
    const headers = new Headers(corsHeaders);

    // Copy response headers (except hop-by-hop)
    response.headers.forEach((value, key) => {
      if (!['connection', 'transfer-encoding', 'keep-alive'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async verifyJWT(token: string, secret: string): Promise<Record<string, unknown>> {
    // Simple JWT verification (for production, use jose library)
    // This is a simplified version - in production use @cloudflare/jose or jose
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature (simplified - use proper crypto in production)
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    // For Cloudflare Workers, use crypto.subtle
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadJson);
  },
};
