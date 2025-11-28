import mongoose, { Schema } from 'mongoose';
const pushSubscriptionSchema = new Schema({
    userId: { type: String }, // For user notifications - indexed below
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' }, // For user notifications - indexed below
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' }, // For staff notifications - indexed below
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: String,
}, { timestamps: true });
// Index for efficient lookups by user, reservation, or restaurant
pushSubscriptionSchema.index({ userId: 1, createdAt: -1 });
pushSubscriptionSchema.index({ reservationId: 1 });
pushSubscriptionSchema.index({ restaurantId: 1 });
export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);
