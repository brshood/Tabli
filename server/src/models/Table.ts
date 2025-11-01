import mongoose, { Schema, Document, Model } from 'mongoose';

export type TableStatus = 'available' | 'occupied' | 'cleaning';

export interface TableDocument extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  capacity: number;
  status: TableStatus;
  currentReservationId?: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const tableSchema = new Schema<TableDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['available','occupied','cleaning'], default: 'available', index: true },
    currentReservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
  },
  { timestamps: true }
);

export const Table: Model<TableDocument> = mongoose.models.Table || mongoose.model<TableDocument>('Table', tableSchema);





