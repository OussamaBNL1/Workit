import { IStorage } from './storage';
import { MemStorage } from './storage';
import { log } from './vite';

// Define a variable to hold the MongoDB storage once initialized
let mongoStorage: IStorage;

/**
 * Factory function to create the appropriate storage implementation
 * based on environment variables
 */
export function createStorage(): IStorage {
  // TEMPORARY: Forcing in-memory storage while we debug configuration issues
  log('Temporarily using in-memory storage implementation', 'storage');
  return new MemStorage();
}