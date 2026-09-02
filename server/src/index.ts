import { createServer } from 'http';
import { connectMongo } from './db/mongo';
import { createApp } from './app';
import { env } from './config/env';
import { checkExpiredHolds } from './services/holdExpiryChecker';
import { sweepStaleQueueEntries, STALE_QUEUE_HOURS } from './cron/dailyReset';
import { runEncryptedLocalBackup } from './services/backupService';

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
  console.log(
    '- EAND_SMS configured:',
    Boolean(env.EAND_API_EMAIL && env.EAND_API_PASSWORD && env.EAND_SENDER_ID)
  );
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
  
  // Expire abandoned queue entries continuously rather than in a single nightly
  // window: a missed window used to leave stale rows counting as people in line.
  await sweepStaleQueueEntries();
  setInterval(sweepStaleQueueEntries, 30 * 60 * 1000);

  console.log(`Queue sweep started (expires entries older than ${STALE_QUEUE_HOURS}h, runs every 30 minutes)`);

  let lastBackupDayKey = '';
  const runDailyBackupIfNeeded = async () => {
    if (!env.BACKUP_ENCRYPTION_KEY) return;
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    if (dayKey === lastBackupDayKey) return;
    try {
      const outputPath = await runEncryptedLocalBackup(env.BACKUP_ENCRYPTION_KEY, env.BACKUP_OUTPUT_DIR);
      lastBackupDayKey = dayKey;
      console.log(`[BACKUP] Encrypted local backup created: ${outputPath}`);
    } catch (backupError) {
      console.error('[BACKUP] Failed to create encrypted local backup:', backupError);
    }
  };

  await runDailyBackupIfNeeded();
  setInterval(runDailyBackupIfNeeded, 60 * 60 * 1000);
  console.log('Daily encrypted backup scheduler started');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error', err);
  process.exit(1);
});



