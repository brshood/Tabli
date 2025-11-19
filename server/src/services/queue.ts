import { Queue, Worker, type JobsOptions, type Processor } from 'bullmq';
import { env } from '../config/env';

const connection = {
  connection: {
    url: env.REDIS_URL,
    maxRetriesPerRequest: null,
  },
};

export function createQueue<T = any>(name: string, defaultJobOptions?: JobsOptions) {
  return new Queue<T>(name, {
    ...connection,
    defaultJobOptions,
  });
}

export function createWorker<T = any>(name: string, processor: Processor<T>) {
  return new Worker<T>(name, processor, connection);
}

