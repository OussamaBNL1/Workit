import mongoose from 'mongoose';
import { connectToMongoDB } from './mongodb';
import { IStorage } from '../storage';
import {
  User, InsertUser,
  Service, InsertService,
  Job, InsertJob,
  Application, InsertApplication,
  Order, InsertOrder,
  Review, InsertReview
} from '@shared/schema';

// Import models
import UserModel from './models/user.model';
import ServiceModel from './models/service.model';
import JobModel from './models/job.model';
import ApplicationModel from './models/application.model';
import OrderModel from './models/order.model';
import ReviewModel from './models/review.model';

/**
 * Helper to convert MongoDB document to a plain object 
 */
function convertDocument<T>(doc: mongoose.Document | null): T | undefined {
  if (!doc) return undefined;
  return doc.toObject() as unknown as T;
}

/**
 * Helper to convert array of MongoDB documents to plain objects
 */
function convertDocuments<T>(docs: mongoose.Document[]): T[] {
  return docs.map(doc => doc.toObject() as unknown as T);
}

/**
 * MongoDB implementation of the IStorage interface
 */
export class MongoStorage implements IStorage {
  constructor() {
    // Connect to MongoDB when the storage is initialized
    connectToMongoDB().catch(err => {
      console.error('Failed to connect to MongoDB:', err);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await UserModel.findOne({ id });
    return convertDocument<User>(user);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return convertDocument<User>(user);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email });
    return convertDocument<User>(user);
  }

  async createUser(user: InsertUser): Promise<User> {
    // Find the highest ID and increment
    const maxUser = await UserModel.findOne({}).sort({ id: -1 });
    const id = maxUser ? maxUser.id + 1 : 1;
    
    const newUser = new UserModel({
      ...user,
      id,
      bio: user.bio || null,
      profilePicture: user.profilePicture || null,
      createdAt: new Date()
    });
    
    await newUser.save();
    return convertDocument<User>(newUser)!;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate(
      { id },
      { $set: userData },
      { new: true }
    );
    return convertDocument<User>(user);
  }

  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    const service = await ServiceModel.findOne({ id });
    return convertDocument<Service>(service);
  }

  async getServices(filters?: Partial<Service>): Promise<Service[]> {
    const query = filters ? { ...filters } : {};
    const services = await ServiceModel.find(query);
    return convertDocuments<Service>(services);
  }

  async getUserServices(userId: number): Promise<Service[]> {
    const services = await ServiceModel.find({ userId });
    return convertDocuments<Service>(services);
  }

  async createService(userId: number, service: InsertService): Promise<Service> {
    // Find the highest ID and increment
    const maxService = await ServiceModel.findOne({}).sort({ id: -1 });
    const id = maxService ? maxService.id + 1 : 1;
    
    const newService = new ServiceModel({
      ...service,
      id,
      userId,
      status: service.status || 'active',
      image: service.image || null,
      deliveryTime: service.deliveryTime || null,
      createdAt: new Date()
    });
    
    await newService.save();
    return convertDocument<Service>(newService)!;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const service = await ServiceModel.findOneAndUpdate(
      { id },
      { $set: serviceData },
      { new: true }
    );
    return convertDocument<Service>(service);
  }

  // Job methods
  async getJob(id: number): Promise<Job | undefined> {
    const job = await JobModel.findOne({ id });
    return convertDocument<Job>(job);
  }

  async getJobs(filters?: Partial<Job>): Promise<Job[]> {
    const query = filters ? { ...filters } : {};
    const jobs = await JobModel.find(query);
    return convertDocuments<Job>(jobs);
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    const jobs = await JobModel.find({ userId });
    return convertDocuments<Job>(jobs);
  }

  async createJob(userId: number, job: InsertJob): Promise<Job> {
    // Find the highest ID and increment
    const maxJob = await JobModel.findOne({}).sort({ id: -1 });
    const id = maxJob ? maxJob.id + 1 : 1;
    
    const newJob = new JobModel({
      ...job,
      id,
      userId,
      status: job.status || 'open',
      image: job.image || null,
      location: job.location || null,
      createdAt: new Date()
    });
    
    await newJob.save();
    return convertDocument<Job>(newJob)!;
  }

  async updateJob(id: number, jobData: Partial<Job>): Promise<Job | undefined> {
    const job = await JobModel.findOneAndUpdate(
      { id },
      { $set: jobData },
      { new: true }
    );
    return convertDocument<Job>(job);
  }

  // Application methods
  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    const applications = await ApplicationModel.find({ jobId });
    return convertDocuments<Application>(applications);
  }

  async getUserApplications(userId: number): Promise<Application[]> {
    const applications = await ApplicationModel.find({ userId });
    return convertDocuments<Application>(applications);
  }

  async createApplication(userId: number, application: InsertApplication): Promise<Application> {
    // Find the highest ID and increment
    const maxApplication = await ApplicationModel.findOne({}).sort({ id: -1 });
    const id = maxApplication ? maxApplication.id + 1 : 1;
    
    const newApplication = new ApplicationModel({
      ...application,
      id,
      userId,
      status: 'pending',
      resumeFile: application.resumeFile || null,
      createdAt: new Date()
    });
    
    await newApplication.save();
    return convertDocument<Application>(newApplication)!;
  }

  async updateApplicationStatus(id: number, status: string): Promise<Application | undefined> {
    // Validate that status is one of the allowed values
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new Error(`Invalid application status: ${status}`);
    }
    
    const application = await ApplicationModel.findOneAndUpdate(
      { id },
      { $set: { status } },
      { new: true }
    );
    return convertDocument<Application>(application);
  }

  // Order methods
  async getOrdersForService(serviceId: number): Promise<Order[]> {
    const orders = await OrderModel.find({ serviceId });
    return convertDocuments<Order>(orders);
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    const orders = await OrderModel.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    });
    return convertDocuments<Order>(orders);
  }

  async createOrder(order: InsertOrder & { sellerId: number }): Promise<Order> {
    // Find the highest ID and increment
    const maxOrder = await OrderModel.findOne({}).sort({ id: -1 });
    const id = maxOrder ? maxOrder.id + 1 : 1;
    
    const newOrder = new OrderModel({
      ...order,
      id,
      status: 'pending', // Default status for new orders
      createdAt: new Date()
    });
    
    await newOrder.save();
    return convertDocument<Order>(newOrder)!;
  }

  // Review methods
  async getReviewsForService(serviceId: number): Promise<Review[]> {
    const reviews = await ReviewModel.find({ serviceId });
    return convertDocuments<Review>(reviews);
  }

  async createReview(review: InsertReview): Promise<Review> {
    // Find the highest ID and increment
    const maxReview = await ReviewModel.findOne({}).sort({ id: -1 });
    const id = maxReview ? maxReview.id + 1 : 1;
    
    const newReview = new ReviewModel({
      ...review,
      id,
      comment: review.comment || null,
      createdAt: new Date()
    });
    
    await newReview.save();
    return convertDocument<Review>(newReview)!;
  }
}