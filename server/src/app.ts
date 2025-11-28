import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { restaurantsRouter } from './routes/restaurants';
import { mediaRouter } from './routes/media';
import { reservationsRouter } from './routes/reservations';
import { qrRouter } from './routes/qr';
import { queueRouter } from './routes/queue';
import { analyticsRouter } from './routes/analytics';
import { tablesRouter } from './routes/tables';
import { documentsRouter } from './routes/documents';
import { maintenanceRouter } from './routes/maintenance';
import { notificationsRouter } from './routes/notifications';
import { dashboardRouter } from './routes/dashboard';
import { menusRouter } from './routes/menus';
import { adminRouter } from './routes/admin';
import { contactRouter } from './routes/contact';
import { sseRouter } from './routes/sse';
import { pushRouter } from './routes/push';

// STRESS TEST MODE: Temporarily increased limits for busy day simulation
// TODO: Revert these after stress testing or make them environment-configurable
const STRESS_TEST_MODE = process.env.STRESS_TEST_MODE === 'true';

// Global rate limiter: 
// - Normal: 1000 requests per 15 minutes
// - Stress Test: 50000 requests per 15 minutes (50x increase)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: STRESS_TEST_MODE ? 50000 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Staff limiter for frequently polled routes:
// - Normal: 2000 requests per 15 minutes
// - Stress Test: 100000 requests per 15 minutes (50x increase)
const staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: STRESS_TEST_MODE ? 100000 : 2000,
  message: { error: 'Too many requests to staff dashboard, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth routes: 10 requests per 15 minutes (unchanged - security)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Reservations limiter:
// - Normal: 500 requests per 5 minutes
// - Stress Test: 25000 requests per 5 minutes (50x increase)
const reservationsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: STRESS_TEST_MODE ? 25000 : 500,
  message: { error: 'Too many reservation actions, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Creates and configures the Express application with all middleware and routes.
 * Sets up security, CORS, compression, rate limiting, and error handling.
 * 
 * @returns Configured Express Application instance
 */
export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());
  app.use(cors({ 
    origin: env.CORS_ORIGIN, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());
  app.use(mongoSanitize());
  app.use(pinoHttp());
  app.use(globalLimiter);

  app.get('/health', healthRouter);
  app.use('/auth', authLimiter, authRouter);
  app.use('/restaurants', restaurantsRouter);
  app.use('/media', mediaRouter);
  // Apply staff limiter to frequently polled routes
  app.use('/reservations', staffLimiter, reservationsLimiter, reservationsRouter);
  // Apply staff limiter to queue route for consistency during stress tests
  if (STRESS_TEST_MODE) {
    app.use('/queue', staffLimiter, queueRouter);
  } else {
    app.use('/queue', queueRouter);
  }
  app.use('/qr', qrRouter);
  app.use('/analytics', staffLimiter, analyticsRouter);
  app.use('/dashboard', staffLimiter, dashboardRouter);
  app.use('/documents', documentsRouter);
  app.use('/maintenance', maintenanceRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/menus', menusRouter);
  app.use('/', staffLimiter, tablesRouter);
  app.use('/admin', adminRouter);
  app.use('/contact', contactRouter);
  app.use('/sse', sseRouter);
  app.use('/push', pushRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  });

  return app;
}


