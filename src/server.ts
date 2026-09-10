import app from '@/app';
import { ENV, validateEnv } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { ensureVectorIndex } from '@/services/notebook.service';
import type { Server } from 'http';

let server: Server | null = null;

const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('🔒 Closed HTTP server connections.');
      try {
        await prisma.$disconnect();
        console.log('📦 Closed Prisma database connections.');
      } catch (err) {
        console.error('⚠️ Error disconnecting Prisma:', err);
      }
      process.exit(0);
    });

    // Force exit if graceful shutdown takes longer than 10s
    setTimeout(() => {
      console.error('⏰ Shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

const startServer = async () => {
  try {
    validateEnv();

    server = app.listen(ENV.PORT as number, '0.0.0.0', () => {
      console.log('--------------------------------------------------');
      console.log(`🚀 ${ENV.APP_NAME} started successfully!`);
      console.log(`📡 URL: ${ENV.BACKEND_URL}`);
      console.log(`🌍 MODE: ${ENV.NODE_ENV}`);
      console.log('--------------------------------------------------');
    });

    // Verify HNSW index for vector embeddings in background
    ensureVectorIndex().catch((e) => console.warn('Vector index check warning:', e));
  } catch (error) {
    console.error('❌ CRITICAL: Could not start the engine:', error);
    process.exit(1);
  }
};

startServer();