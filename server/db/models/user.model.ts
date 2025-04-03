import mongoose, { Schema, Document } from 'mongoose';
import { User } from '@shared/schema';

export interface IUser extends Document, Omit<User, 'id'> {
  // MongoDB will use _id, but we'll map it to id
}

const UserSchema: Schema = new Schema({
  // For compatibility with numeric IDs (from in-memory storage or imported data)
  id: { type: Number, sparse: true },
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
      if (!ret.id) {
        ret.id = ret._id;
      }
      delete ret.password; // Remove password
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_, ret) => {
      if (!ret.id) {
        ret.id = ret._id;
      }
      delete ret.password; // Remove password
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create text index for searching users by name
// We don't redefine username and email indexes as they're already set with unique: true above
UserSchema.index({ fullName: 'text' });
UserSchema.index({ role: 1 });
UserSchema.index({ skills: 1 });

// Export the model or create it if it doesn't exist
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);