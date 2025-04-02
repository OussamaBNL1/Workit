import mongoose, { Schema, Document } from 'mongoose';
import { User } from '@shared/schema';

export interface IUser extends Document, Omit<User, 'id'> {
  // MongoDB will use _id, but we'll map it to id
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['freelancer', 'employer'], required: true },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  skills: { type: [String], default: [] },
  location: { type: String, default: '' },
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.password; // Remove password
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.password; // Remove password
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create indexes for searching users
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ fullName: 'text' });
UserSchema.index({ role: 1 });
UserSchema.index({ skills: 1 });

// Export the model or create it if it doesn't exist
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);