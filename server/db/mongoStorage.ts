import mongoose from 'mongoose';
import { IStorage } from '../storage';
import { 
  User, InsertUser, 
  Service, InsertService, 
  Job, InsertJob, 
  Application, InsertApplication, 
  Order, InsertOrder, 
  Review, InsertReview 
} from '@shared/schema';
import UserModel from './models/user.model';
import ServiceModel from './models/service.model';
import JobModel from './models/job.model';
import ApplicationModel from './models/application.model';
import OrderModel from './models/order.model';
import ReviewModel from './models/review.model';
import { connectToMongoDB } from './mongodb';
import { log } from '../vite';

/**
 * Helper to convert MongoDB document to a plain object 
 */
function convertDocument<T>(doc: mongoose.Document | null): T | undefined {
  if (!doc) return undefined;
  return doc.toObject() as T;
}

/**
 * Helper to convert array of MongoDB documents to plain objects
 */
function convertDocuments<T>(docs: mongoose.Document[]): T[] {
  return docs.map(doc => doc.toObject() as T);
}

/**
 * MongoDB implementation of the IStorage interface
 */
export class MongoStorage implements IStorage {
  constructor() {
    // Initialize MongoDB connection
    connectToMongoDB().catch(err => {
      log(`MongoDB connection error: ${err.message}`, 'storage');
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await UserModel.findById(id);
      return convertDocument<User>(user);
    } catch (error) {
      log(`Error getting user: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ username });
      return convertDocument<User>(user);
    } catch (error) {
      log(`Error getting user by username: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ email });
      return convertDocument<User>(user);
    } catch (error) {
      log(`Error getting user by email: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const newUser = new UserModel(user);
      await newUser.save();
      return convertDocument<User>(newUser)!;
    } catch (error) {
      log(`Error creating user: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const updatedUser = await UserModel.findByIdAndUpdate(
        id,
        { $set: userData },
        { new: true }
      );
      return convertDocument<User>(updatedUser);
    } catch (error) {
      log(`Error updating user: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    try {
      const service = await ServiceModel.findById(id);
      return convertDocument<Service>(service);
    } catch (error) {
      log(`Error getting service: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getServices(filters?: Partial<Service>): Promise<Service[]> {
    try {
      const services = await ServiceModel.find(filters || {});
      return convertDocuments<Service>(services);
    } catch (error) {
      log(`Error getting services: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserServices(userId: number): Promise<Service[]> {
    try {
      const services = await ServiceModel.find({ userId });
      return convertDocuments<Service>(services);
    } catch (error) {
      log(`Error getting user services: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createService(userId: number, service: InsertService): Promise<Service> {
    try {
      const newService = new ServiceModel({ ...service, userId });
      await newService.save();
      return convertDocument<Service>(newService)!;
    } catch (error) {
      log(`Error creating service: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    try {
      const updatedService = await ServiceModel.findByIdAndUpdate(
        id,
        { $set: serviceData },
        { new: true }
      );
      return convertDocument<Service>(updatedService);
    } catch (error) {
      log(`Error updating service: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getJob(id: number): Promise<Job | undefined> {
    try {
      const job = await JobModel.findById(id);
      return convertDocument<Job>(job);
    } catch (error) {
      log(`Error getting job: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getJobs(filters?: Partial<Job>): Promise<Job[]> {
    try {
      const jobs = await JobModel.find(filters || {});
      return convertDocuments<Job>(jobs);
    } catch (error) {
      log(`Error getting jobs: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    try {
      const jobs = await JobModel.find({ userId });
      return convertDocuments<Job>(jobs);
    } catch (error) {
      log(`Error getting user jobs: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createJob(userId: number, job: InsertJob): Promise<Job> {
    try {
      const newJob = new JobModel({ ...job, userId });
      await newJob.save();
      return convertDocument<Job>(newJob)!;
    } catch (error) {
      log(`Error creating job: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateJob(id: number, jobData: Partial<Job>): Promise<Job | undefined> {
    try {
      const updatedJob = await JobModel.findByIdAndUpdate(
        id,
        { $set: jobData },
        { new: true }
      );
      return convertDocument<Job>(updatedJob);
    } catch (error) {
      log(`Error updating job: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    try {
      const applications = await ApplicationModel.find({ jobId });
      return convertDocuments<Application>(applications);
    } catch (error) {
      log(`Error getting applications for job: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserApplications(userId: number): Promise<Application[]> {
    try {
      const applications = await ApplicationModel.find({ userId });
      return convertDocuments<Application>(applications);
    } catch (error) {
      log(`Error getting user applications: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createApplication(userId: number, application: InsertApplication): Promise<Application> {
    try {
      const newApplication = new ApplicationModel({ ...application, userId });
      await newApplication.save();
      return convertDocument<Application>(newApplication)!;
    } catch (error) {
      log(`Error creating application: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateApplicationStatus(
    id: number,
    status: "pending" | "approved" | "rejected"
  ): Promise<Application | undefined> {
    try {
      const updatedApplication = await ApplicationModel.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true }
      );
      return convertDocument<Application>(updatedApplication);
    } catch (error) {
      log(`Error updating application status: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getOrdersForService(serviceId: number): Promise<Order[]> {
    try {
      const orders = await OrderModel.find({ serviceId });
      return convertDocuments<Order>(orders);
    } catch (error) {
      log(`Error getting orders for service: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    try {
      const orders = await OrderModel.find({
        $or: [{ buyerId: userId }, { sellerId: userId }]
      });
      return convertDocuments<Order>(orders);
    } catch (error) {
      log(`Error getting user orders: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createOrder(order: InsertOrder & { sellerId: number }): Promise<Order> {
    try {
      const newOrder = new OrderModel(order);
      await newOrder.save();
      return convertDocument<Order>(newOrder)!;
    } catch (error) {
      log(`Error creating order: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async getReviewsForService(serviceId: number): Promise<Review[]> {
    try {
      const reviews = await ReviewModel.find({ serviceId });
      return convertDocuments<Review>(reviews);
    } catch (error) {
      log(`Error getting reviews for service: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      const newReview = new ReviewModel(review);
      await newReview.save();
      return convertDocument<Review>(newReview)!;
    } catch (error) {
      log(`Error creating review: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }
}