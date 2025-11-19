import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
const connection = {
    connection: {
        url: env.REDIS_URL,
        maxRetriesPerRequest: null,
    },
};
export function createQueue(name, defaultJobOptions) {
    return new Queue(name, {
        ...connection,
        defaultJobOptions,
    });
}
export function createWorker(name, processor) {
    return new Worker(name, processor, connection);
}
