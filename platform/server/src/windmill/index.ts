/**
 * Windmill Script Library - RoboKids Vietnam
 *
 * This module exports metadata about all available Windmill scripts.
 * Use this to configure Windmill triggers and verify script availability.
 *
 * Scripts:
 * 1. send_class_reminders - Daily at 6PM, hourly for 1-hour reminders
 * 2. send_weekly_progress - Sundays at 9 AM
 * 3. check_achievements - Every 15 minutes
 * 4. sync_daily - Daily at 2 AM
 * 5. generate_partnership_reports - Monthly on 1st at 6 AM
 */

export const windmillScripts = [
  {
    name: 'send_class_reminders',
    filename: 'send_class_reminders.ts',
    description: 'Sends reminders to parents about upcoming classes',
    schedule: '0 18 * * * (6PM daily), 0 * * * * (hourly)',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    triggers: ['cron'],
  },
  {
    name: 'send_weekly_progress',
    filename: 'send_weekly_progress.ts',
    description: 'Sends weekly progress reports to parents',
    schedule: '0 9 * * 0 (Sundays at 9 AM)',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    triggers: ['cron'],
  },
  {
    name: 'check_achievements',
    filename: 'check_achievements.ts',
    description: 'Checks for new achievements and sends notifications',
    schedule: '*/15 * * * * (every 15 minutes)',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    triggers: ['cron'],
  },
  {
    name: 'sync_daily',
    filename: 'sync_daily.ts',
    description: 'Daily data sync between PocketBase and Supabase',
    schedule: '0 2 * * * (2 AM daily)',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'POCKETBASE_URL'],
    triggers: ['cron'],
  },
  {
    name: 'generate_partnership_reports',
    filename: 'generate_partnership_reports.ts',
    description: 'Generates monthly partnership reports for schools',
    schedule: '0 6 1 * * (1st of month at 6 AM)',
    envVars: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    triggers: ['cron'],
  },
];

export default windmillScripts;