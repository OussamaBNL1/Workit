import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';

// Interface representing a job document in MongoDB
export interface IJob extends Document {
  id: number;
  userId: number | IUser;
  title: string;
  description: string;
  budget: number;
  category: string;
  location?: string;
  jobType: string;
  status: 'open' | 'closed';
  image?: string;
  createdAt: Date;
}

// Create the job schema
const JobSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  budget: { type: Number, required: true },
  category: { type: String, required: true },
  location: { type: String, default: null },
  jobType: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['open', 'closed'],
    default: 'open'
  },
  image: { type: String, default: null },
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
JobSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

// Create and export the model
export default mongoose.model<IJob>('Job', JobSchema);