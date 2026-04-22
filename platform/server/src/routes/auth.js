import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { createStudent } from '../services/student.js';
import { authenticate } from '../middleware/auth.js';
import { csrfProtection } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for verification endpoints - max 3 requests per IP per 10 minutes
const verificationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Verification endpoint hit from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many verification requests. Please try again after 10 minutes.',
      retryAfter: 600
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Password strength validation
 * Rules: min 8 chars, 1 uppercase, 1 number, 1 special char
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least 1 special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get stored verification data from database
 */
async function getVerificationData(email) {
  const { data, error } = await supabaseAdmin
    .from('verification_codes')
    .select('*')
    .eq('email', email.toLowerCase())
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching verification code:', error);
    return null;
  }
  return data || null;
}

/**
 * Store verification code in database
 */
async function storeVerificationCode(email, code) {
  // Clean up any existing codes for this email first
  await supabaseAdmin
    .from('verification_codes')
    .delete()
    .eq('email', email.toLowerCase());

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('verification_codes')
    .insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt,
      attempts: 0
    });

  if (error) {
    console.error('Error storing verification code:', error);
    return false;
  }
  return true;
}

/**
 * Increment verification attempts
 */
async function incrementVerificationAttempts(email) {
  const data = await getVerificationData(email);
  if (!data) return;

  await supabaseAdmin
    .from('verification_codes')
    .update({ attempts: data.attempts + 1 })
    .eq('id', data.id);
}

/**
 * Delete verification code
 */
async function deleteVerificationCode(email) {
  await supabaseAdmin
    .from('verification_codes')
    .delete()
    .eq('email', email.toLowerCase());
}

/**
 * Cleanup expired verification codes
 */
async function cleanupExpiredCodes() {
  await supabaseAdmin
    .from('verification_codes')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredCodes, 10 * 60 * 1000);

/**
 * Send verification email with code
 */
