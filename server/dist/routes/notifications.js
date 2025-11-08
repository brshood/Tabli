import express from 'express';
import { sendEmail } from '../services/email';
export const notificationsRouter = express.Router();
notificationsRouter.post('/test-email', async (req, res, next) => {
    try {
        const { to, subject, text } = req.body;
        if (!to)
            return res.status(400).json({ error: 'to is required' });
        await sendEmail({ to, subject: subject || 'Tabli test email', html: text || 'This is a test email from Tabli.' });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
notificationsRouter.post('/test-sms', (_req, res) => {
    res.status(410).json({ error: 'SMS notifications are no longer supported.' });
});
