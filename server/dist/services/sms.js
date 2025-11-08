export async function sendSMS(opts) {
    // SMS delivery disabled – log for debugging but do nothing.
    // eslint-disable-next-line no-console
    console.log('[SMS:DISABLED]', { to: opts.to, message: opts.message });
}
