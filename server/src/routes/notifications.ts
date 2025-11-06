import express from 'express';
import { sendEmail } from '../services/email';
import { sendSMS } from '../services/sms';

export const notificationsRouter = express.Router();

notificationsRouter.post('/test-email', async (req, res, next) => {
  try {
    const { to, subject, text } = req.body as any;
    if (!to) return res.status(400).json({ error: 'to is required' });
    await sendEmail({ to, subject: subject || 'Tabli test email', html: text || 'This is a test email from Tabli.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

notificationsRouter.post('/test-sms', async (req, res, next) => {
  try {
    const { to, message } = req.body as any;
    if (!to) return res.status(400).json({ error: 'to is required' });
    await sendSMS({ to, message: message || 'This is a test SMS from Tabli.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});


