import mongoose, { Schema } from 'mongoose';
const tableSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['available', 'occupied', 'cleaning'], default: 'available', index: true },
    currentReservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
}, { timestamps: true });
export const Table = mongoose.models.Table || mongoose.model('Table', tableSchema);
