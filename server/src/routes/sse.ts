// Server-Sent Events (SSE) endpoint for real-time reservation updates
import express from 'express';
import { notificationEmitter } from '../services/notificationEmitter';
import { Reservation } from '../models/Reservation';

export const sseRouter = express.Router();

/**
 * GET /sse/reservations/:id
 * Establish SSE connection for real-time reservation updates
 */
sseRouter.get('/reservations/:id', async (req, res) => {
  const reservationId = req.params.id;

  // Verify reservation exists
  try {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid reservation ID' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

  // Register client
  const clientId = notificationEmitter.addClient(reservationId, res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    notificationEmitter.removeClient(reservationId, clientId);
    console.log(`[SSE] Connection closed for reservation ${reservationId}`);
  });
});

/**
 * GET /sse/staff/:restaurantId
 * Establish SSE connection for staff real-time updates at a restaurant
 */
sseRouter.get('/staff/:restaurantId', async (req, res) => {
  const restaurantId = req.params.restaurantId;

  // Verify restaurant exists (optional - could be skipped for performance)
  // For now, we'll let it connect without verification for simplicity

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Staff SSE connection established', restaurantId })}\n\n`);

  // Register staff client
  const clientId = notificationEmitter.addStaffClient(restaurantId, res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    notificationEmitter.removeStaffClient(restaurantId, clientId);
    console.log(`[SSE:STAFF] Connection closed for restaurant ${restaurantId}`);
  });
});

/**
 * GET /sse/health
 * Health check endpoint to see active SSE connections
 */
sseRouter.get('/health', (req, res) => {
  res.json({
    totalConnections: notificationEmitter.getTotalConnections(),
    timestamp: new Date().toISOString()
  });
});

