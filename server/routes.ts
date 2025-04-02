import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { type IStorage } from "./storage";
import { createStorage } from "./storageFactory";
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
import multer from "multer";
import path from "path";
import fs from "fs";
import fileUpload from "express-fileupload";

// Define custom Request type that includes files from express-fileupload
// Remove the declaration because it conflicts with built-in Express type
// We'll use explicit type assertions when working with files

// Setup file upload
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: fileStorage });

// Helper function to check authentication
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get storage from factory in index.ts
  const storage = createStorage();
  // Setup session
  app.use(session({
    secret: process.env.SESSION_SECRET || "workit-secret",
    resave: false,
    saveUninitialized: false,
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

      // In a real app, we'd use bcrypt to compare passwords
      // For simplicity, direct comparison here
      if (user.password !== password) {
        return done(null, false, { message: "Invalid username or password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
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

      // In a real app, we'd hash the password
      const user = await storage.createUser(userData);
      
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
      const id = parseInt(req.params.id);
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
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/services', isAuthenticated, async (req, res) => {
    try {
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
      console.error('Error creating service:', error);
      res.status(400).json({ message: error.message });
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
      const id = parseInt(req.params.id);
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
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/jobs', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      const userId = (req.user as any).id;
      
      // Handle file upload
      if (req.file) {
        jobData.image = `/uploads/${req.file.filename}`;
      }
      
      const job = await storage.createJob(userId, jobData);
      res.status(201).json(job);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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

  app.post('/api/jobs/:id/applications', isAuthenticated, upload.single('resumeFile'), async (req, res) => {
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
      
      // Handle file upload
      if (req.file) {
        applicationData.resumeFile = `/uploads/${req.file.filename}`;
      }
      
      const application = await storage.createApplication(userId, applicationData);
      res.status(201).json(application);
    } catch (error: any) {
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
      const serviceId = parseInt(req.params.id);
      const reviews = await storage.getReviewsForService(serviceId);
      
      // Get user data for each review
      const reviewsWithUsers = await Promise.all(reviews.map(async (review) => {
        const user = await storage.getUser(review.userId);
        if (!user) return review;
        
        const { password, ...safeUser } = user;
        return { ...review, user: safeUser };
      }));
      
      res.json(reviewsWithUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/services/:id/reviews', isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id);
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
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
