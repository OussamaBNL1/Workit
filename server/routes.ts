import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { type IStorage } from "./storage";
import { createStorage, currentStorageType } from "./storageFactory";
import { 
  insertUserSchema, 
  loginSchema, 
  insertServiceSchema, 
  insertJobSchema,
  insertApplicationSchema,
  insertOrderSchema,
  insertReviewSchema 
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import path from "path";
import fs from "fs";
import fileUpload from "express-fileupload";

// Define custom Request type that includes files from express-fileupload
// Remove the declaration because it conflicts with built-in Express type
// We'll use explicit type assertions when working with files

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create the subdirectories for different upload types
const uploadSubdirs = ['profiles', 'services', 'jobs', 'resumes'];
for (const subdir of uploadSubdirs) {
  const subdirPath = path.join(uploadDir, subdir);
  if (!fs.existsSync(subdirPath)) {
    fs.mkdirSync(subdirPath, { recursive: true });
  }
}

// Helper function to check authentication
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get storage from factory in index.ts
  // Since createStorage is now async, we need to await it
  const storage = await createStorage();
  // Setup session
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "workit-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: THIRTY_DAYS,
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid username or password" });
      }

      // Check if user has a password
      if (!user.password) {
        return done(null, false, { message: "Invalid username or password" });
      }
      
      // Check if password is hashed (has bcrypt format)
      if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
        // Password is hashed, use bcrypt compare
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false, { message: "Invalid username or password" });
        }
      } else {
        // For compatibility with non-hashed passwords
        if (user.password !== password) {
          return done(null, false, { message: "Invalid username or password" });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      // Handle both string and number IDs
      let user;
      
      // MongoDB IDs might be strings (objectId) instead of numbers
      if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
        // If it looks like a MongoDB ObjectId, use it as is
        // @ts-ignore - we're handling MongoDB ObjectIDs for compatibility
        user = await storage.getUser(id);
      } else {
        // If it's a number ID or some other format
        const numId = parseInt(String(id), 10);
        if (!isNaN(numId)) {
          user = await storage.getUser(numId);
        }
      }
      
      if (!user) {
        return done(new Error('User not found'), null);
      }
      
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Verify passwords match
      if (userData.password !== userData.confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      // Check if user exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash the password with bcrypt
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Remove sensitive data
      const { password, ...safeUser } = user;
      
      // Log in the user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        return res.status(201).json(safeUser);
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    try {
      loginSchema.parse(req.body);
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message });
        }
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          
          // Remove sensitive data
          const { password, ...safeUser } = user;
          return res.json(safeUser);
        });
      })(req, res, next);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json(null);
    }
    // Remove sensitive data
    const { password, ...safeUser } = req.user as any;
    res.json(safeUser);
  });

  // User routes
  app.get('/api/users/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive data
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Check if trying to update own profile
      if (currentUser.id !== id) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      // Handle file upload using express-fileupload
      const userData: any = { ...req.body };
      
      if (req.files && typeof req.files === 'object' && 'profilePicture' in req.files) {
        // Import and use the fileUpload utility
        const { saveFile } = await import('./utils/fileUpload');
        // Use any to bypass type checking since we know the object has the correct structure
        const uploadedFile = (req.files as any).profilePicture;
        const uploadResult = await saveFile(uploadedFile, 'profiles');
        userData.profilePicture = uploadResult.fileUrl;
        console.log('Profile picture uploaded:', uploadResult.fileUrl);
      }
      
      console.log('Updating user with data:', userData);
      
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive data
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // Service routes
  app.get('/api/services', async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.status) filters.status = req.query.status as string;
      
      const services = await storage.getServices(filters);
      
      // Get user data for each service
      const servicesWithUsers = await Promise.all(services.map(async (service) => {
        const user = await storage.getUser(service.userId);
        if (!user) return service;
        
        const { password, ...safeUser } = user;
        return { ...service, user: safeUser };
      }));
      
      res.json(servicesWithUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/services/:id', async (req, res) => {
    try {
      // Don't convert id to integer if it's a MongoDB ObjectID
      let id = req.params.id;
      
      // Only convert to integer if it's not a MongoDB ObjectID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        id = parseInt(id) as any;
      }
      
      const service = await storage.getService(id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Get user data
      const user = await storage.getUser(service.userId);
      if (user) {
        const { password, ...safeUser } = user;
        return res.json({ ...service, user: safeUser });
      }
      
      res.json(service);
    } catch (error: any) {
      console.error('Error fetching service:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/services', isAuthenticated, async (req, res) => {
    try {
      console.log('Service creation request received', { bodyKeys: Object.keys(req.body), hasFiles: !!req.files });
      
      // Need to handle the price as a number correctly
      if (req.body.price && typeof req.body.price === 'string') {
        req.body.price = parseFloat(req.body.price);
      }
      
      const serviceData = insertServiceSchema.parse(req.body);
      const userId = (req.user as any).id;
      
      // Handle file upload using express-fileupload
      if (req.files && typeof req.files === 'object' && 'image' in req.files) {
        // Import and use the fileUpload utility
        const { saveFile } = await import('./utils/fileUpload');
        // Use any to bypass type checking since we know the object has the correct structure
        const uploadedFile = (req.files as any).image;
        const uploadResult = await saveFile(uploadedFile, 'services');
        serviceData.image = uploadResult.fileUrl;
        console.log('Service image uploaded:', uploadResult.fileUrl);
      }
      
      const service = await storage.createService(userId, serviceData);
      res.status(201).json(service);
    } catch (error: any) {
      console.error('Error creating service:', error.message);
      if (error.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors));
      }
      res.status(400).json({ 
        message: error.message,
        errors: error.errors || undefined
      });
    }
  });

  app.get('/api/users/:id/services', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const services = await storage.getUserServices(userId);
      res.json(services);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Job routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.jobType) filters.jobType = req.query.jobType as string;
      if (req.query.location) filters.location = req.query.location as string;
      
      const jobs = await storage.getJobs(filters);
      
      // Get user data for each job
      const jobsWithUsers = await Promise.all(jobs.map(async (job) => {
        const user = await storage.getUser(job.userId);
        if (!user) return job;
        
        const { password, ...safeUser } = user;
        return { ...job, user: safeUser };
      }));
      
      res.json(jobsWithUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      // Don't convert id to integer if it's a MongoDB ObjectID
      let id = req.params.id;
      
      // Only convert to integer if it's not a MongoDB ObjectID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        id = parseInt(id) as any;
      }
      
      const job = await storage.getJob(id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Get user data
      const user = await storage.getUser(job.userId);
      if (user) {
        const { password, ...safeUser } = user;
        return res.json({ ...job, user: safeUser });
      }
      
      res.json(job);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/jobs', isAuthenticated, async (req, res) => {
    try {
      console.log('Job creation request received', { bodyKeys: Object.keys(req.body), hasFiles: !!req.files });
      
      // Need to handle the salary/budget as a number correctly
      if (req.body.budget && typeof req.body.budget === 'string') {
        req.body.budget = parseFloat(req.body.budget);
      }
      
      const jobData = insertJobSchema.parse(req.body);
      const userId = (req.user as any).id;
      
      // Handle file upload using express-fileupload
      if (req.files && typeof req.files === 'object' && 'image' in req.files) {
        // Import and use the fileUpload utility
        const { saveFile } = await import('./utils/fileUpload');
        // Use any to bypass type checking since we know the object has the correct structure
        const uploadedFile = (req.files as any).image;
        const uploadResult = await saveFile(uploadedFile, 'jobs');
        jobData.image = uploadResult.fileUrl;
        console.log('Job image uploaded:', uploadResult.fileUrl);
      }
      
      const job = await storage.createJob(userId, jobData);
      res.status(201).json(job);
    } catch (error: any) {
      console.error('Error creating job:', error.message);
      if (error.errors) {
        console.error('Validation errors:', JSON.stringify(error.errors));
      }
      res.status(400).json({ 
        message: error.message,
        errors: error.errors || undefined
      });
    }
  });

  app.get('/api/users/:id/jobs', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const jobs = await storage.getUserJobs(userId);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Application routes
  app.get('/api/jobs/:id/applications', isAuthenticated, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Get the job to check ownership
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the job owner can see applications
      if (job.userId !== currentUser.id) {
        return res.status(403).json({ message: "You are not authorized to view these applications" });
      }
      
      const applications = await storage.getApplicationsForJob(jobId);
      
      // Get user data for each application
      const applicationsWithUsers = await Promise.all(applications.map(async (application) => {
        const user = await storage.getUser(application.userId);
        if (!user) return application;
        
        const { password, ...safeUser } = user;
        return { ...application, user: safeUser };
      }));
      
      res.json(applicationsWithUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/jobs/:id/applications', isAuthenticated, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      // Get the job
      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Don't allow applying to own job
      if (job.userId === userId) {
        return res.status(400).json({ message: "You cannot apply to your own job" });
      }
      
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        jobId
      });
      
      // Handle file upload using express-fileupload
      if (req.files && typeof req.files === 'object' && 'resumeFile' in req.files) {
        // Import and use the fileUpload utility
        const { saveFile } = await import('./utils/fileUpload');
        // Use any to bypass type checking since we know the object has the correct structure
        const uploadedFile = (req.files as any).resumeFile;
        const uploadResult = await saveFile(uploadedFile, 'resumes');
        applicationData.resumeFile = uploadResult.fileUrl;
        console.log('Resume file uploaded:', uploadResult.fileUrl);
      }
      
      const application = await storage.createApplication(userId, applicationData);
      res.status(201).json(application);
    } catch (error: any) {
      console.error('Error creating application:', error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put('/api/applications/:id/status', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const currentUser = req.user as any;
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Find the application directly
      const application = await storage.getApplicationsForJob(0) // Get all applications
        .then(apps => apps.find(app => app.id === id));
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Get the job to check ownership
      const job = await storage.getJob(application.jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      
      // Only the job owner can update application status
      if (job.userId !== currentUser.id) {
        return res.status(403).json({ message: "You are not authorized to update this application" });
      }
      
      const updatedApplication = await storage.updateApplicationStatus(id, status);
      res.json(updatedApplication);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/users/:id/applications', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Can only view own applications
      if (userId !== currentUser.id) {
        return res.status(403).json({ message: "You can only view your own applications" });
      }
      
      const applications = await storage.getUserApplications(userId);
      
      // Get job data for each application
      const applicationsWithJobs = await Promise.all(applications.map(async (application) => {
        const job = await storage.getJob(application.jobId);
        return { ...application, job };
      }));
      
      res.json(applicationsWithJobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Order routes
  app.post('/api/services/:id/orders', isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const buyerId = (req.user as any).id;
      
      // Get the service
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Don't allow buying own service
      if (service.userId === buyerId) {
        return res.status(400).json({ message: "You cannot order your own service" });
      }
      
      const orderData = insertOrderSchema.parse({
        ...req.body,
        serviceId,
        buyerId,
        totalPrice: service.price
      });
      
      const order = await storage.createOrder({
        ...orderData,
        sellerId: service.userId
      });
      
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/users/:id/orders', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as any;
      
      // Can only view own orders
      if (userId !== currentUser.id) {
        return res.status(403).json({ message: "You can only view your own orders" });
      }
      
      const orders = await storage.getUserOrders(userId);
      
      // Get service data for each order
      const ordersWithServices = await Promise.all(orders.map(async (order) => {
        const service = await storage.getService(order.serviceId);
        return { ...order, service };
      }));
      
      res.json(ordersWithServices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Review routes
  app.get('/api/services/:id/reviews', async (req, res) => {
    try {
      // Don't convert id to integer if it's a MongoDB ObjectID
      let id = req.params.id;
      
      // Only convert to integer if it's not a MongoDB ObjectID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        id = parseInt(id) as any;
      }
      
      const reviews = await storage.getReviewsForService(id);
      
      // Get user data for each review
      const reviewsWithUsers = await Promise.all(reviews.map(async (review) => {
        const user = await storage.getUser(review.userId);
        if (!user) return review;
        
        const { password, ...safeUser } = user;
        return { ...review, user: safeUser };
      }));
      
      res.json(reviewsWithUsers);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/services/:id/reviews', isAuthenticated, async (req, res) => {
    try {
      // Don't convert id to integer if it's a MongoDB ObjectID
      let serviceId = req.params.id;
      
      // Only convert to integer if it's not a MongoDB ObjectID format
      if (!serviceId.match(/^[0-9a-fA-F]{24}$/)) {
        serviceId = parseInt(serviceId) as any;
      }
      
      const userId = (req.user as any).id;
      
      // Get the service
      const service = await storage.getService(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      
      // Don't allow reviewing own service
      if (service.userId === userId) {
        return res.status(400).json({ message: "You cannot review your own service" });
      }
      
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        serviceId,
        userId
      });
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error: any) {
      console.error('Error creating review:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // System information endpoint
  app.get('/api/system/info', (req, res) => {
    const systemInfo = {
      databaseType: currentStorageType,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    res.json(systemInfo);
  });

  const httpServer = createServer(app);

  return httpServer;
}
