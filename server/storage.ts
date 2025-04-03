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
  getUser(id: any): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: any, userData: Partial<User>): Promise<User | undefined>;
  
  // Service related methods
  getService(id: any): Promise<Service | undefined>;
  getServices(filters?: Partial<Service>): Promise<Service[]>;
  getUserServices(userId: number): Promise<Service[]>;
  createService(userId: number, service: InsertService): Promise<Service>;
  updateService(id: any, serviceData: Partial<Service>): Promise<Service | undefined>;
  
  // Job related methods
  getJob(id: any): Promise<Job | undefined>;
  getJobs(filters?: Partial<Job>): Promise<Job[]>;
  getUserJobs(userId: number): Promise<Job[]>;
  createJob(userId: number, job: InsertJob): Promise<Job>;
  updateJob(id: any, jobData: Partial<Job>): Promise<Job | undefined>;
  
  // Application related methods
  getApplicationsForJob(jobId: number): Promise<Application[]>;
  getUserApplications(userId: number): Promise<Application[]>;
  createApplication(userId: number, application: InsertApplication): Promise<Application>;
  updateApplicationStatus(id: any, status: "pending" | "approved" | "rejected"): Promise<Application | undefined>;
  
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
  async getUser(id: any): Promise<User | undefined> {
    // If id is a number or can be parsed as a number, use it directly
    if (typeof id === 'number') {
      return this.users.get(id);
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      return this.users.get(parseInt(id));
    }
    
    // For MongoDB's ObjectId strings or other non-numeric IDs,
    // we just return undefined since in-memory storage only uses numeric IDs
    return undefined;
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
    
    // Ensure required fields are set with defaults
    const user: User = {
      ...insertUser,
      id,
      createdAt,
      role: insertUser.role || "freelancer", 
      bio: insertUser.bio || null,
      profilePicture: insertUser.profilePicture || null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: any, userData: Partial<User>): Promise<User | undefined> {
    let numericId: number | undefined;
    
    // Convert id to numeric if possible
    if (typeof id === 'number') {
      numericId = id;
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      numericId = parseInt(id);
    }
    
    // If we couldn't get a valid numeric ID, return undefined
    if (numericId === undefined) {
      return undefined;
    }
    
    const existingUser = this.users.get(numericId);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(numericId, updatedUser);
    return updatedUser;
  }

  // Service methods
  async getService(id: any): Promise<Service | undefined> {
    // If id is a number or can be parsed as a number, use it directly
    if (typeof id === 'number') {
      return this.services.get(id);
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      return this.services.get(parseInt(id));
    }
    
    // For MongoDB's ObjectId strings or other non-numeric IDs,
    // we just return undefined since in-memory storage only uses numeric IDs
    return undefined;
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
    const newService: Service = { 
      ...service, 
      id, 
      userId, 
      createdAt,
      status: service.status || "active",
      image: service.image || null,
      deliveryTime: service.deliveryTime || null
    };
    this.services.set(id, newService);
    return newService;
  }
  
  async updateService(id: any, serviceData: Partial<Service>): Promise<Service | undefined> {
    let numericId: number | undefined;
    
    // Convert id to numeric if possible
    if (typeof id === 'number') {
      numericId = id;
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      numericId = parseInt(id);
    }
    
    // If we couldn't get a valid numeric ID, return undefined
    if (numericId === undefined) {
      return undefined;
    }
    
    const existingService = this.services.get(numericId);
    if (!existingService) {
      return undefined;
    }
    
    const updatedService = { ...existingService, ...serviceData };
    this.services.set(numericId, updatedService);
    return updatedService;
  }

  // Job methods
  async getJob(id: any): Promise<Job | undefined> {
    // If id is a number or can be parsed as a number, use it directly
    if (typeof id === 'number') {
      return this.jobs.get(id);
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      return this.jobs.get(parseInt(id));
    }
    
    // For MongoDB's ObjectId strings or other non-numeric IDs,
    // we just return undefined since in-memory storage only uses numeric IDs
    return undefined;
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
    const newJob: Job = { 
      ...job, 
      id, 
      userId, 
      createdAt,
      status: job.status || "open",
      image: job.image || null,
      location: job.location || null
    };
    this.jobs.set(id, newJob);
    return newJob;
  }
  
  async updateJob(id: any, jobData: Partial<Job>): Promise<Job | undefined> {
    let numericId: number | undefined;
    
    // Convert id to numeric if possible
    if (typeof id === 'number') {
      numericId = id;
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      numericId = parseInt(id);
    }
    
    // If we couldn't get a valid numeric ID, return undefined
    if (numericId === undefined) {
      return undefined;
    }
    
    const existingJob = this.jobs.get(numericId);
    if (!existingJob) {
      return undefined;
    }
    
    const updatedJob = { ...existingJob, ...jobData };
    this.jobs.set(numericId, updatedJob);
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
      status: "pending",
      resumeFile: application.resumeFile || null
    };
    this.applications.set(id, newApplication);
    return newApplication;
  }
  
  async updateApplicationStatus(
    id: any, 
    status: "pending" | "approved" | "rejected"
  ): Promise<Application | undefined> {
    let numericId: number | undefined;
    
    // Convert id to numeric if possible
    if (typeof id === 'number') {
      numericId = id;
    } else if (typeof id === 'string' && !isNaN(parseInt(id))) {
      numericId = parseInt(id);
    }
    
    // If we couldn't get a valid numeric ID, return undefined
    if (numericId === undefined) {
      return undefined;
    }
    
    const existingApplication = this.applications.get(numericId);
    if (!existingApplication) {
      return undefined;
    }
    
    const updatedApplication = { ...existingApplication, status };
    this.applications.set(numericId, updatedApplication);
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
    const newOrder: Order = { 
      ...order, 
      id, 
      createdAt,
      status: "pending" // Default status for new orders
    };
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
    const newReview: Review = { 
      ...review, 
      id, 
      createdAt,
      comment: review.comment || null
    };
    this.reviews.set(id, newReview);
    return newReview;
  }
}

// Export an instance of MemStorage as the default storage implementation
export const storage = new MemStorage();
