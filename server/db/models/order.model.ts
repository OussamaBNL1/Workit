import mongoose, { Schema, Document } from 'mongoose';
import { Order } from '@shared/schema';

export interface IOrder extends Document, Omit<Order, 'id'> {
  // MongoDB will use _id, but we'll map it to id
}

const OrderSchema: Schema = new Schema({
  buyerId: { type: Number, required: true, index: true },
  sellerId: { type: Number, required: true, index: true },
  serviceId: { type: Number, required: true, index: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['credit_card', 'paypal', 'bank_transfer'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'pending' },
  requirements: { type: String, default: '' },
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

// Create indexes for filtering orders
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ createdAt: 1 });

// Export the model or create it if it doesn't exist
export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);