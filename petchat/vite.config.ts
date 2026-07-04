import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    // The AI brain lives in Vercel serverless functions (/api/chat, /api/ask,
    // /api/transcribe). Vite dev has no serverless runtime, so without this proxy
    // every /api call 404s → the chatbot silently falls back to the rigid,
    // English-only keyword parser (which is exactly why it looked "not flexible"
    // and Hinglish "stopped working" when tested on localhost). Proxying /api to
    // the live deployment lets the preview exercise the REAL LLM brain.
    proxy: {
      '/api': {
        target: 'https://gms-seven-black.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
