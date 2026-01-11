/**
 * SMS message templates for different scenarios in Tabli
 */

export interface SmsMessageContext {
  restaurantName?: string;
  queuePosition?: number;
  customerName?: string;
  partySize?: number;
  seatingPreference?: 'indoor' | 'outdoor' | 'no-preference';
}

/**
 * Get SMS message for "Stand in queue" scenario
 * Sent when a customer joins the waitlist
 */
export function getQueueJoinMessage(context?: SmsMessageContext): string {
  return "Thanks for joining our waitlist! We'll let you know when your table's ready. Check your spot via the link below:\n\nhttps://tabliapp.com/#notifications";
}

/**
 * Get SMS message for "Table ready" scenario
 * Sent when staff checks in a customer (status changes to 'confirmed')
 */
export function getTableReadyMessage(context?: SmsMessageContext): string {
  return "Your table is ready! We'll hold it for you for about 10-15 minutes. See you soon!";
}

/**
 * Get SMS message for "Reserve a table" scenario
 * Sent when a customer makes a reservation (not waitlist)
 */
export function getReservationConfirmationMessage(context?: SmsMessageContext): string {
  return "Thank you for booking with us! Please make your way to your table.";
}

/**
 * Get SMS message for "Checkout" scenario
 * Sent when a customer checks out (leftAt is set)
 */
export function getCheckoutMessage(context?: SmsMessageContext): string {
  return "Thank you for using Tabli! We hope to see you again next time. Please leave a rating at https://tabliapp.com";
}

/**
 * Get SMS message for "Removed from queue/reservation" scenario
 * Sent when a customer is removed from the queue or reservation by staff
 */
export function getRemovalMessage(context?: SmsMessageContext): string {
  const restaurantName = context?.restaurantName || 'the restaurant';
  return `We weren't able to hold your spot at ${restaurantName} any longer. If you still plan to join us, please reply or visit us again.`;
}

/**
 * Get SMS message for restaurant staff when a customer makes a reservation
 * Sent to the restaurant's notification phone
 */
export function getRestaurantReservationNotification(context?: SmsMessageContext): string {
  const customerName = context?.customerName || 'A customer';
  const partySize = context?.partySize || 1;
  const seating = context?.seatingPreference === 'indoor' ? ' (Indoor)' 
    : context?.seatingPreference === 'outdoor' ? ' (Outdoor)' 
    : '';
  return `${customerName} just reserved a table for ${partySize}${seating}. Check your dashboard for details.`;
}

/**
 * Get SMS message for restaurant staff when a customer joins the queue
 * Sent to the restaurant's notification phone
 */
export function getRestaurantQueueNotification(context?: SmsMessageContext): string {
  const customerName = context?.customerName || 'A customer';
  const partySize = context?.partySize || 1;
  const position = context?.queuePosition ? ` (#${context.queuePosition})` : '';
  const seating = context?.seatingPreference === 'indoor' ? ' (Indoor)' 
    : context?.seatingPreference === 'outdoor' ? ' (Outdoor)' 
    : '';
  return `${customerName} joined the waitlist for ${partySize}${position}${seating}. Check your dashboard.`;
}

