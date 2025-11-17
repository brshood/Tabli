import { ObjectId } from 'mongodb';
import { getGridFsBucket } from '../db/gridfs';
import { Restaurant } from '../models/Restaurant';
import { Table } from '../models/Table';
import { Reservation } from '../models/Reservation';
import { Rating } from '../models/Rating';
import { User } from '../models/User';

export async function deleteRestaurantProfile(restaurantId: string | ObjectId) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) {
    return null;
  }

  const bucket = getGridFsBucket();
  const mediaRefs = restaurant.mediaRefs || [];

  await Promise.all(
    mediaRefs.map(async (doc) => {
      try {
        const fileId = doc.fileId ? new ObjectId(doc.fileId.toString()) : null;
        if (fileId) {
          await bucket.delete(fileId);
        }
      } catch (err) {
        console.warn('Failed to delete media file', doc.fileId?.toString(), err);
      }
    })
  );

  await Promise.all([
    Table.deleteMany({ restaurantId: restaurant._id }),
    Reservation.deleteMany({ restaurantId: restaurant._id }),
    Rating.deleteMany({ restaurantId: restaurant._id }),
    User.deleteMany({ restaurantId: restaurant._id }),
  ]);

  await Restaurant.findByIdAndDelete(restaurant._id);

  return restaurant;
}

