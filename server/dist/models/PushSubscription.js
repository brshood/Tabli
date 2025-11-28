import mongoose, { Schema } from 'mongoose';
const pushSubscriptionSchema = new Schema({
    userId: { type: String, index: true }, // Index for finding by user
    reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', index: true },
    endpoint: { type: String, required: true, unique: true, index: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
    },
    userAgent: String,
}, { timestamps: true });
// Index for efficient lookups by user or reservation
pushSubscriptionSchema.index({ userId: 1, createdAt: -1 });
pushSubscriptionSchema.index({ reservationId: 1 });
export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);
