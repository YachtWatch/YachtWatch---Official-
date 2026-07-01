import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import App from './App.tsx'
import './index.css'

if (import.meta.env.PROD) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: import.meta.env.VITE_POSTHOG_HOST,
        capture_pageview: false, // we fire these manually via router
        capture_pageleave: true,
        person_profiles: 'identified_only',
    })
}

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    enabled: import.meta.env.PROD,
    integrations: [
        Sentry.browserTracingIntegration(),
        // Session replay is captured on error only (see rates below). Mask all
        // text/inputs and block media so no crew PII (names, passport numbers,
        // schedules) is recorded. These are Sentry's defaults; set explicitly so
        // it's clear and auditable for the App Store privacy review.
        Sentry.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
        }),
    ],
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Record sessions only when an error occurs (not all sessions)
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
