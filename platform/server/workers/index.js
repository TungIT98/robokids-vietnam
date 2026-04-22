/**
 * Cloudflare Worker: RoboKids API Entry Point
 *
 * Lightweight edge API for authentication when Express.js is not available.
 * This worker runs at the edge for minimum latency and proxies to PocketBase.
 *
 * Deploy: wrangler deploy workers/index.js --env production
 */

/** @type {string} */
const POCKETBASE_URL = 'https://humanitarian-accepting-consultancy-chocolate.trycloudflare.com';

/** @type {string} */
const ALLOWED_ORIGINS = 'https://robokids.pages.dev,https://robokids.vn,https://www.robokids.vn';

/** @type {string} */
const JWT_SECRET = '';

const getPocketBaseUrl = (env) => env.POCKETBASE_URL || POCKETBASE_URL;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Create JSON response
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

/**
 * Parse JSON body from request
 */
async function parseJsonBody(request) {
  const text = await request.text();
  return JSON.parse(text);
}

/**
 * Health check endpoint
 */
async function handleHealthCheck(env) {
  const pbUrl = `${getPocketBaseUrl(env)}/api/health`;
  console.log(`Health check to: ${pbUrl}`);

  try {
    const start = Date.now();
    const response = await fetch(pbUrl, { method: 'GET' });
    const latency = Date.now() - start;
    console.log(`Health check response: status=${response.status}, ok=${response.ok}`);

    const text = await response.text();
    console.log(`Health check body: ${text.substring(0, 200)}`);

    if (response.ok || text.includes('API is healthy')) {
      return jsonResponse({
        status: 'ok',
        service: 'robokids-api',
        environment: 'cloudflare-workers',
        pocketbase_status: 'connected',
        pocketbase_url: getPocketBaseUrl(env),
        latency: `${latency}ms`,
        worker: 'cloudflare-edge',
      });
    } else {
      return jsonResponse({
        status: 'degraded',
        service: 'robokids-api',
        pocketbase_status: 'error',
        pocketbase_url: getPocketBaseUrl(env),
        response_status: response.status,
        response_body: text.substring(0, 200),
        error: 'PocketBase health check failed',
      }, 503);
    }
  } catch (error) {
    console.log(`Health check error: ${error.message}`);
    return jsonResponse({
      status: 'error',
      service: 'robokids-api',
      pocketbase_status: 'unreachable',
      pocketbase_url: getPocketBaseUrl(env),
      error: error.message || 'Unknown error',
    }, 503);
  }
}

/**
 * Register new user
 * POST /api/auth/register
 */
async function handleRegister(request, env) {
  try {
    const body = await parseJsonBody(request);

    const { email, password, passwordConfirm, full_name, role } = body;

    if (!email || !password || !full_name) {
      return jsonResponse({ error: 'Email, password, and full_name are required' }, 400);
    }

    if (password !== passwordConfirm) {
      return jsonResponse({ error: 'Passwords do not match' }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Create user via PocketBase REST API
    const pbUrl = `${getPocketBaseUrl(env)}/api/collections/users/records`;

    // PocketBase uses 'name' field instead of 'full_name'
    const createUserPayload = {
      email,
      password,
      passwordConfirm,
      name: full_name,  // PocketBase uses 'name' not 'full_name'
      role: role || 'student',
      emailVisibility: true,
    };
    console.log('Creating user:', JSON.stringify(createUserPayload));

    const createUserResponse = await fetch(pbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createUserPayload),
    });

    const result = await createUserResponse.json();
    console.log('Create response:', createUserResponse.status, JSON.stringify(result).substring(0, 300));

    if (!createUserResponse.ok) {
      console.error('PocketBase create user error:', result);
      return jsonResponse({
        error: result.message || result.error || 'Registration failed',
        details: result,
      }, createUserResponse.status);
    }

    // Auto-login after registration
    const loginResponse = await fetch(`${getPocketBaseUrl(env)}/api/collections/users/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    });

    const loginResult = await loginResponse.json();
    console.log('Login response:', loginResponse.status, JSON.stringify(loginResult).substring(0, 200));

    if (loginResponse.ok) {
      return jsonResponse({
        message: 'Account created successfully',
        user: {
          id: result.id,
          email: result.email,
          full_name: result.name || full_name,
          role: result.role,
        },
        token: loginResult.token,
        ...(loginResult.record ? { record: loginResult.record } : {}),
      }, 201);
    }

    // Registration succeeded but auto-login failed
    return jsonResponse({
      message: 'Account created. Please login.',
      user: {
        id: result.id,
        email: result.email,
        full_name: result.name || full_name,
        role: result.role,
      },
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse({
      error: 'Registration failed',
      message: error.message || 'Unknown error',
    }, 500);
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function handleLogin(request, env) {
  try {
    const body = await parseJsonBody(request);

    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required' }, 400);
    }

    // Authenticate via PocketBase
    const pbUrl = `${getPocketBaseUrl(env)}/api/collections/users/auth-with-password`;

    const response = await fetch(pbUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return jsonResponse({
        error: result.message || 'Invalid credentials',
      }, 401);
    }

    return jsonResponse({
      user: {
        id: result.record.id,
        email: result.record.email,
        full_name: result.record.name || result.record.full_name,
        role: result.record.role,
        ...result.record,
      },
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({
      error: 'Login failed',
      message: error.message || 'Unknown error',
    }, 500);
  }
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Route: GET /api/health
    if (pathname === '/api/health' && request.method === 'GET') {
      return handleHealthCheck(env);
    }

    // Route: POST /api/auth/register
    if (pathname === '/api/auth/register' && request.method === 'POST') {
      return handleRegister(request, env);
    }

    // Route: POST /api/auth/login
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }

    // Default: 404 Not Found
    return jsonResponse({
      error: 'Not Found',
      message: `Route ${request.method} ${pathname} not found`,
      availableRoutes: [
        'GET /api/health',
        'POST /api/auth/register',
        'POST /api/auth/login',
      ],
    }, 404);
  },
};