import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './lib/supabase.js';
import aiRoutes from './routes/ai.js';
import authRoutes from './routes/auth.js';
import enrollmentsRoutes from './routes/enrollments.js';
import enrollmentFormRoutes from './routes/enrollmentForm.js';
import enrollmentPipelineRoutes from './routes/enrollmentPipeline.js';
import paymentRoutes from './routes/payments.js';
import robotRoutes from './routes/robot.js';
import studentRoutes from './routes/students.js';
import curriculumRoutes from './routes/curriculum.js';
import missionsRoutes from './routes/missions.js';
import progressRoutes from './routes/progress.js';
import certificatesRoutes from './routes/certificates.js';
import lessonsRoutes from './routes/lessons.js';
import parentsRoutes from './routes/parents.js';
import parentStudentProgressRoutes from './routes/parentStudentProgress.js';
import parentInsightsRoutes from './routes/parentInsights.js';
import parentEngagementRoutes from './routes/parentEngagement.js';
import mobileRoutes from './routes/mobile.js';
import adminRoutes from './routes/admin.js';
import feedbackRoutes from './routes/feedback.js';
import challengesRoutes from './routes/challenges.js';
import parentMobileRoutes from './routes/parentMobile.js';
import parentNotificationRoutes from './routes/parentNotifications.js';
import streaksRoutes from './routes/streaks.js';
import gamificationRoutes from './routes/gamification.js';
import schoolsRoutes from './routes/schools.js';
import schoolPartnershipRoutes from './routes/schoolPartnership.js';
import schoolStudentsRoutes from './routes/schoolStudents.js';
import billingRoutes from './routes/billing.js';
import liveClassesRoutes from './routes/live-classes.js';
import teachersRoutes from './routes/teachers.js';
import mentorsRoutes from './routes/mentors.js';
import staffRoutes from './routes/staff.js';
import gameRoutes from './routes/game.js';
import ghostLeaderboardRoutes from './routes/ghostLeaderboard.js';
import experimentsRoutes from './routes/experiments.js';
import publicApiRoutes from './routes/publicApi.js';
import webhookRoutes from './routes/webhooks.js';
import apiAdminRoutes from './routes/apiAdmin.js';
import birthdayPartiesRoutes from './routes/birthdayParties.js';
import analyticsRoutes from './routes/analytics.js';
import learningPathRoutes from './routes/learning-path.js';
import composioRoutes from './routes/composio.js';
import workflowRoutes from './routes/workflows.js';
import { startBroker } from './services/mqtt.js';
import gameServer from './colyseus/gameServer.js';

const app = express();
const PORT = process.env.PORT || 3100;

// Trust proxy for correct IP detection behind reverse proxies/load balancers
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS configuration (allow local ports for dev, specific domains for production)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://localhost:8001',
  'http://localhost:8002',
  'exp://localhost:8081',
  'https://app.robokids.vn',
  'https://robokids.vn',
  'https://robokids.pages.dev',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

app.use(express.json());

// API Rate Limiting to prevent spam/DDOS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Apply rate limiting to all /api routes
app.use('/api/', limiter);

// ========== PERFORMANCE OPTIMIZATIONS ==========

// In-memory response cache for database queries (Target: <200ms response)
const queryCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds TTL

function getCached(key) {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    queryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  queryCache.set(key, { data, expires: Date.now() + ttl });
}

// Auto-cleanup expired cache entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now > entry.expires) queryCache.delete(key);
  }
}, 60 * 1000);

// Create admin client for server-side operations (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

// Export cache utilities for use in routes
export { queryCache, getCached, setCache, supabaseAdmin };

// ========== END PERFORMANCE OPTIMIZATIONS ==========

// Stricter rate limit for auth endpoints (login, register, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window for auth routes (stricter)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' }
});

// AI routes
app.use('/api/ai', aiRoutes);

// Voxel AI routes
import voxelAiRoutes from './routes/voxelAi.js';
app.use('/api/ai', voxelAiRoutes);

// Auth routes (with stricter rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// Enrollments routes
app.use('/api/enrollments', enrollmentsRoutes);

// Public enrollment form (no auth required)
app.use('/enroll', enrollmentFormRoutes);
app.use('/api/public/enrollments', enrollmentFormRoutes);

