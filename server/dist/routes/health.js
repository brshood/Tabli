import mongoose from 'mongoose';
import { emailQueue } from '../queues/emailQueue';
import { env } from '../config/env';
const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
};
export async function healthRouter(_req, res) {
    const mongoState = mongoose.connection.readyState;
    let redisStatus = env.REDIS_URL ? 'unknown' : 'disabled';
    let emailQueueCounts;
    if (env.REDIS_URL) {
        try {
            emailQueueCounts = await emailQueue.getJobCounts('waiting', 'active', 'failed', 'delayed');
            redisStatus = 'connected';
        }
        catch (err) {
            console.error('[HEALTH:REDIS]', err?.message || err);
            redisStatus = 'unavailable';
        }
    }
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        pid: process.pid,
        services: {
            mongodb: {
                state: mongoStates[mongoState] || 'unknown',
            },
            redis: {
                state: redisStatus,
                queueCounts: emailQueueCounts,
            },
        },
        memory: {
            rss: process.memoryUsage().rss,
            heapUsed: process.memoryUsage().heapUsed,
        },
    });
}
