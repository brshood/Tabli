import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PushSubscriptionDocument extends Document {
  userId?: string; // Optional: user identifier (email or phone) - for user notifications
  reservationId?: mongoose.Types.ObjectId; // Optional: linked to specific reservation - for user notifications
  restaurantId?: mongoose.Types.ObjectId; // Optional: linked to restaurant - for staff notifications
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
    userId: { type: String }, // For user notifications - indexed below
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' }, // For user notifications - indexed below
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' }, // For staff notifications - indexed below
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: String,
  },
  { timestamps: true }
);

// Index for efficient lookups by user, reservation, or restaurant
pushSubscriptionSchema.index({ userId: 1, createdAt: -1 });
pushSubscriptionSchema.index({ reservationId: 1 });
pushSubscriptionSchema.index({ restaurantId: 1 });

export const PushSubscription: Model<PushSubscriptionDocument> =
  mongoose.models.PushSubscription || mongoose.model<PushSubscriptionDocument>('PushSubscription', pushSubscriptionSchema);

