import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';
import { IJob } from './job.model';

// Interface representing an application document in MongoDB
export interface IApplication extends Document {
  id: number;
  jobId: number | IJob;
  userId: number | IUser;
  description: string;
  resumeFile?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

// Create the application schema
const ApplicationSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  jobId: { type: Number, required: true, ref: 'Job' },
  userId: { type: Number, required: true, ref: 'User' },
  description: { type: String, required: true },
  resumeFile: { type: String, default: null },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
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
ApplicationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: 'id',
  justOne: true
});

// Virtual for job data
ApplicationSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: 'id',
  justOne: true
});

// Create and export the model
export default mongoose.model<IApplication>('Application', ApplicationSchema);