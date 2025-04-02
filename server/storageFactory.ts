import { IStorage } from './storage';
import { MemStorage } from './storage';
import { log } from './vite';

// Define a variable to hold the MongoDB storage once initialized
let mongoStorage: IStorage | undefined;

/**
 * Factory function to create the appropriate storage implementation
 * based on environment variables
 */
export function createStorage(): IStorage {
  const useMongoDb = process.env.USE_MONGODB === 'true';
  
  if (useMongoDb) {
    log('Using MongoDB storage implementation', 'storage');
    // Dynamically import to avoid requiring MongoDB when not needed
    if (!mongoStorage) {
      try {
        // We import dynamically to avoid issues if mongodb is not available
        const { MongoStorage } = require('./db/mongoStorage');
        mongoStorage = new MongoStorage();
      } catch (error) {
        log(`Error initializing MongoDB storage: ${(error as Error).message}`, 'storage');
        log('Falling back to in-memory storage', 'storage');
        return new MemStorage();
      }
    }
    // We know mongoStorage is defined at this point
    if (mongoStorage) {
      return mongoStorage;
    }
    // Fallback to in-memory storage if something went wrong
    log('MongoDB storage was not properly initialized, falling back to in-memory storage', 'storage');
    return new MemStorage();
  } else {
    log('Using in-memory storage implementation', 'storage');
    return new MemStorage();
  }
}