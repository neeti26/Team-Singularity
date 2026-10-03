/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // Required for minimal Docker image on Cloud Run
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'firebase-admin'],
  },
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  },
  // Needed for Cloud Run: bind to 0.0.0.0
  serverRuntimeConfig: {
    host: '0.0.0.0',
  },
};

module.exports = nextConfig;
