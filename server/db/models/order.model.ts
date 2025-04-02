import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';
import { IService } from './service.model';

// Interface representing an order document in MongoDB
export interface IOrder extends Document {
  id: number;
  serviceId: number | IService;
  buyerId: number | IUser;
  sellerId: number | IUser;
  paymentMethod: 'card' | 'bank_transfer';
  totalPrice: number;
  status: string;
  createdAt: Date;
}

// Create the order schema
const OrderSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  serviceId: { type: Number, required: true, ref: 'Service' },
  buyerId: { type: Number, required: true, ref: 'User' },
  sellerId: { type: Number, required: true, ref: 'User' },
  paymentMethod: { 
    type: String, 
    required: true, 
    enum: ['card', 'bank_transfer']
  },
  totalPrice: { type: Number, required: true },
  status: { 
    type: String, 
    required: true,
    default: 'pending',
    enum: ['pending', 'paid', 'completed', 'cancelled', 'refunded']
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

// Virtual for service data
OrderSchema.virtual('service', {
  ref: 'Service',
  localField: 'serviceId',
  foreignField: 'id',
  justOne: true
});

// Virtual for buyer data
OrderSchema.virtual('buyer', {
  ref: 'User',
  localField: 'buyerId',
  foreignField: 'id',
  justOne: true
});

// Virtual for seller data
OrderSchema.virtual('seller', {
  ref: 'User',
  localField: 'sellerId',
  foreignField: 'id',
  justOne: true
});

// Create and export the model
export default mongoose.model<IOrder>('Order', OrderSchema);