// Real-time notification service using Server-Sent Events (SSE)
import { Response } from 'express';
import { Types } from 'mongoose';

interface SSEClient {
  id: string;
  reservationId: string;
  response: Response;
}

interface StaffSSEClient {
  id: string;
  restaurantId: string;
  response: Response;
}

class NotificationEmitter {
  private clients: Map<string, SSEClient[]> = new Map();
  private staffClients: Map<string, StaffSSEClient[]> = new Map();

  /**
   * Register a new SSE client for a specific reservation
   */
  addClient(reservationId: string, response: Response): string {
    const clientId = `${reservationId}-${Date.now()}-${Math.random()}`;
    const client: SSEClient = { id: clientId, reservationId, response };

    if (!this.clients.has(reservationId)) {
      this.clients.set(reservationId, []);
    }
    this.clients.get(reservationId)!.push(client);

    console.log(`[SSE] Client ${clientId} connected for reservation ${reservationId}`);
    console.log(`[SSE] Total clients for ${reservationId}: ${this.clients.get(reservationId)!.length}`);

    return clientId;
  }

  /**
   * Remove a client when they disconnect
   */
  removeClient(reservationId: string, clientId: string): void {
    const clients = this.clients.get(reservationId);
    if (clients) {
      const index = clients.findIndex(c => c.id === clientId);
      if (index !== -1) {
        clients.splice(index, 1);
        console.log(`[SSE] Client ${clientId} disconnected from reservation ${reservationId}`);
      }
      if (clients.length === 0) {
        this.clients.delete(reservationId);
        console.log(`[SSE] No more clients for reservation ${reservationId}`);
      }
    }
  }

  /**
   * Send a notification to all clients listening to a specific reservation
   */
  notifyReservation(reservationId: string | Types.ObjectId, data: any): void {
    const id = reservationId.toString();
    const clients = this.clients.get(id);
    
    if (!clients || clients.length === 0) {
      console.log(`[SSE] No clients listening for reservation ${id}`);
      return;
    }

    console.log(`[SSE] Notifying ${clients.length} client(s) for reservation ${id}`);
    
    const deadClients: string[] = [];
    
    clients.forEach(client => {
      try {
        client.response.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error(`[SSE] Failed to send to client ${client.id}:`, error);
        deadClients.push(client.id);
      }
    });

    // Clean up dead connections
    deadClients.forEach(clientId => this.removeClient(id, clientId));
  }

  /**
   * Get count of active clients for a reservation
   */
  getClientCount(reservationId: string): number {
    return this.clients.get(reservationId)?.length || 0;
  }

  /**
   * Get total active connections
   */
  getTotalConnections(): number {
    let total = 0;
    this.clients.forEach(clients => total += clients.length);
    this.staffClients.forEach(clients => total += clients.length);
    return total;
  }

  // ===== Staff SSE Methods =====

  /**
   * Register a new SSE client for a restaurant (for staff)
   */
  addStaffClient(restaurantId: string, response: Response): string {
    const clientId = `staff-${restaurantId}-${Date.now()}-${Math.random()}`;
    const client: StaffSSEClient = { id: clientId, restaurantId, response };

    if (!this.staffClients.has(restaurantId)) {
      this.staffClients.set(restaurantId, []);
    }
    this.staffClients.get(restaurantId)!.push(client);

    console.log(`[SSE:STAFF] Client ${clientId} connected for restaurant ${restaurantId}`);
    console.log(`[SSE:STAFF] Total staff clients for ${restaurantId}: ${this.staffClients.get(restaurantId)!.length}`);

    return clientId;
  }

  /**
   * Remove a staff client when they disconnect
   */
  removeStaffClient(restaurantId: string, clientId: string): void {
    const clients = this.staffClients.get(restaurantId);
    if (clients) {
      const index = clients.findIndex(c => c.id === clientId);
      if (index !== -1) {
        clients.splice(index, 1);
        console.log(`[SSE:STAFF] Client ${clientId} disconnected from restaurant ${restaurantId}`);
      }
      if (clients.length === 0) {
        this.staffClients.delete(restaurantId);
        console.log(`[SSE:STAFF] No more staff clients for restaurant ${restaurantId}`);
      }
    }
  }

  /**
   * Send a notification to all staff clients for a restaurant
   */
  notifyStaff(restaurantId: string | Types.ObjectId, data: any): void {
    const id = restaurantId.toString();
    const clients = this.staffClients.get(id);
    
    if (!clients || clients.length === 0) {
      console.log(`[SSE:STAFF] No staff clients listening for restaurant ${id}`);
      return;
    }

    console.log(`[SSE:STAFF] Notifying ${clients.length} staff client(s) for restaurant ${id}`);
    
    const deadClients: string[] = [];
    
    clients.forEach(client => {
      try {
        client.response.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error(`[SSE:STAFF] Failed to send to client ${client.id}:`, error);
        deadClients.push(client.id);
      }
    });

    // Clean up dead connections
    deadClients.forEach(clientId => this.removeStaffClient(id, clientId));
  }

  /**
   * Get count of active staff clients for a restaurant
   */
  getStaffClientCount(restaurantId: string): number {
    return this.staffClients.get(restaurantId)?.length || 0;
  }
}

// Singleton instance
export const notificationEmitter = new NotificationEmitter();

