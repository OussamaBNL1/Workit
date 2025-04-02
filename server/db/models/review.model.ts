import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';
import { IService } from './service.model';

// Interface representing a review document in MongoDB
export interface IReview extends Document {
  id: number;
  serviceId: number | IService;
  userId: number | IUser;
  rating: number;
  comment?: string;
  createdAt: Date;
}

// Create the review schema
const ReviewSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  serviceId: { type: Number, required: true, ref: 'Service' },
  userId: { type: Number, required: true, ref: 'User' },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  comment: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, {
  // Add virtual fields for populating related data
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret.id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

// Virtual for user data
ReviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

// Virtual for service data
ReviewSchema.virtual('service', {
  ref: 'Service',
  localField: 'serviceId',
  foreignField: 'id',
  justOne: true
});

// Create and export the model
export default mongoose.model<IReview>('Review', ReviewSchema);