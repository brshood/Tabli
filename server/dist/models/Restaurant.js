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
            category: { type: String, enum: ['license', 'menu', 'other'], required: true, default: 'other' },
            menuType: { type: String, required: false },
            version: { type: Number, required: true, default: 1 },
            uploadedAt: { type: Date, required: true, default: Date.now },
            isActive: { type: Boolean, required: true, default: true },
        },
    ],
}, { timestamps: true });
export const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