// Enrollment Pipeline routes (for Pipedream automation)
app.use('/api/pipeline', enrollmentPipelineRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Robot routes
app.use('/api/robots', robotRoutes);

// Student account routes
app.use('/api/students', studentRoutes);

// Curriculum routes
app.use('/api/curriculum', curriculumRoutes);

// Missions routes
app.use('/api/missions', missionsRoutes);

// Progress routes
app.use('/api/progress', progressRoutes);

// Certificate routes
app.use('/api/certificates', certificatesRoutes);

// Lessons routes
app.use('/api/lessons', lessonsRoutes);

// Parent routes
app.use('/api/parents', parentsRoutes);

// Parent-facing student progress routes
app.use('/api/students', parentStudentProgressRoutes);

// Parent AI insights routes
app.use('/api/insights', parentInsightsRoutes);

// Parent Engagement Automation routes (for Pipedream/cron)
app.use('/api/engagement', parentEngagementRoutes);

// Mobile app routes
app.use('/api/mobile', mobileRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Feedback routes (beta feedback collection)
app.use('/api/feedback', feedbackRoutes);

// Challenges routes (coding challenge arena)
app.use('/api/challenges', challengesRoutes);

// Parent Mobile routes
app.use('/api/parent', parentMobileRoutes);

// Parent Notification routes
app.use('/api/parent-notifications', parentNotificationRoutes);

// Streaks routes
app.use('/api/streaks', streaksRoutes);

// Gamification routes (XP, badges, leaderboards)
app.use('/api/gamification', gamificationRoutes);

// XP routes (alternative paths for compatibility)
app.use('/api/xp', gamificationRoutes);

// Leaderboard route
app.use('/api/leaderboard', gamificationRoutes);

// School Partnership Portal routes
app.use('/api/schools', schoolsRoutes);

// School Partnership Workflow routes (B2B automation)
app.use('/api/school-partnership', schoolPartnershipRoutes);

// Billing routes (subscription plans, invoices, dashboard)
app.use('/api/billing', billingRoutes);

// Live class routes (Jitsi integration)
app.use('/api/live-classes', liveClassesRoutes);

// Teacher Portal routes
app.use('/api/teachers', teachersRoutes);

// Mentor routes (competition team mentors)
app.use('/api/mentors', mentorsRoutes);

// Staff Portal routes
app.use('/api/staff', staffRoutes);

// Game server matchmaking routes (Colyseus/Socket.IO)
app.use('/api/game', gameRoutes);

// Ghost Racing Leaderboard routes
app.use('/api/ghost-leaderboard', ghostLeaderboardRoutes);

// A/B Testing Experiment routes
app.use('/api/experiments', experimentsRoutes);

// Public API for third-party integrations
app.use('/api/public', publicApiRoutes);

// Webhook management for API clients
app.use('/api/webhooks', webhookRoutes);

// Admin routes for API management
app.use('/api/admin', apiAdminRoutes);

// Birthday Party Bookings routes
app.use('/api/birthday-parties', birthdayPartiesRoutes);

// Learning Analytics Heatmaps routes
app.use('/api/analytics', analyticsRoutes);

// AI-powered Learning Path routes
app.use('/api/learning-path', learningPathRoutes);

// Composio Integration routes (AI workflow automation)
app.use('/api/composio', composioRoutes);

// Workflow Engine routes (AI workflow triggers)
app.use('/api/workflows', workflowRoutes);

// Advanced Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check DB connection
    const start = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    const dbLatency = Date.now() - start;

    if (error) throw error;

    res.json({ 
      status: 'ok', 
      service: 'robokids-server',
      environment: process.env.NODE_ENV || 'development',
      db_status: 'connected',
      db_latency: `${dbLatency}ms`
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(503).json({ 
      status: 'error', 
      service: 'robokids-server',
      db_status: 'disconnected',
      error: err.message 
    });
  }
});

// Start MQTT broker, game server, and then HTTP server
async function start() {
  try {
    await startBroker();
    console.log('MQTT broker started');

    app.listen(PORT, () => {
      console.log(`RoboKids server running on port ${PORT}`);
      console.log(`Game server (Colyseus) available at ws://localhost:${process.env.GAME_PORT || 3101}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    // Start without MQTT broker if it fails
    app.listen(PORT, () => {
      console.log(`RoboKids server running on port ${PORT} (MQTT broker disabled)`);
    });
  }
}

start();
