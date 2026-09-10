import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  APP_NAME: process.env.APP_NAME || 'AcadMate',
  PORT: parseInt(process.env.PORT || '8000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_change_me',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  FRONTEND_URLS: (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,

  // Supabase Storage (Week 5 — AI Notebook)
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'notebook-sources',
  
  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASSWORD,
    FROM: process.env.SMTP_FROM,
  }
};

export function validateEnv(): void {
  if (ENV.NODE_ENV === 'production') {
    const missing: string[] = [];

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret_change_me') {
      missing.push('JWT_SECRET (must not be empty or the default fallback string)');
    }
    if (!process.env.DATABASE_URL) {
      missing.push('DATABASE_URL');
    }
    if (!process.env.GEMINI_API_KEY) {
      missing.push('GEMINI_API_KEY');
    }

    if (missing.length > 0) {
      throw new Error(
        `❌ CRITICAL CONFIG ERROR: The following required environment variables are missing or insecure for production:\n  - ${missing.join('\n  - ')}`
      );
    }
  }
}
