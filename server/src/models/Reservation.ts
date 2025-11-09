import mongoose, { Schema, Document, Model } from 'mongoose';

export type ReservationMode = 'reserve' | 'waitlist';
export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';

export interface ReservationDocument extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name?: string;
  mode: ReservationMode;
  partySize: number;
  contactMethod: 'phone' | 'email';
  phone?: string;
  email?: string;
  status: ReservationStatus;
  queuePosition?: number;
  tableId?: mongoose.Types.ObjectId;
  requestedAt: Date;
  confirmedAt?: Date;
  seatedAt?: Date;
  leftAt?: Date;
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  seatingPreference?: 'indoor' | 'outdoor' | 'no-preference';
  calledAt?: Date;
  reservationType?: 'reserved' | 'waitlist';
}

const reservationSchema = new Schema<ReservationDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String },
    mode: { type: String, enum: ['reserve', 'waitlist'], required: true },
    partySize: { type: Number, required: true },
    contactMethod: { type: String, enum: ['phone', 'email'], required: true },
    phone: String,
    email: String,
    status: { type: String, enum: ['pending', 'confirmed', 'seated', 'cancelled', 'no_show'], default: 'pending', index: true },
    queuePosition: Number,
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    requestedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    seatedAt: Date,
    leftAt: Date,
    gender: { type: String, enum: ['male', 'female', 'prefer-not-to-say'] },
    seatingPreference: { type: String, enum: ['indoor', 'outdoor', 'no-preference'] },
    calledAt: Date,
    reservationType: { type: String, enum: ['reserved', 'waitlist'] },
  },
  { timestamps: true }
);

// Compound indexes for better query performance
reservationSchema.index({ restaurantId: 1, status: 1 }); // For filtering by restaurant and status
reservationSchema.index({ tableId: 1 }); // For lookups by table
reservationSchema.index({ seatedAt: 1 }); // For analytics queries on seated time
reservationSchema.index({ requestedAt: 1 }); // For analytics queries on request time
reservationSchema.index({ restaurantId: 1, mode: 1, status: 1 }); // For waitlist queries

export const Reservation: Model<ReservationDocument> =
  mongoose.models.Reservation || mongoose.model<ReservationDocument>('Reservation', reservationSchema);





