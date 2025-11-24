import { createServer } from 'http';
import { connectMongo } from './db/mongo';
import { createApp } from './app';
import { env } from './config/env';
import { checkExpiredHolds } from './services/holdExpiryChecker';
import { runDailyReset } from './cron/dailyReset';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately, let the error handler catch it
});

async function main() {
  await connectMongo();
  console.log('Environment variables loaded:');
  console.log('- CORS_ORIGIN:', env.CORS_ORIGIN);
  console.log('- NODE_ENV:', env.NODE_ENV);
  console.log('- PORT:', env.PORT);
  const app = createApp();
  const server = createServer(app);
  const port = env.PORT;
  server.listen(port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on 0.0.0.0:${port}`);
  });
  
  // #2 - Start hold expiry checker (runs every minute)
  setInterval(async () => {
    await checkExpiredHolds();
  }, 60 * 1000); // Run every 60 seconds
  
  console.log('Hold expiry checker started (runs every minute)');
  
  // #15 - Daily reset at 1 AM GST (21:00 UTC previous day)
  // Check every hour if it's 1 AM GST
  setInterval(async () => {
    const now = new Date();
    const gstHour = (now.getUTCHours() + 4) % 24; // GST is UTC+4
    
    if (gstHour === 1 && now.getUTCMinutes() < 10) {
      // Run reset if it's between 1:00-1:10 AM GST
      await runDailyReset();
    }
  }, 10 * 60 * 1000); // Check every 10 minutes
  
  console.log('Daily reset scheduler started (runs at 1 AM GST)');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', err);
  process.exit(1);
});



