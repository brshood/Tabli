import express from 'express';
import { z } from 'zod';
import { sendEmail, buildEmailTemplate } from '../services/email';
export const contactRouter = express.Router();
const contactSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    message: z.string().min(1).max(2000),
});
// POST /contact - Send contact form message to Tabli team
contactRouter.post('/', async (req, res, next) => {
    try {
        const data = contactSchema.parse(req.body);
        // Send email to Tabli team
        await sendEmail({
            to: 'tabli.team@gmail.com',
            subject: `Contact Form: Message from ${data.name}`,
            text: `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`,
            html: buildEmailTemplate({
                heading: 'New Contact Form Submission',
                intro: 'You have received a new message from the Tabli contact form:',
                lines: [
                    `<strong>Name:</strong> ${data.name}`,
                    `<strong>Email:</strong> ${data.email}`,
                    `<strong>Message:</strong>`,
                    data.message,
                ],
                footer: 'Reply directly to this email to respond to the sender.',
            }),
        });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
