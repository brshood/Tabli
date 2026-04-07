import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
function normalizeKey(rawKey) {
    const trimmed = rawKey.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
        return Buffer.from(trimmed, 'hex');
    }
    const b64 = Buffer.from(trimmed, 'base64');
    if (b64.length === 32)
        return b64;
    return crypto.createHash('sha256').update(trimmed).digest();
}
function encryptPayload(payload, rawKey) {
    const key = normalizeKey(rawKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { iv, encrypted, tag };
}
async function dumpCollections() {
    const db = mongoose.connection.db;
    if (!db)
        throw new Error('MongoDB connection unavailable for backup');
    const collections = await db.collections();
    const dumps = [];
    for (const collection of collections) {
        const docs = await collection.find({}).toArray();
        dumps.push({
            name: collection.collectionName,
            count: docs.length,
            documents: docs,
        });
    }
    return dumps;
}
export async function runEncryptedLocalBackup(rawKey, outputDir) {
    const now = new Date();
    const dateToken = now.toISOString().replace(/[:.]/g, '-');
    const dump = await dumpCollections();
    const payload = Buffer.from(JSON.stringify({
        generatedAt: now.toISOString(),
        engine: 'aes-256-gcm',
        collections: dump,
    }), 'utf8');
    const { iv, encrypted, tag } = encryptPayload(payload, rawKey);
    await fs.mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `db-backup-${dateToken}.enc.json`);
    await fs.writeFile(filePath, JSON.stringify({
        generatedAt: now.toISOString(),
        iv: iv.toString('base64'),
        authTag: tag.toString('base64'),
        payload: encrypted.toString('base64'),
    }), 'utf8');
    return filePath;
}
