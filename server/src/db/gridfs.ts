import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let bucket: GridFSBucket | null = null;

export function getGridFsBucket(): GridFSBucket {
  if (!bucket) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB not connected');
    bucket = new GridFSBucket(db, { bucketName: 'media' });
  }
  return bucket;
}





