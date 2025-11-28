import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PushSubscriptionDocument extends Document {
  userId?: string; // Optional: user identifier (email or phone)
  reservationId?: mongoose.Types.ObjectId; // Optional: linked to specific reservation
  endpoint: string; // Push service endpoint URL
  keys: {
    p256dh: string; // P-256 ECDH public key
    auth: string; // Authentication secret
  };
  userAgent?: string; // Browser user agent for debugging
  createdAt: Date;
  updatedAt: Date;
}

const pushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    userId: { type: String, index: true }, // Index for finding by user
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', index: true },
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: String,
  },
  { timestamps: true }
);

// Index for efficient lookups by user or reservation
pushSubscriptionSchema.index({ userId: 1, createdAt: -1 });
pushSubscriptionSchema.index({ reservationId: 1 });

export const PushSubscription: Model<PushSubscriptionDocument> =
  mongoose.models.PushSubscription || mongoose.model<PushSubscriptionDocument>('PushSubscription', pushSubscriptionSchema);

