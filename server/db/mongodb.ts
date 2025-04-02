import mongoose from 'mongoose';
import { log } from '../vite';

// MongoDB connection string - use DATABASE_URL environment variable if available
const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/workit';

// Cached connection
interface MongoConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cachedConnection: MongoConnection = { conn: null, promise: null };

/**
 * Connect to MongoDB
 * @returns Connection instance
 */
export async function connectToMongoDB() {
  // If we have a cached connection, return it
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    const opts = {
      bufferCommands: true,
    };

    log(`Connecting to MongoDB at ${MONGODB_URI}`);
    
    // Create a new connection promise
    cachedConnection.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        log('MongoDB connected successfully!');
        return mongoose;
      })
      .catch((error) => {
        log(`Error connecting to MongoDB: ${error.message}`, 'error');
        cachedConnection.promise = null;
        throw error;
      });
  }
  
  // Wait for the connection to establish
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