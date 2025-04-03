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
    // Initialize MongoDB connection - connection is handled on-demand
    // Don't force a connection here to avoid multiple connection attempts
    // Each method will ensure the connection before performing operations
  }
  
  // Helper method to ensure connection before running DB operations
  private async ensureConnection() {
    try {
      return await connectToMongoDB();
    } catch (err) {
      log(`MongoDB connection error: ${(err as Error).message}`, 'storage');
      throw new Error(`MongoDB connection failed: ${(err as Error).message}`);
    }
  }

  async getUser(id: any): Promise<User | undefined> {
    try {
      await this.ensureConnection();
      let user = null;
      
      // Handle numeric IDs (from the in-memory storage or imported data)
      if (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id)))) {
        const numericId = typeof id === 'number' ? id : parseInt(id);
        user = await UserModel.findOne({ id: numericId });
        
        if (user) {
          return convertDocument<User>(user);
        }
      }
      
      // If not found by numeric id or id is a string that looks like MongoDB ObjectId, try direct _id lookup
      try {
        // For MongoDB ObjectId strings or when passing the _id directly
        user = await UserModel.findById(id);
        if (user) {
          return convertDocument<User>(user);
        }
      } catch (err) {
        // Ignore this error, it's just a fallback attempt
      }
      
      // If we got this far, we couldn't find the user
      log(`User not found with id ${id} (type: ${typeof id})`, 'storage');
      return undefined;
    } catch (error) {
      log(`Error getting user: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      await this.ensureConnection();
      const user = await UserModel.findOne({ username });
      return convertDocument<User>(user);
    } catch (error) {
      log(`Error getting user by username: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      await this.ensureConnection();
      const user = await UserModel.findOne({ email });
      return convertDocument<User>(user);
    } catch (error) {
      log(`Error getting user by email: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      await this.ensureConnection();
      const newUser = new UserModel(user);
      await newUser.save();
      return convertDocument<User>(newUser)!;
    } catch (error) {
      log(`Error creating user: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateUser(id: any, userData: Partial<User>): Promise<User | undefined> {
    try {
      await this.ensureConnection();
      let updatedUser;
      
      // Handle MongoDB ObjectId strings
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        log(`Attempting to update user with MongoDB ObjectId: ${id}`, 'storage');
        updatedUser = await UserModel.findByIdAndUpdate(
          id,
          { $set: userData },
          { new: true }
        );
      } else {
        // Handle numeric IDs
        try {
          // Try by MongoDB's _id first
          updatedUser = await UserModel.findByIdAndUpdate(
            id,
            { $set: userData },
            { new: true }
          );
          
          // If not found, try by numeric id field
          if (!updatedUser) {
            const numId = parseInt(String(id), 10);
            if (!isNaN(numId)) {
              log(`User not found with _id ${id}, trying numeric id ${numId}`, 'storage');
              updatedUser = await UserModel.findOneAndUpdate(
                { id: numId },
                { $set: userData },
                { new: true }
              );
            }
          }
        } catch (err) {
          // Try one more approach with numeric id
          const numId = parseInt(String(id), 10);
          if (!isNaN(numId)) {
            log(`Error with _id update, trying numeric id ${numId}`, 'storage');
            updatedUser = await UserModel.findOneAndUpdate(
              { id: numId },
              { $set: userData },
              { new: true }
            );
          }
        }
      }
      
      if (!updatedUser) {
        log(`Could not find user with id ${id} to update`, 'storage');
        return undefined;
      }
      
      return convertDocument<User>(updatedUser);
    } catch (error) {
      log(`Error updating user: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getService(id: any): Promise<Service | undefined> {
    try {
      await this.ensureConnection();
      let service = null;
      
      // Try to find by MongoDB's _id directly
      try {
        service = await ServiceModel.findById(id);
        if (service) {
          return convertDocument<Service>(service);
        }
      } catch (err) {
        // If this fails, it might be a numeric ID
      }
      
      // If not found or error occurred, try by numeric id
      if (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id)))) {
        const numericId = typeof id === 'number' ? id : parseInt(id);
        service = await ServiceModel.findOne({ id: numericId });
        if (service) {
          return convertDocument<Service>(service);
        }
      }
      
      log(`Service not found with id ${id}`, 'storage');
      return undefined;
    } catch (error) {
      log(`Error getting service: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getServices(filters?: Partial<Service>): Promise<Service[]> {
    try {
      await this.ensureConnection();
      const services = await ServiceModel.find(filters || {});
      return convertDocuments<Service>(services);
    } catch (error) {
      log(`Error getting services: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserServices(userId: number): Promise<Service[]> {
    try {
      await this.ensureConnection();
      const services = await ServiceModel.find({ userId });
      return convertDocuments<Service>(services);
    } catch (error) {
      log(`Error getting user services: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createService(userId: number, service: InsertService): Promise<Service> {
    try {
      await this.ensureConnection();
      const newService = new ServiceModel({ ...service, userId });
      await newService.save();
      return convertDocument<Service>(newService)!;
    } catch (error) {
      log(`Error creating service: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateService(id: any, serviceData: Partial<Service>): Promise<Service | undefined> {
    try {
      await this.ensureConnection();
      let updatedService;
      
      // Try to update by MongoDB's _id directly
      try {
        updatedService = await ServiceModel.findByIdAndUpdate(
          id,
          { $set: serviceData },
          { new: true }
        );
        
        if (updatedService) {
          return convertDocument<Service>(updatedService);
        }
      } catch (err) {
        // If this fails, it might be a numeric ID
      }
      
      // If not found or error occurred, try by numeric id
      if (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id)))) {
        const numericId = typeof id === 'number' ? id : parseInt(id);
        updatedService = await ServiceModel.findOneAndUpdate(
          { id: numericId },
          { $set: serviceData },
          { new: true }
        );
        
        if (updatedService) {
          return convertDocument<Service>(updatedService);
        }
      }
      
      log(`Service not found with id ${id} to update`, 'storage');
      return undefined;
    } catch (error) {
      log(`Error updating service: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getJob(id: any): Promise<Job | undefined> {
    try {
      await this.ensureConnection();
      let job = null;
      
      // Try to find by MongoDB's _id directly
      try {
        job = await JobModel.findById(id);
        if (job) {
          return convertDocument<Job>(job);
        }
      } catch (err) {
        // If this fails, it might be a numeric ID
      }
      
      // If not found or error occurred, try by numeric id
      if (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id)))) {
        const numericId = typeof id === 'number' ? id : parseInt(id);
        job = await JobModel.findOne({ id: numericId });
        if (job) {
          return convertDocument<Job>(job);
        }
      }
      
      log(`Job not found with id ${id}`, 'storage');
      return undefined;
    } catch (error) {
      log(`Error getting job: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getJobs(filters?: Partial<Job>): Promise<Job[]> {
    try {
      await this.ensureConnection();
      const jobs = await JobModel.find(filters || {});
      return convertDocuments<Job>(jobs);
    } catch (error) {
      log(`Error getting jobs: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    try {
      await this.ensureConnection();
      const jobs = await JobModel.find({ userId });
      return convertDocuments<Job>(jobs);
    } catch (error) {
      log(`Error getting user jobs: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createJob(userId: number, job: InsertJob): Promise<Job> {
    try {
      await this.ensureConnection();
      const newJob = new JobModel({ ...job, userId });
      await newJob.save();
      return convertDocument<Job>(newJob)!;
    } catch (error) {
      log(`Error creating job: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateJob(id: any, jobData: Partial<Job>): Promise<Job | undefined> {
    try {
      await this.ensureConnection();
      let updatedJob;
      
      // Try to update by MongoDB's _id directly
      try {
        updatedJob = await JobModel.findByIdAndUpdate(
          id,
          { $set: jobData },
          { new: true }
        );
        
        if (updatedJob) {
          return convertDocument<Job>(updatedJob);
        }
      } catch (err) {
        // If this fails, it might be a numeric ID
      }
      
      // If not found or error occurred, try by numeric id
      if (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id)))) {
        const numericId = typeof id === 'number' ? id : parseInt(id);
        updatedJob = await JobModel.findOneAndUpdate(
          { id: numericId },
          { $set: jobData },
          { new: true }
        );
        
        if (updatedJob) {
          return convertDocument<Job>(updatedJob);
        }
      }
      
      log(`Job not found with id ${id} to update`, 'storage');
      return undefined;
    } catch (error) {
      log(`Error updating job: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    try {
      await this.ensureConnection();
      const applications = await ApplicationModel.find({ jobId });
      return convertDocuments<Application>(applications);
    } catch (error) {
      log(`Error getting applications for job: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserApplications(userId: number): Promise<Application[]> {
    try {
      await this.ensureConnection();
      const applications = await ApplicationModel.find({ userId });
      return convertDocuments<Application>(applications);
    } catch (error) {
      log(`Error getting user applications: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createApplication(userId: number, application: InsertApplication): Promise<Application> {
    try {
      await this.ensureConnection();
      const newApplication = new ApplicationModel({ ...application, userId });
      await newApplication.save();
      return convertDocument<Application>(newApplication)!;
    } catch (error) {
      log(`Error creating application: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }

  async updateApplicationStatus(
    id: any,
    status: "pending" | "approved" | "rejected"
  ): Promise<Application | undefined> {
    try {
      await this.ensureConnection();
      let updatedApplication;
      
      // Try to update by MongoDB's _id directly
      try {
        updatedApplication = await ApplicationModel.findByIdAndUpdate(
          id,
          { $set: { status } },
          { new: true }
        );
        
        if (updatedApplication) {
          return convertDocument<Application>(updatedApplication);
        }
      } catch (err) {
        // If this fails, it might be a numeric ID
      }
      
      // If not found or error occurred, try by numeric id
      if (typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id)))) {
        const numericId = typeof id === 'number' ? id : parseInt(id);
        updatedApplication = await ApplicationModel.findOneAndUpdate(
          { id: numericId },
          { $set: { status } },
          { new: true }
        );
        
        if (updatedApplication) {
          return convertDocument<Application>(updatedApplication);
        }
      }
      
      log(`Application not found with id ${id} to update status`, 'storage');
      return undefined;
    } catch (error) {
      log(`Error updating application status: ${(error as Error).message}`, 'storage');
      return undefined;
    }
  }

  async getOrdersForService(serviceId: number): Promise<Order[]> {
    try {
      await this.ensureConnection();
      const orders = await OrderModel.find({ serviceId });
      return convertDocuments<Order>(orders);
    } catch (error) {
      log(`Error getting orders for service: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    try {
      await this.ensureConnection();
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
      await this.ensureConnection();
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
      await this.ensureConnection();
      const reviews = await ReviewModel.find({ serviceId });
      return convertDocuments<Review>(reviews);
    } catch (error) {
      log(`Error getting reviews for service: ${(error as Error).message}`, 'storage');
      return [];
    }
  }

  async createReview(review: InsertReview): Promise<Review> {
    try {
      await this.ensureConnection();
      const newReview = new ReviewModel(review);
      await newReview.save();
      return convertDocument<Review>(newReview)!;
    } catch (error) {
      log(`Error creating review: ${(error as Error).message}`, 'storage');
      throw error;
    }
  }
}