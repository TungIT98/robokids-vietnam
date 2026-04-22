# Supabase Setup Instructions

## Prerequisites
1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon/service role keys from Settings > API

## Setup Steps

### 1. Configure Environment Variables
The `.env` file should already be configured with the project credentials.
Update `SUPABASE_SERVICE_ROLE_KEY` with your actual service role key from Supabase dashboard.

### 2. Apply Database Migrations
Migrations are applied in order. Run them via Supabase Dashboard SQL Editor or Supabase CLI:

**Order of migrations:**
1. `001_initial_schema.sql` - Core tables (profiles, students, courses, lessons, enrollments, robot_sessions)
2. `002_lessons_table_structure.sql` - Enhanced lessons with age groups, steps, and Blockly config
3. `003_user_progress_table.sql` - User XP, levels, streaks
4. `004_missions_table.sql` - Missions and challenges system
5. `005_badges_tables.sql` - Badge achievements system

**Using Supabase CLI:**
```bash
cd server
supabase login
supabase link --project-ref nmjgwvgzekkiyymufpag
supabase db push
```

**Using Dashboard SQL Editor:**
1. Go to your Supabase project > SQL Editor
2. Run each migration file in order (001 through 005)

### 3. Enable Email Auth (Optional)
In Supabase Dashboard:
1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates for welcome/password reset

### 4. Test the Connection
```bash
cd server
npm run dev
curl http://localhost:3100/api/health
```

## Tables Created

### Core Tables (001_initial_schema.sql)
- `profiles` - User profiles (extends auth.users)
- `students` - Student accounts (children linked to parent accounts)
- `courses` - Available courses
- `lessons` - Course lessons
- `enrollments` - Student course enrollments
- `lesson_progress` - Per-lesson progress tracking
- `robot_sessions` - Robot control sessions

### Enhanced Lessons (002_lessons_table_structure.sql)
- `lessons` - Enhanced lessons with slug, age_group, bilingual content
- `lesson_steps` - Individual steps within a lesson
- `lesson_objectives` - Learning objectives for each lesson
- `age_group_configs` - Block configuration per age group (beginner/intermediate/advanced)
- `lesson_progress` - Updated with step-level progress

### User Progress (003_user_progress_table.sql)
- `user_progress` - XP, levels, streaks, badges

### Missions (004_missions_table.sql)
- `mission_templates` - Mission definitions (daily, weekly, challenge)
- `user_missions` - User mission progress

### Badges (005_badges_tables.sql)
- `badges` - Badge definitions with criteria
- `earned_badges` - User badge achievements

## Row Level Security (RLS)
All tables have RLS enabled with policies:
- Users can only read/update their own data
- Parents can access their children's data
- Courses and lessons are publicly readable
- Teachers/admins can view all student progress

## Age Groups
- **beginner**: Ages 6-8, basic blocks (movement, LED, wait)
- **intermediate**: Ages 9-11, adds sensors, music, loops
- **advanced**: Ages 12-14, adds variables, conditionals, math

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile
- `GET /api/curriculum/:ageGroup` - Get curriculum by age group
- `GET /api/curriculum/lessons/:id` - Get specific lesson
- `GET /api/missions` - List mission templates
- `GET /api/missions/daily` - Get user's daily missions
- `POST /api/missions/:id/submit` - Submit mission
- `GET /api/progress/stats` - Get user progress stats
- `POST /api/progress/lesson/:id/complete` - Complete a lesson
- `GET /api/progress/badges` - Get badges
