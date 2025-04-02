import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';

// Interface representing a service document in MongoDB
export interface IService extends Document {
  id: number;
  userId: number | IUser;
  title: string;
  description: string;
  price: number;
  category: string;
  status: 'active' | 'inactive';
  image?: string;
  deliveryTime?: string;
  createdAt: Date;
}

// Create the service schema
const ServiceSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'inactive'],
    default: 'active' 
  },
  image: { type: String, default: null },
  deliveryTime: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, {
  // Add virtual fields for populating user data
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
ServiceSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

// Create and export the model
export default mongoose.model<IService>('Service', ServiceSchema);