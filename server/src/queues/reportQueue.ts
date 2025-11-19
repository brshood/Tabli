import { createQueue } from '../services/queue';

export interface DailySummaryJobData {
  restaurantId: string;
  date: string;
}

export const reportQueue = createQueue<DailySummaryJobData>('reports:daily-summary', {
  attempts: 2,
  removeOnComplete: true,
});

