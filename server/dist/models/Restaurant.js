import mongoose, { Schema } from 'mongoose';
const restaurantSchema = new Schema({
    name: { type: String, required: true },
    city: { type: String, enum: ['Al Ain', 'Abu Dhabi', 'Dubai'], required: true },
    cuisine: { type: String, required: true },
    phone: String,
    email: String,
    description: String,
    address: String,
    openingHours: String,
    closingHours: String,
    priceRange: String,
    mediaRefs: [
        {
            fileId: { type: Schema.Types.ObjectId, required: true },
            type: { type: String, enum: ['image', 'pdf'], required: true },
            filename: { type: String, required: true },
            contentType: { type: String, required: true },
        },
    ],
}, { timestamps: true });
export const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
