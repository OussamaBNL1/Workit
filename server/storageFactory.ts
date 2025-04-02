import { IStorage, MemStorage } from "./storage";
import { db } from "./db";
import { 
  users, services, jobs, applications, orders, reviews,
  type User, type InsertUser, 
  type Service, type InsertService,
  type Job, type InsertJob,
  type Application, type InsertApplication,
  type Order, type InsertOrder,
  type Review, type InsertReview
} from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * PostgreSQL/Drizzle implementation of the IStorage interface
 */
export class DrizzleStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Service methods
  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServices(filters?: Partial<Service>): Promise<Service[]> {
    if (!filters) {
      return db.select().from(services);
    }
    
    // Create a query with filters
    const query = db.select().from(services);
    const conditions = Object.entries(filters).map(([key, value]) => {
      // @ts-ignore: key is dynamic and may not be a valid key for 'services'
      return eq(services[key], value);
    });
    
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    
    return query;
  }

  async getUserServices(userId: number): Promise<Service[]> {
    return db.select().from(services).where(eq(services.userId, userId));
  }

  async createService(userId: number, service: InsertService): Promise<Service> {
    const [newService] = await db
      .insert(services)
      .values({ ...service, userId })
      .returning();
    return newService;
  }

  async updateService(id: number, serviceData: Partial<Service>): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  // Job methods
  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobs(filters?: Partial<Job>): Promise<Job[]> {
    if (!filters) {
      return db.select().from(jobs);
    }
    
    // Create a query with filters
    const query = db.select().from(jobs);
    const conditions = Object.entries(filters).map(([key, value]) => {
      // @ts-ignore: key is dynamic and may not be a valid key for 'jobs'
      return eq(jobs[key], value);
    });
    
    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }
    
    return query;
  }

  async getUserJobs(userId: number): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.userId, userId));
  }

  async createJob(userId: number, job: InsertJob): Promise<Job> {
    const [newJob] = await db
      .insert(jobs)
      .values({ ...job, userId })
      .returning();
    return newJob;
  }

  async updateJob(id: number, jobData: Partial<Job>): Promise<Job | undefined> {
    const [updatedJob] = await db
      .update(jobs)
      .set(jobData)
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob;
  }

  // Application methods
  async getApplicationsForJob(jobId: number): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.jobId, jobId));
  }

  async getUserApplications(userId: number): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.userId, userId));
  }

  async createApplication(userId: number, application: InsertApplication): Promise<Application> {
    const [newApplication] = await db
      .insert(applications)
      .values({ ...application, userId, status: "pending" })
      .returning();
    return newApplication;
  }

  async updateApplicationStatus(
    id: number, 
    status: "pending" | "approved" | "rejected"
  ): Promise<Application | undefined> {
    const [updatedApplication] = await db
      .update(applications)
      .set({ status })
      .where(eq(applications.id, id))
      .returning();
    return updatedApplication;
  }

  // Order methods
  async getOrdersForService(serviceId: number): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.serviceId, serviceId));
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(
        or(eq(orders.buyerId, userId), eq(orders.sellerId, userId))
      );
  }

  async createOrder(order: InsertOrder & { sellerId: number }): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, status: "pending" })
      .returning();
    return newOrder;
  }

  // Review methods
  async getReviewsForService(serviceId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.serviceId, serviceId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db
      .insert(reviews)
      .values(review)
      .returning();
    return newReview;
  }
}

/**
 * Factory function to create the appropriate storage implementation
 * based on environment variables
 */
export function createStorage(): IStorage {
  // Check for DATABASE_URL environment variable to determine which storage to use
  if (process.env.DATABASE_URL) {
    try {
      return new DrizzleStorage();
    } catch (error) {
      console.error("Failed to initialize PostgreSQL storage:", error);
      console.warn("Falling back to in-memory storage");
      return new MemStorage();
    }
  }
  
  // Default to in-memory storage if no DATABASE_URL is provided
  return new MemStorage();
}