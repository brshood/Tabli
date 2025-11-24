import mongoose, { Schema } from 'mongoose';
const menuItemSchema = new Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: false },
    price: { type: String, required: true },
}, { _id: false });
const menuSchema = new Schema({
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        unique: true
    },
    items: [menuItemSchema],
}, { timestamps: true });
// Note: The unique: true constraint on restaurantId already creates an index automatically
export const Menu = mongoose.models.Menu || mongoose.model('Menu', menuSchema);
