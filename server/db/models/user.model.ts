import mongoose, { Document, Schema } from 'mongoose';

// Interface representing a user document in MongoDB
export interface IUser extends Document {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'freelancer' | 'employer';
  bio?: string;
  profilePicture?: string;
  createdAt: Date;
}

// Create the user schema
const UserSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['freelancer', 'employer'] 
  },
  bio: { type: String, default: null },
  profilePicture: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, {
  // Convert _id to id when converting to JSON
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret.id;
      delete ret._id;
      delete ret.__v;
      // Don't return password in JSON
      delete ret.password;
    }
  }
});

// Create and export the model
export default mongoose.model<IUser>('User', UserSchema);