async function sendVerificationEmail({ to, code }) {
  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log(`[EMAIL DISABLED] Would send verification code ${code} to ${to}`);
    return { success: true, mock: true };
  }

  const subject = 'Xác minh email của bạn - RoboKids Vietnam';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #A65CA6;">🔐 Xác minh email của bạn</h2>
      <p>Mã xác minh của bạn là:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
      </div>
      <p>Mã này có hiệu lực trong 10 phút.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        RoboKids Vietnam<br>
        Email: support@robokids.vn
      </p>
    </div>
  `;

  console.log(`[EMAIL] Sending verification code to ${to}`);
  // In production, integrate with email provider (SendGrid, AWS SES, etc.)
  return { success: true };
}

/**
 * POST /api/auth/register
 * Register a new user account (creates parent or student account)
 */
router.post('/register', csrfProtection, async (req, res) => {
  try {
    const { email, password, full_name, role = 'parent', date_of_birth, parent_id, child_name, child_age } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required' });
    }

    // Password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    if (!['parent', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Role must be parent or student' });
    }

    // COPPA: Students under 13 require parental consent or parent_id linkage
    if (role === 'student' && date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

      if (adjustedAge < 13 && !parent_id) {
        return res.status(400).json({
          error: 'Students under 13 require parental consent. Please ask a parent to register or provide a parent_id.',
          requires_parental_consent: true,
          age: adjustedAge
        });
      }
    }

    // Create user in Supabase Auth (use admin to bypass email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    });

    if (authError) {
      // SECURITY: Return identical generic error to prevent email enumeration
      // Log detailed error server-side for debugging
      console.error('Registration error:', authError.message, 'Code:', authError.code);
      return res.status(400).json({ error: 'Registration failed. Please try again.' });
    }

    // Generate and send email verification code
    const verificationCode = generateVerificationCode();
    await storeVerificationCode(email, verificationCode);
    await sendVerificationEmail({ to: email, code: verificationCode });

    // If parent, create profile and parent record
    if (role === 'parent') {
      const profileId = authData.user.id;

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          email: email,
          full_name: full_name,
          role: 'parent',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Create parent record
      const { error: parentError } = await supabase
        .from('parents')
        .insert({
          profile_id: profileId,
          email: email
        });

      if (parentError) {
        console.error('Parent record creation error:', parentError);
      }

      // Auto-create student record for the child (Option A: 1 parent = 1 primary student)
      if (child_name && child_age) {
        try {
          // Create student auth user
          const studentResult = await createStudent({
            name: child_name,
            age: child_age,
            parentEmail: email,
          });

          const studentProfileId = studentResult.user.id;

          // Create profile for student
          await supabaseAdmin
            .from('profiles')
            .insert({
              id: studentProfileId,
              email: studentResult.loginEmail,
              full_name: child_name,
              role: 'student',
            });

          // Estimate date_of_birth from child_age (assume birthday occurred earlier this year)
          const estimatedDob = new Date();
          estimatedDob.setFullYear(estimatedDob.getFullYear() - parseInt(child_age, 10));

          // Create student record in students table
          await supabaseAdmin
            .from('students')
            .insert({
              id: studentProfileId,
              profile_id: studentProfileId,
              parent_id: profileId,
              date_of_birth: estimatedDob.toISOString().split('T')[0],
            });

          console.log(`[REGISTER] Auto-created student ${child_name} for parent ${email}`);
        } catch (studentErr) {
          console.error('Student auto-creation error:', studentErr);
          // Don't fail parent registration if student creation fails
        }
      }
    }

    // If student, create profile and student record
    if (role === 'student') {
      const profileId = authData.user.id;

      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          email: email,
          full_name: full_name,
          role: 'student',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          profile_id: profileId,
          date_of_birth: date_of_birth || null,
          grade_level: req.body.grade_level || null,
          parent_id: parent_id || null
        });

      if (studentError) {
        console.error('Student record creation error:', studentError);
      }
    }

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role
      },
      // Don't return session until email is verified
      email_verification_required: true
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', csrfProtection, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Return generic error to prevent email enumeration attacks
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Set httpOnly cookie with access token (secure in production)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('robokids_token', data.session.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: data.session.expires_in * 1000,
      path: '/'
    });

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'student',
        full_name: data.user.user_metadata?.full_name || profile?.full_name,
        ...profile
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', csrfProtection, authenticate, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Clear the httpOnly cookie
    res.clearCookie('robokids_token', {
      httpOnly: true,
      path: '/'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', csrfProtection, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

/**
 * POST /api/auth/password-reset
 * Request password reset email
 */
router.post('/password-reset', csrfProtection, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

/**
 * POST /api/auth/password-update
 * Update password (for logged-in users or via reset token)
 */
router.post('/password-update', csrfProtection, authenticate, async (req, res) => {
  try {
    const { new_password, current_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Password strength validation
    const passwordValidation = validatePasswordStrength(new_password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // If changing password (not reset), verify current password
    if (current_password) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: current_password
      });

      if (verifyError) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const { error } = await supabase.auth.updateUser({
      password: new_password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * GET /api/auth/session
 * Get current session/user info
 */
router.get('/session', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.user_metadata?.role || 'student',
        full_name: req.user.user_metadata?.full_name || profile?.full_name,
        ...profile
      }
    });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.user_metadata?.role || 'student',
        full_name: req.user.user_metadata?.full_name || profile?.full_name,
        ...profile
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

/**
 * PATCH /api/auth/profile
 * Update current user's profile
 */
router.patch('/profile', csrfProtection, authenticate, async (req, res) => {
  try {
    const { full_name, avatar_url, date_of_birth, grade_level } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth;
    if (grade_level !== undefined) updates.grade_level = grade_level;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        ...profile
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/auth/send-verification-email
 * Send email verification code to authenticated user
 */
router.post('/send-verification-email', verificationRateLimiter, csrfProtection, authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    await storeVerificationCode(userEmail, verificationCode);
    await sendVerificationEmail({ to: userEmail, code: verificationCode });

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error('Send verification email error:', err);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with the 6-digit code
 */
router.post('/verify-email', verificationRateLimiter, csrfProtection, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const emailLower = email.toLowerCase();
    const verificationData = await getVerificationData(emailLower);

    if (!verificationData) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Check attempts (max 5)
    if (verificationData.attempts >= 5) {
      await deleteVerificationCode(emailLower);
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Increment attempts
    await incrementVerificationAttempts(emailLower);

    // Check if code matches
    if (verificationData.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Success - delete the code
    await deleteVerificationCode(emailLower);

    // Update user's email verification status in Supabase
    // Note: This updates the user's metadata to mark email as verified
    const { error: updateError } = await supabaseAdmin
      .auth.admin.updateUserById(req.user?.id || req.body.user_id, {
        user_metadata: { email_verified: true }
      });

    if (updateError) {
      console.error('Failed to update email verification status:', updateError);
    }

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

/**
 * POST /api/auth/verify-age
 * Verify student age for COPPA compliance
 */
router.post('/verify-age', async (req, res) => {
  try {
    const { date_of_birth } = req.body;

    if (!date_of_birth) {
      return res.status(400).json({ error: 'Date of birth is required' });
    }

    const birthDate = new Date(date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // COPPA: Under 13 requires parental consent
    const requires_parental_consent = age < 13;

    res.json({
      age,
      requires_parental_consent,
      message: requires_parental_consent
        ? 'User is under 13 and requires parental consent'
        : 'User is eligible for direct registration'
    });
  } catch (err) {
    console.error('Age verification error:', err);
    res.status(500).json({ error: 'Failed to verify age' });
  }
});

/**
 * POST /api/auth/link-student
 * Link a student account to a parent account
 */
router.post('/link-student', csrfProtection, authenticate, async (req, res) => {
  try {
    const { student_id, student_email } = req.body;
    const parent_id = req.user.id;

    // Get parent profile
    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', parent_id)
      .single();

    if (!parentProfile || parentProfile.role !== 'parent') {
      return res.status(403).json({ error: 'Only parents can link student accounts' });
    }

    // Find student by id or email
    let studentProfile;
    if (student_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', student_id)
        .single();
      studentProfile = data;
    } else if (student_email) {
      const { data } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', student_email)
        .single();
      studentProfile = data;
    }

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (studentProfile.role !== 'student') {
      return res.status(400).json({ error: 'Specified user is not a student' });
    }

    // Link student to parent - update both students.parent_id AND student_parent_relations
    // for consistency with enrollment flow
    const { error: studentError } = await supabase
      .from('students')
      .update({ parent_id: parent_id })
      .eq('profile_id', studentProfile.id);

    if (studentError) {
      return res.status(400).json({ error: studentError.message });
    }

    // Also create student_parent_relations record for consistency
    const { error: relationError } = await supabase
      .from('student_parent_relations')
      .insert({
        student_id: studentProfile.id,
        parent_id: parent_id,
        relationship: 'parent'
      });

    if (relationError) {
      console.error('student_parent_relations creation error:', relationError);
      // Don't fail the request - the main linking succeeded
    }

    res.json({ message: 'Student linked to parent successfully' });
  } catch (err) {
    console.error('Link student error:', err);
    res.status(500).json({ error: 'Failed to link student' });
  }
});

export default router;