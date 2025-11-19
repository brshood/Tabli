import type { DailySummaryJobData } from '../queues/reportQueue';
import '../queues/reportQueue';
import { createWorker } from '../services/queue';
import { generateDailySummaryReport, parseDateString } from '../routes/analytics';

createWorker<DailySummaryJobData>('reports:daily-summary', async (job) => {
  const { restaurantId, date } = job.data;
  const targetDate = parseDateString(date);
  await generateDailySummaryReport(restaurantId, targetDate);
});

