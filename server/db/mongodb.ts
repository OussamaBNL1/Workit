import mongoose from 'mongoose';
import { log } from '../vite';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Create a cached connection variable 
interface MongoConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  mongoMemoryServer?: MongoMemoryServer;
  isConnecting: boolean;
  connectionURI?: string;
}

let cachedConnection: MongoConnection = { 
  conn: null, 
  promise: null, 
  isConnecting: false,
  connectionURI: undefined
};

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
  if (cachedConnection.isConnecting && cachedConnection.promise) {
    try {
      log('Connection already in progress, waiting for it to complete...', 'mongodb');
      cachedConnection.conn = await cachedConnection.promise;
      return cachedConnection.conn;
    } catch (error) {
      log(`Error connecting to MongoDB: ${(error as Error).message}`, 'mongodb');
      // Reset connection state on error
      cachedConnection.promise = null;
      cachedConnection.isConnecting = false;
      cachedConnection.connectionURI = undefined;
    }
  }

  // Mark that we're starting a connection attempt
  cachedConnection.isConnecting = true;

  // Create a new connection
  let MONGODB_URI = process.env.MONGODB_URI;
  
  // If USE_MONGODB_MEMORY_SERVER is set, use the in-memory MongoDB server
  if (process.env.USE_MONGODB_MEMORY_SERVER === 'true') {
    // Check if we already have a memory server instance
    if (!cachedConnection.mongoMemoryServer) {
      try {
        // Create an in-memory MongoDB server only once
        const mongoMemoryServer = await MongoMemoryServer.create();
        MONGODB_URI = mongoMemoryServer.getUri();
        cachedConnection.mongoMemoryServer = mongoMemoryServer;
        cachedConnection.connectionURI = MONGODB_URI;
        log('Created new MongoDB Memory Server: ' + MONGODB_URI, 'mongodb');
      } catch (error) {
        log(`Error starting MongoDB Memory Server: ${error}`, 'mongodb');
        // Fall back to the environment variable
      }
    } else {
      // Reuse the existing memory server
      MONGODB_URI = cachedConnection.mongoMemoryServer.getUri();
      log('Reusing existing MongoDB Memory Server: ' + MONGODB_URI, 'mongodb');
    }
  } else {
    log('Using external MongoDB connection: ' + MONGODB_URI, 'mongodb');
  }

  if (!MONGODB_URI) {
    cachedConnection.isConnecting = false;
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  // Store the connection URI to detect duplicate connection attempts
  cachedConnection.connectionURI = MONGODB_URI;

  // Set up MongoDB connection options with newer settings
  const opts = {
    bufferCommands: false,
  };

  // Check if mongoose is already connected
  if (mongoose.connection.readyState === 1) {
    log('Mongoose already has an active connection, reusing it', 'mongodb');
    cachedConnection.conn = mongoose;
    cachedConnection.isConnecting = false;
    return mongoose;
  }

  // Create the connection promise
  log(`Attempting to connect to MongoDB at URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`, 'mongodb');
  
  try {
    cachedConnection.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        log('Successfully connected to MongoDB', 'mongodb');
        cachedConnection.isConnecting = false;
        
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
        cachedConnection.isConnecting = false;
        throw error;
      });

    // Wait for the connection to complete
    cachedConnection.conn = await cachedConnection.promise;
    return cachedConnection.conn;
  } catch (error) {
    cachedConnection.isConnecting = false;
    cachedConnection.promise = null;
    throw error;
  }
}

/**
 * Get the MongoDB connection
 * @returns Connection instance or null if not connected
 */
export function getMongoDBConnection() {
  return cachedConnection.conn;
}