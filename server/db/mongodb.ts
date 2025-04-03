import mongoose from 'mongoose';
import { log } from '../vite';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Create a cached connection variable 
interface MongoConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  mongoMemoryServer?: MongoMemoryServer;
}

let cachedConnection: MongoConnection = { conn: null, promise: null };

/**
 * Connect to MongoDB
 * @returns Connection instance
 */
export async function connectToMongoDB() {
  // If we already have a connection, return it
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  // If a connection is being established, wait for it to complete
  if (!cachedConnection.promise) {
    let MONGODB_URI = process.env.MONGODB_URI;
    
    // If USE_MONGODB_MEMORY_SERVER is set, use the in-memory MongoDB server
    if (process.env.USE_MONGODB_MEMORY_SERVER === 'true') {
      try {
        // Create an in-memory MongoDB server
        const mongoMemoryServer = await MongoMemoryServer.create();
        MONGODB_URI = mongoMemoryServer.getUri();
        cachedConnection.mongoMemoryServer = mongoMemoryServer;
        log('Using MongoDB Memory Server: ' + MONGODB_URI, 'mongodb');
      } catch (error) {
        log(`Error starting MongoDB Memory Server: ${error}`, 'mongodb');
        // Fall back to the environment variable
      }
    } else {
      log('Using external MongoDB connection: ' + MONGODB_URI, 'mongodb');
    }

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    // Set up MongoDB connection options with newer settings
    const opts = {
      bufferCommands: false,
    };

    // Create the connection promise
    log(`Attempting to connect to MongoDB at URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`, 'mongodb');
    
    cachedConnection.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        log('Successfully connected to MongoDB', 'mongodb');
        // Log the connection details
        if (mongoose.connection && mongoose.connection.db) {
          const dbInstance = mongoose.connection.db;
          Promise.resolve()
            .then(() => dbInstance.admin().serverInfo())
            .then(info => {
              log(`MongoDB version: ${info.version}`, 'mongodb');
              return dbInstance.stats();
            })
            .then(stats => {
              log(`Database: ${mongoose.connection.name}, Collections: ${stats.collections}`, 'mongodb');
            })
            .catch(err => {
              log(`Could not retrieve MongoDB server info: ${err.message}`, 'mongodb');
            });
        } else {
          log('MongoDB connection established but database information unavailable', 'mongodb');
        }
        return mongoose;
      })
      .catch((error) => {
        log(`Error connecting to MongoDB: ${error.message}`, 'mongodb');
        log(`Connection string might be invalid or MongoDB server is not accessible.`, 'mongodb');
        cachedConnection.promise = null;
        throw error;
      });
  }

  // Wait for the connection to complete
  cachedConnection.conn = await cachedConnection.promise;
  return cachedConnection.conn;
}

/**
 * Get the MongoDB connection
 * @returns Connection instance or null if not connected
 */
export function getMongoDBConnection() {
  return cachedConnection.conn;
}