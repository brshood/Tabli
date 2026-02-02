import mongoose, { Schema } from 'mongoose';
const tableSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    status: { type: String, enum: ['available', 'occupied', 'cleaning'], default: 'available', index: true },
    location: { type: String, enum: ['indoor', 'outdoor'], default: 'indoor' },
    currentReservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
}, { timestamps: true });
// Compound indexes for better query performance
tableSchema.index({ restaurantId: 1, status: 1 }); // For filtering available/occupied tables by restaurant
tableSchema.index({ currentReservationId: 1 }); // For reverse lookups from reservation to table
export const Table = mongoose.models.Table || mongoose.model('Table', tableSchema);
