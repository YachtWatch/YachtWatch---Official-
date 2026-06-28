import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { config as loadDotenv } from 'dotenv'

loadDotenv()

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            // Only upload source maps when all three vars are present
            disable: !process.env.SENTRY_AUTH_TOKEN,
        }),
    ],
    envPrefix: ['VITE_', 'SUPABASE_', 'REVENUECAT_', 'APP_URL'],
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    supabase: ['@supabase/supabase-js'],
                    lucide: ['lucide-react']
                }
            }
        }
    }
})
