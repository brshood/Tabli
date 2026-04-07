import mongoose, { Schema } from 'mongoose';
const restaurantSchema = new Schema({
    name: { type: String, required: true },
    city: { type: String, enum: ['Al Ain', 'Abu Dhabi', 'Dubai'], required: true },
    cuisine: { type: String, required: true },
    phone: String,
    email: String,
    description: String,
    address: String,
    locationUrl: String,
    openingHours: String,
    closingHours: String,
    priceRange: String,
    menu: [
        {
            name: { type: String, required: true },
            category: { type: String, required: true },
            description: { type: String, required: false },
            price: { type: String, required: true },
        },
    ],
    featuredMenuItems: [
        {
            name: { type: String, required: true },
            description: { type: String, required: false },
            price: { type: String, required: false },
        },
    ],
    profilePictureId: { type: Schema.Types.ObjectId, required: false },
    featuredImageFileId: { type: Schema.Types.ObjectId, required: false },
    mediaRefs: [
        {
            fileId: { type: Schema.Types.ObjectId, required: true },
            type: { type: String, enum: ['image', 'pdf'], required: true },
            filename: { type: String, required: true },
            contentType: { type: String, required: true },
            category: { type: String, enum: ['license', 'menu', 'profile-picture', 'other'], required: true, default: 'other' },
            menuType: { type: String, required: false },
            version: { type: Number, required: true, default: 1 },
            uploadedAt: { type: Date, required: true, default: Date.now },
            isActive: { type: Boolean, required: true, default: true },
        },
    ],
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        required: true,
        default: 'pending',
        index: true,
    },
    approvalNotes: { type: String, required: false },
    // SMS notification settings
    notificationPhones: [{ type: String }], // History of phone numbers
    activeNotificationPhone: { type: String }, // Currently selected phone
    // Staff occupancy overrides
    indoorFull: { type: Boolean, default: false },
    outdoorFull: { type: Boolean, default: false },
    waitTimeMinMinutes: { type: Number, min: 0, max: 300 },
    waitTimeMaxMinutes: { type: Number, min: 0, max: 300 },
    waitTimeDisplayText: { type: String, maxlength: 100 },
}, { timestamps: true });
export const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);
