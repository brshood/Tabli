import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
let bucket = null;
export function getGridFsBucket() {
    if (!bucket) {
        const db = mongoose.connection.db;
        if (!db)
            throw new Error('MongoDB not connected');
        bucket = new GridFSBucket(db, { bucketName: 'media' });
    }
    return bucket;
}
