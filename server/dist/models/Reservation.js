import mongoose, { Schema } from 'mongoose';
const reservationSchema = new Schema({
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
    emailSent: { type: Boolean, default: false }, // #3 - Track if confirmation email was sent
    holdUntil: Date, // #2 - When hold expires (15 min from check-in)
    holdStatus: { type: String, enum: ['active', 'expired', 'confirmed'] }, // #2 - Hold state tracking
    cancellationReason: { type: String, enum: ['user_cancelled', 'daily_reset', 'no_show', 'hold_expired', 'staff_removed', 'called_list_expired', 'called_list_cleared'] }, // Track why reservation was cancelled
    // Survey feedback fields
    surveyFeedback: {
        hearAboutUs: String,
        specialRequirements: String,
        improvements: String,
        submittedAt: Date,
    },
    customerNotes: { type: String, maxlength: 500 },
    arrivedAt: Date,
}, { timestamps: true });
// Compound indexes for better query performance
reservationSchema.index({ restaurantId: 1, status: 1 }); // For filtering by restaurant and status
reservationSchema.index({ tableId: 1 }); // For lookups by table
reservationSchema.index({ seatedAt: 1 }); // For analytics queries on seated time
reservationSchema.index({ requestedAt: 1 }); // For analytics queries on request time
reservationSchema.index({ restaurantId: 1, mode: 1, status: 1 }); // For waitlist queries
export const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
