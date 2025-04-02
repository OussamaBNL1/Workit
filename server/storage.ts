import {
  users,
  services,
  jobs,
  applications,
  orders,
  reviews,
  type User,
  type InsertUser,
  type Service,
  type InsertService,
  type Job,
  type InsertJob,
  type Application,
  type InsertApplication,
  type Order,
  type InsertOrder,
  type Review,
  type InsertReview,
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Service related methods
  getService(id: number): Promise<Service | undefined>;
  getServices(filters?: Partial<Service>): Promise<Service[]>;
  getUserServices(userId: number): Promise<Service[]>;
  createService(userId: number, service: InsertService): Promise<Service>;
  updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined>;
  
  // Job related methods
  getJob(id: number): Promise<Job | undefined>;
  getJobs(filters?: Partial<Job>): Promise<Job[]>;
  getUserJobs(userId: number): Promise<Job[]>;
  createJob(userId: number, job: InsertJob): Promise<Job>;
  updateJob(id: number, jobData: Partial<Job>): Promise<Job | undefined>;
  
  // Application related methods
  getApplicationsForJob(jobId: number): Promise<Application[]>;
  getUserApplications(userId: number): Promise<Application[]>;
  createApplication(userId: number, application: InsertApplication): Promise<Application>;
  updateApplicationStatus(id: number, status: string): Promise<Application | undefined>;
  
  // Order related methods
  getOrdersForService(serviceId: number): Promise<Order[]>;
  getUserOrders(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder & { sellerId: number }): Promise<Order>;
  
  // Review related methods
  getReviewsForService(serviceId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private services: Map<number, Service>;
  private jobs: Map<number, Job>;
  private applications: Map<number, Application>;
  private orders: Map<number, Order>;
  private reviews: Map<number, Review>;
  
  private currentUserId: number;
  private currentServiceId: number;
  private currentJobId: number;
  private currentApplicationId: number;
  private currentOrderId: number;
  private currentReviewId: number;

  constructor() {
    this.users = new Map();
    this.services = new Map();
    this.jobs = new Map();
    this.applications = new Map();
    this.orders = new Map();
    this.reviews = new Map();
    
    this.currentUserId = 1;
    this.currentServiceId = 1;
    this.currentJobId = 1;
    this.currentApplicationId = 1;
    this.currentOrderId = 1;
    this.currentReviewId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }
  
  async getServices(filters?: Partial<Service>): Promise<Service[]> {
    let services = Array.from(this.services.values());
    
    if (filters) {
      services = services.filter(service => {
        return Object.entries(filters).every(([key, value]) => {
          return service[key as keyof Service] === value;
        });
      });
    }
    
    return services;
  }
  
  async getUserServices(userId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(
      (service) => service.userId === userId,
    );
  }
  
  async createService(userId: number, service: InsertService): Promise<Service> {
    const id = this.currentServiceId++;
    const createdAt = new Date();
    const newService: Service = { ...service, id, userId, createdAt };
    this.services.set(id, newService);
    return newService;
  }
  
  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const existingService = this.services.get(id);
    if (!existingService) {
      return undefined;
    }
    
    const updatedService = { ...existingService, ...serviceData };
    this.services.set(id, updatedService);
    return updatedService;
  }

  // Job methods
  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }
  
  async getJobs(filters?: Partial<Job>): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values());
    
    if (filters) {
      jobs = jobs.filter(job => {
        return Object.entries(filters).every(([key, value]) => {
          return job[key as keyof Job] === value;
        });
      });
    }
    
    return jobs;
  }
  
  async getUserJobs(userId: number): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(
      (job) => job.userId === userId,
    );
  }
  
  async createJob(userId: number, job: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const createdAt = new Date();
    const newJob: Job = { ...job, id, userId, createdAt };
    this.jobs.set(id, newJob);
    return newJob;
  }
  
  async updateJob(id: number, jobData: Partial<Job>): Promise<Job | undefined> {
    const existingJob = this.jobs.get(id);
    if (!existingJob) {
      return undefined;
    }
    
    const updatedJob = { ...existingJob, ...jobData };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  // Application methods
  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (application) => application.jobId === jobId,
    );
  }
  
  async getUserApplications(userId: number): Promise<Application[]> {
    return Array.from(this.applications.values()).filter(
      (application) => application.userId === userId,
    );
  }
  
  async createApplication(userId: number, application: InsertApplication): Promise<Application> {
    const id = this.currentApplicationId++;
    const createdAt = new Date();
    const newApplication: Application = { 
      ...application, 
      id, 
      userId, 
      createdAt,
      status: "pending"
    };
    this.applications.set(id, newApplication);
    return newApplication;
  }
  
  async updateApplicationStatus(id: number, status: string): Promise<Application | undefined> {
    const existingApplication = this.applications.get(id);
    if (!existingApplication) {
      return undefined;
    }
    
    const updatedApplication = { ...existingApplication, status };
    this.applications.set(id, updatedApplication);
    return updatedApplication;
  }

  // Order methods
  async getOrdersForService(serviceId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.serviceId === serviceId,
    );
  }
  
  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.buyerId === userId || order.sellerId === userId,
    );
  }
  
  async createOrder(order: InsertOrder & { sellerId: number }): Promise<Order> {
    const id = this.currentOrderId++;
    const createdAt = new Date();
    const newOrder: Order = { ...order, id, createdAt };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  // Review methods
  async getReviewsForService(serviceId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.serviceId === serviceId,
    );
  }
  
  async createReview(review: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const createdAt = new Date();
    const newReview: Review = { ...review, id, createdAt };
    this.reviews.set(id, newReview);
    return newReview;
  }
}

// Import MongoDB storage
import { MongoStorage } from './db/mongoStorage';

// Use MongoDB storage instead of memory storage
export const storage = new MongoStorage();
