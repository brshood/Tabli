export interface WaitlistEntry {
  reservationId: string;
  partySize: number;
  requestedAt?: string;
  queuePosition?: number | null;
}

export interface SeatedEntry {
  reservationId: string;
  tableId?: string;
  seatedAt: string;
  partySize: number;
}

export interface CompletedEntry {
  seatedAt: string;
  leftAt: string;
  partySize: number;
}

export interface WaitTimeEstimatorOptions {
  now?: Date;
  waitlist: WaitlistEntry[];
  seated: SeatedEntry[];
  completed: CompletedEntry[];
  availableTables: number;
  fallbackTurnMinutes?: number;
  cleanupBufferMinutes?: number;
  sampleLookbackHours?: number;
}

export interface WaitTimeEstimate {
  reservationId: string;
  minutes: number;
  seatTime: Date;
}

export interface WaitTimeEstimatorResult {
  estimates: WaitTimeEstimate[];
  averageDwellMinutes: number;
  sampleCount: number;
}

const DEFAULT_TURN_MINUTES = 45;
const DEFAULT_BUFFER_MINUTES = 3;
const MIN_TURN_MINUTES = 15;
const MAX_TURN_MINUTES = 180;

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Estimate wait times for reservations using live table state and historical dwell times.
 */
export function estimateWaitTimes(options: WaitTimeEstimatorOptions): WaitTimeEstimatorResult {
  const {
    waitlist,
    seated,
    completed,
    availableTables,
    fallbackTurnMinutes = DEFAULT_TURN_MINUTES,
    cleanupBufferMinutes = DEFAULT_BUFFER_MINUTES,
    sampleLookbackHours = 48,
  } = options;

  const now = options.now ?? new Date();

  // 1. Build dwell time samples from completed reservations
  const lookbackThreshold = new Date(now.getTime() - sampleLookbackHours * 60 * 60 * 1000);
  const dwellSamples = completed
    .filter(entry => entry.seatedAt && entry.leftAt)
    .map(entry => {
      const seatedAt = new Date(entry.seatedAt);
      const leftAt = new Date(entry.leftAt);
      if (Number.isNaN(seatedAt.getTime()) || Number.isNaN(leftAt.getTime()) || leftAt <= seatedAt) {
        return null;
      }
      if (leftAt < lookbackThreshold) {
        return null;
      }
      const minutes = (leftAt.getTime() - seatedAt.getTime()) / 60000;
      return minutes > 0 ? minutes : null;
    })
    .filter((val): val is number => val !== null);

  const averageDwell = dwellSamples.length > 0
    ? clamp(calculateAverage(dwellSamples), MIN_TURN_MINUTES, MAX_TURN_MINUTES)
    : fallbackTurnMinutes;

  const baseTurnMinutes = averageDwell + cleanupBufferMinutes;

  // 2. Seed release schedule with available tables (ready immediately)
  const releaseSchedule: Date[] = [];
  for (let i = 0; i < availableTables; i += 1) {
    releaseSchedule.push(new Date(now));
  }

  // 3. Add expected release times for currently seated tables
  seated.forEach(entry => {
    if (!entry.seatedAt) return;
    const seatedAt = new Date(entry.seatedAt);
    if (Number.isNaN(seatedAt.getTime())) return;
    const expectedCompletion = new Date(seatedAt.getTime() + averageDwell * 60000);
    const paddedCompletion = new Date(expectedCompletion.getTime() + cleanupBufferMinutes * 60000);
    const releaseTime = paddedCompletion < now ? new Date(now.getTime() + cleanupBufferMinutes * 60000) : paddedCompletion;
    releaseSchedule.push(releaseTime);
  });

  releaseSchedule.sort((a, b) => a.getTime() - b.getTime());

  // 4. Run the queue simulation
  const estimates: WaitTimeEstimate[] = [];
  let lastRelease = releaseSchedule.length > 0 ? releaseSchedule[releaseSchedule.length - 1] : new Date(now);

  waitlist.forEach((entry, index) => {
    while (releaseSchedule.length <= index) {
      lastRelease = new Date(lastRelease.getTime() + baseTurnMinutes * 60000);
      releaseSchedule.push(lastRelease);
    }
    const seatTime = releaseSchedule[index];
    const waitMinutes = Math.max(0, Math.round((seatTime.getTime() - now.getTime()) / 60000));
    estimates.push({
      reservationId: entry.reservationId,
      minutes: waitMinutes,
      seatTime,
    });
  });

  return {
    estimates,
    averageDwellMinutes: averageDwell,
    sampleCount: dwellSamples.length,
  };
}

