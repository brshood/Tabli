import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['staff', 'admin'], default: 'staff' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
}, { timestamps: true });
export const User = mongoose.models.User || mongoose.model('User', userSchema);
