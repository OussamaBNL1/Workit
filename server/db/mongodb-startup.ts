import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { log } from '../vite';

/**
 * Start MongoDB server if it's not already running
 */
export async function startMongoDBServer(): Promise<boolean> {
  if (process.env.USE_MONGODB_MEMORY_SERVER === 'true') {
    log('Using in-memory MongoDB server, no need to start a local server', 'mongodb');
    return true;
  }

  // Create MongoDB data directory if it doesn't exist
  const dbPath = join(process.cwd(), 'mongodb-data');
  if (!existsSync(dbPath)) {
    log(`Creating MongoDB data directory: ${dbPath}`, 'mongodb');
    mkdirSync(dbPath, { recursive: true });
  }

  try {
    // Try to check if MongoDB is already running
    const isRunning = await checkMongoDBRunning();
    if (isRunning) {
      log('MongoDB server is already running', 'mongodb');
      return true;
    }

    // Start MongoDB server
    log('Starting MongoDB server...', 'mongodb');
    const mongod = spawn('mongod', [
      '--dbpath', dbPath,
      '--port', '27017',
      '--bind_ip', '127.0.0.1',
      '--fork',
      '--logpath', join(process.cwd(), 'mongodb.log')
    ]);

    return new Promise<boolean>((resolve) => {
      mongod.on('error', (error) => {
        log(`Failed to start MongoDB server: ${error.message}`, 'mongodb');
        resolve(false);
      });

      mongod.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('child process started successfully')) {
          log('MongoDB server started successfully', 'mongodb');
          resolve(true);
        }
      });

      mongod.on('exit', (code) => {
        if (code !== 0) {
          log(`MongoDB server process exited with code ${code}`, 'mongodb');
          resolve(false);
        }
      });
    });
  } catch (error) {
    log(`Error starting MongoDB server: ${(error as Error).message}`, 'mongodb');
    return false;
  }
}

/**
 * Check if MongoDB server is running
 */
async function checkMongoDBRunning(): Promise<boolean> {
  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient('mongodb://127.0.0.1:27017', { 
      serverSelectionTimeoutMS: 1000 
    });
    
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    
    return true;
  } catch (error) {
    log(`MongoDB server check failed: ${(error as Error).message}`, 'mongodb');
    return false;
  }
}