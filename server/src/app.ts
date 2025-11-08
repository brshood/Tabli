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

// Global rate limiter: 500 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth routes: 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts, please try again later' },
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
  app.use('/reservations', reservationsRouter);
  app.use('/queue', queueRouter);
  app.use('/qr', qrRouter);
  app.use('/analytics', analyticsRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/documents', documentsRouter);
  app.use('/maintenance', maintenanceRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/menus', menusRouter);
  app.use('/', tablesRouter);

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


