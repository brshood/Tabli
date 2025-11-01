import mongoose, { Schema } from 'mongoose';
const reservationSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
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
}, { timestamps: true });
export const Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
