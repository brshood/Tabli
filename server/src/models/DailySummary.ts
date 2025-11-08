import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Statistics for a single table's performance on a given day.
 */
export interface TableStat {
  tableId: mongoose.Types.ObjectId;
  tableName: string;
  reservations: number;
  totalTimeOccupied: number; // in minutes
  totalGuests: number;
  avgTurnaroundTime: number; // in minutes
}

/**
 * Information about the busiest or least busy table for a given day.
 */
export interface BusiestTableInfo {
  tableId: mongoose.Types.ObjectId | null;
  tableName: string;
  reservations: number;
  totalTimeOccupied: number; // in minutes
  totalGuests: number;
}

/**
 * Comprehensive metrics for a restaurant's daily performance summary.
 */
export interface DailySummaryMetrics {
  totalBookings: number;
  seatedGuests: number;
  noShows: number;
  manuallyAddedCustomers: number;
  avgTurnaroundTime: number; // in minutes
  busiestTable: BusiestTableInfo;
  leastBusiestTable: BusiestTableInfo;
  avgGuestsPerTable: number;
  tableStats: TableStat[];
}

/**
 * MongoDB document representing a daily summary for a restaurant.
 * Contains comprehensive metrics for a specific date.
 */
export interface DailySummaryDocument extends Document {
  restaurantId: mongoose.Types.ObjectId;
  date: Date;
  metrics: DailySummaryMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const tableStatSchema = new Schema<TableStat>({
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
  tableName: { type: String, required: true },
  reservations: { type: Number, required: true, default: 0 },
  totalTimeOccupied: { type: Number, required: true, default: 0 },
  totalGuests: { type: Number, required: true, default: 0 },
  avgTurnaroundTime: { type: Number, required: true, default: 0 },
}, { _id: false });

const busiestTableInfoSchema = new Schema<BusiestTableInfo>({
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: false, default: null },
  tableName: { type: String, required: true },
  reservations: { type: Number, required: true, default: 0 },
  totalTimeOccupied: { type: Number, required: true, default: 0 },
  totalGuests: { type: Number, required: true, default: 0 },
}, { _id: false });

const dailySummaryMetricsSchema = new Schema<DailySummaryMetrics>({
  totalBookings: { type: Number, required: true, default: 0 },
  seatedGuests: { type: Number, required: true, default: 0 },
  noShows: { type: Number, required: true, default: 0 },
  manuallyAddedCustomers: { type: Number, required: true, default: 0 },
  avgTurnaroundTime: { type: Number, required: true, default: 0 },
  busiestTable: { type: busiestTableInfoSchema, required: true },
  leastBusiestTable: { type: busiestTableInfoSchema, required: true },
  avgGuestsPerTable: { type: Number, required: true, default: 0 },
  tableStats: { type: [tableStatSchema], required: true, default: [] },
}, { _id: false });

const dailySummarySchema = new Schema<DailySummaryDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    date: { type: Date, required: true },
    metrics: { type: dailySummaryMetricsSchema, required: true },
  },
  { timestamps: true }
);

// Compound unique index: one summary per restaurant per day
// This index already covers restaurantId, so we don't need index: true on the field
dailySummarySchema.index({ restaurantId: 1, date: 1 }, { unique: true });

export const DailySummary: Model<DailySummaryDocument> =
  mongoose.models.DailySummary || mongoose.model<DailySummaryDocument>('DailySummary', dailySummarySchema);

