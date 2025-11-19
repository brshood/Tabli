import { createServer } from 'http';
import { connectMongo } from './db/mongo';
import { createApp } from './app';
import { env } from './config/env';
import './jobs';
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
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
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal startup error', err);
    process.exit(1);
});
