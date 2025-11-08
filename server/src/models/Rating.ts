import mongoose, { Schema, Document, Model } from 'mongoose';

export interface RatingDocument extends Document {
  restaurantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  value: number; // 1-5
  comment?: string;
  name?: string;
  email?: string;
  phone?: string;
  showName?: boolean; // User consent to display name publicly
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema = new Schema<RatingDocument>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    value: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    name: { type: String },
    email: { type: String, index: true },
    phone: { type: String, index: true },
    showName: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Rating: Model<RatingDocument> =
  mongoose.models.Rating || mongoose.model<RatingDocument>('Rating', ratingSchema);


