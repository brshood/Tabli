import express from 'express';
export const qrRouter = express.Router();
// Redirect to frontend profile route with QR params
qrRouter.get('/:rid', (req, res) => {
    const rid = req.params.rid;
    const frontend = process.env.CORS_ORIGIN || 'http://localhost:3000';
    const url = new URL(frontend);
    url.searchParams.set('qr', 'true');
    url.searchParams.set('rid', rid);
    return res.redirect(302, url.toString());
});
