import mongoose, { Schema, Document, Model } from 'mongoose';

export interface MenuItem {
  name: string;
  category: string;
  description?: string;
  price: string;
}

export interface MenuDocument extends Document {
  restaurantId: mongoose.Types.ObjectId;
  items: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: false },
    price: { type: String, required: true },
  },
  { _id: false }
);

const menuSchema = new Schema<MenuDocument>(
  {
    restaurantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Restaurant', 
      required: true, 
      unique: true,
      index: true 
    },
    items: [menuItemSchema],
  },
  { timestamps: true }
);

// Compound index for faster queries
menuSchema.index({ restaurantId: 1 });

export const Menu: Model<MenuDocument> =
  mongoose.models.Menu || mongoose.model<MenuDocument>('Menu', menuSchema);

