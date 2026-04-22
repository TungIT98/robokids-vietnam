import posthog from 'posthog-js';

// PostHog configuration
// Using localhost project for development - replace with real project keys in production
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || 'phc_local';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

export function initPostHog() {
  if (import.meta.env.DEV) {
    // Disable PostHog in development to avoid polluting analytics
    // @ts-expect-error - disable is available at runtime but not in types
    posthog.disable();
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only', // Only identify users who log in
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true, // Mask sensitive inputs like passwords
    },
  });
}

export { posthog };
