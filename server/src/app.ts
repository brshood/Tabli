import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.ts';
import { healthRouter } from './routes/health.ts';
import { authRouter } from './routes/auth.ts';
import { restaurantsRouter } from './routes/restaurants.ts';
import { mediaRouter } from './routes/media.ts';
import { reservationsRouter } from './routes/reservations.ts';
import { qrRouter } from './routes/qr.ts';
import { queueRouter } from './routes/queue.ts';
import { analyticsRouter } from './routes/analytics.ts';
import { tablesRouter } from './routes/tables.ts';
import { documentsRouter } from './routes/documents.ts';
import { maintenanceRouter } from './routes/maintenance.ts';
import { dashboardRouter } from './routes/dashboard.ts';

// Global rate limiter: 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth routes: 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp(): Application {
  const app = express();

  app.use(helmet());
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


