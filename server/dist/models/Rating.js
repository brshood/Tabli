import mongoose, { Schema } from 'mongoose';
const ratingSchema = new Schema({
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    value: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    name: { type: String },
    email: { type: String, index: true },
    phone: { type: String, index: true },
    showName: { type: Boolean, default: false },
}, { timestamps: true });
export const Rating = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);
