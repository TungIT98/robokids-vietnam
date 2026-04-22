import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react';
import './index.css'
import App from './App.tsx'
import { initPostHog } from './lib/analytics';

// Initialize Sentry for error tracking
// Using sample DSN for development - replace with real Sentry DSN in production
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || 'https://example@sentry.io/0000000',
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllInputs: true,
    }),
  ],
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
  replaysSessionSampleRate: 0.05, // 5% of sessions for session replay
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
});

// Initialize PostHog for behavioral analytics
initPostHog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
