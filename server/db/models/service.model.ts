import mongoose, { Schema, Document } from 'mongoose';
import { Service } from '@shared/schema';

export interface IService extends Document, Omit<Service, 'id'> {
  // MongoDB will use _id, but we'll map it to id
}

const ServiceSchema: Schema = new Schema({
  userId: { type: Number, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  deliveryTime: { type: String, required: true },
  images: { type: [String], default: [] },
  status: { type: String, enum: ['active', 'paused', 'deleted'], default: 'active' },
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create indexes for search and filtering
ServiceSchema.index({ title: 'text', description: 'text' });
ServiceSchema.index({ category: 1 });
ServiceSchema.index({ price: 1 });
ServiceSchema.index({ status: 1 });

// Export the model or create it if it doesn't exist
export default mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);