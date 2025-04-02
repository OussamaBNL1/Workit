import mongoose from 'mongoose';
import { log } from '../vite';

// Create a cached connection variable 
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
  // If we already have a connection, return it
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  // If a connection is being established, wait for it to complete
  if (!cachedConnection.promise) {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    // Set up MongoDB connection options with newer settings
    const opts = {
      bufferCommands: false,
    };

    // Create the connection promise
    cachedConnection.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        log('Connected to MongoDB', 'mongodb');
        return mongoose;
      })
      .catch((error) => {
        log(`Error connecting to MongoDB: ${error.message}`, 'mongodb');
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