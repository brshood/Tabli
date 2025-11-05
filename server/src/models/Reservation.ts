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
}

const reservationSchema = new Schema<ReservationDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
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
  },
  { timestamps: true }
);

export const Reservation: Model<ReservationDocument> =
  mongoose.models.Reservation || mongoose.model<ReservationDocument>('Reservation', reservationSchema);





