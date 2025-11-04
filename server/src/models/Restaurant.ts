import mongoose, { Schema, Document, Model } from 'mongoose';

export interface DocumentRef {
  fileId: mongoose.Types.ObjectId;
  type: 'image' | 'pdf';
  filename: string;
  contentType: string;
  category: 'license' | 'menu' | 'profile-picture' | 'other';
  menuType?: string;
  version: number;
  uploadedAt: Date;
  isActive: boolean;
}

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
  profilePictureId?: mongoose.Types.ObjectId;
  mediaRefs?: DocumentRef[]; 
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
    profilePictureId: { type: Schema.Types.ObjectId, required: false },
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
  },
  { timestamps: true }
);

export const Restaurant: Model<RestaurantDocument> =
  mongoose.models.Restaurant || mongoose.model<RestaurantDocument>('Restaurant', restaurantSchema);





