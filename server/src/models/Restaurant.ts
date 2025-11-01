import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RestaurantDocument extends Document {
  name: string;
  city: 'Al Ain' | 'Abu Dhabi' | 'Dubai';
  cuisine: string;
  phone?: string;
  email?: string;
  description?: string;
  address?: string;
  openingHours?: string;
  closingHours?: string;
  priceRange?: string;
  mediaRefs?: Array<{ fileId: mongoose.Types.ObjectId; type: 'image' | 'pdf'; filename: string; contentType: string }>; 
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<RestaurantDocument>(
  {
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
  },
  { timestamps: true }
);

export const Restaurant: Model<RestaurantDocument> =
  mongoose.models.Restaurant || mongoose.model<RestaurantDocument>('Restaurant', restaurantSchema);





