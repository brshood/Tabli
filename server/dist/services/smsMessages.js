/**
 * SMS message templates for different scenarios in Tabli
 */
/**
 * Get SMS message for "Stand in queue" scenario
 * Sent when a customer joins the waitlist
 */
export function getQueueJoinMessage(context) {
    return "Thanks for joining our waitlist! We'll let you know when your table's ready. Check your spot via the link below:\n\nhttps://tabliapp.com/#notifications";
}
/**
 * Get SMS message for "Table ready" scenario
 * Sent when staff checks in a customer (status changes to 'confirmed')
 */
export function getTableReadyMessage(context) {
    return "Your table is ready! We'll hold it for you for about 10-15 minutes. See you soon!";
}
/**
 * Get SMS message for "Reserve a table" scenario
 * Sent when a customer makes a reservation (not waitlist)
 */
export function getReservationConfirmationMessage(context) {
    return "Thank you for booking with us! Please make your way to your table.";
}
/**
 * Get SMS message for "Checkout" scenario
 * Sent when a customer checks out (leftAt is set)
 */
export function getCheckoutMessage(context) {
    return "Thank you for using Tabli! We hope to see you again next time. Please leave a rating at https://tabliapp.com";
}
/**
 * Get SMS message for "Removed from queue/reservation" scenario
 * Sent when a customer is removed from the queue or reservation by staff
 */
export function getRemovalMessage(context) {
    const restaurantName = context?.restaurantName || 'the restaurant';
    return `We weren't able to hold your spot at ${restaurantName} any longer. If you still plan to join us, please reply or visit us again.`;
}
/**
 * Get SMS message for restaurant staff when a customer makes a reservation
 * Sent to the restaurant's notification phone
 */
export function getRestaurantReservationNotification(context) {
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
export function getRestaurantQueueNotification(context) {
    const customerName = context?.customerName || 'A customer';
    const partySize = context?.partySize || 1;
    const position = context?.queuePosition ? ` (#${context.queuePosition})` : '';
    const seating = context?.seatingPreference === 'indoor' ? ' (Indoor)'
        : context?.seatingPreference === 'outdoor' ? ' (Outdoor)'
            : context?.seatingPreference === 'no-preference' ? ' (No pref)' : '';
    const contact = context?.contact ? ` Contact: ${context.contact}.` : '';
    return `${customerName} joined the waitlist for ${partySize}${position}${seating}.${contact} Check your dashboard.`;
}
