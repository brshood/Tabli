import express from 'express';
import multer from 'multer';
import { getGridFsBucket } from '../db/gridfs.ts';
import { ObjectId } from 'mongodb';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const mediaRouter = express.Router();

mediaRouter.get('/:id', async (req, res, next) => {
  try {
    const id = new ObjectId(req.params.id);
    const bucket = getGridFsBucket();
    const dl = bucket.openDownloadStream(id);
    dl.on('file', (file) => {
      if (file?.contentType) res.setHeader('Content-Type', file.contentType);
    });
    dl.on('error', (err) => next(err));
    dl.pipe(res);
  } catch (err) {
    next(err);
  }
});

// generic upload endpoint (used by restaurants route too if needed)
mediaRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const bucket = getGridFsBucket();
    const stream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {},
    });
    stream.end(req.file.buffer);
    stream.on('finish', (file) => {
      res.json({ id: file._id, filename: file.filename, contentType: file.contentType });
    });
    stream.on('error', (err) => next(err));
  } catch (err) {
    next(err);
  }
});



