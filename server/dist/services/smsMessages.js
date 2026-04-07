/**
 * SMS message templates for different scenarios in Tabli
 */
function getWaitTimeLine(context) {
    if (context?.waitTimeDisplayText?.trim()) {
        return `Estimated wait: ${context.waitTimeDisplayText.trim()}.`;
    }
    if (typeof context?.waitTimeMinMinutes === 'number' &&
        typeof context?.waitTimeMaxMinutes === 'number') {
        return `Estimated wait: ${context.waitTimeMinMinutes}-${context.waitTimeMaxMinutes} minutes.`;
    }
    return 'Estimated wait: 10-15 minutes.';
}
/**
 * Get SMS message for "Stand in queue" scenario
 * Sent when a customer joins the waitlist
 */
export function getQueueJoinMessage(context) {
    const waitLine = getWaitTimeLine(context);
    return `Thanks for joining our waitlist! ${waitLine} Track your spot:\n\nhttps://tabliapp.com/#notifications`;
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
    const name = context?.restaurantName ? ` at ${context.restaurantName}` : '';
    const waitLine = getWaitTimeLine(context);
    return `Thank you for booking${name}! ${waitLine} We'll notify you when your table is ready.`;
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
    const contact = context?.contact ? ` Contact: ${context.contact}.` : '';
    return `${customerName} reserved a table for ${partySize}${seating}.${contact} Check your dashboard.`;
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
