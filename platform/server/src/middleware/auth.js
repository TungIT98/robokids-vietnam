import { supabase } from '../lib/supabase.js';

/**
 * Auth middleware - verifies JWT token from Supabase auth
 * Extracts user from Authorization header (Bearer token) or httpOnly cookie
 */
export async function authenticate(req, res, next) {
  // Try Authorization header first, then fall back to cookie
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    // Parse cookie header manually
    const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
      const [name, val] = c.trim().split('=');
      acc[name] = val;
      return acc;
    }, {});
    token = cookies.robokids_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    req.profile = user; // Alias for convenience
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional auth - attaches user if token present but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    req.user = user || null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

/**
 * Get user role from various possible sources
 */
function getUserRole(user) {
  // Check direct role first, then user_metadata
  return user.role || user.user_metadata?.role || 'student';
}

/**
 * Check if user has required role
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = getUserRole(req.user);
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * CSRF protection - verify Origin header for state-changing requests
 * Only required for cookie-based auth
 */
export function csrfProtection(req, res, next) {
  // Only check for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://app.robokids.vn', 'https://robokids.vn']
      : ['http://localhost:5173', 'http://localhost:3000'];

    // If Origin header is present, verify it
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: 'Invalid origin' });
    }
  }
  next();
}

export default { authenticate, optionalAuth, requireRole, csrfProtection };