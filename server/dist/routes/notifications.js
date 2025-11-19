import express from 'express';
import { enqueueEmail } from '../services/email';
export const notificationsRouter = express.Router();
notificationsRouter.post('/test-email', async (req, res, next) => {
    try {
        const { to, subject, text } = req.body;
        if (!to)
            return res.status(400).json({ error: 'to is required' });
        await enqueueEmail({ to, subject: subject || 'Tabli test email', html: text || 'This is a test email from Tabli.' });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
