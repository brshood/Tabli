import express from 'express';
export const qrRouter = express.Router();
// Redirect to frontend profile route with QR params
qrRouter.get('/:rid', (req, res) => {
    const rid = req.params.rid;
    const frontend = process.env.CORS_ORIGIN || 'http://localhost:5173';
    const base = frontend.replace(/\/$/, '');
    const url = `${base}/restaurant/${rid}?qr=true`;
    return res.redirect(302, url);
});
