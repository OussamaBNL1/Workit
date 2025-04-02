import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import fileUpload from 'express-fileupload';
import { Request } from 'express';

// Define the interface for uploaded file data
interface UploadedFile {
  filePath: string;
  fileName: string;
  fileUrl: string;
}

/**
 * Save a file to the server's filesystem
 * @param file The uploaded file
 * @param subfolder Optional subfolder within uploads directory
 * @returns Object with file path, name and URL
 */
export async function saveFile(file: fileUpload.UploadedFile, subfolder: string = ''): Promise<UploadedFile> {
  // Generate a unique filename to prevent overwriting
  const fileExt = path.extname(file.name);
  const uniqueFileName = `${uuidv4()}${fileExt}`;
  
  // Create the path where the file will be saved
  const uploadDir = path.join('uploads', subfolder);
  const filePath = path.join(uploadDir, uniqueFileName);

  // Ensure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Move the file to the specified path
  await file.mv(filePath);
  
  // Return the file information
  return {
    filePath,
    fileName: uniqueFileName,
    fileUrl: `/uploads/${subfolder ? subfolder + '/' : ''}${uniqueFileName}`
  };
}

/**
 * Get a file from a request's files object by field name
 * @param req Express request object
 * @param fieldName Form field name containing the file
 * @returns The uploaded file or null if not found
 */
export function getFileFromRequest(req: Request, fieldName: string): fileUpload.UploadedFile | null {
  if (!req.files || Object.keys(req.files).length === 0) {
    return null;
  }

  // Check if the field exists in the files object
  if (!req.files || !req.files[fieldName as keyof typeof req.files]) {
    return null;
  }

  const file = req.files[fieldName as keyof typeof req.files];
  
  // If the field contains multiple files, return the first one
  return Array.isArray(file) ? file[0] : file;
}

/**
 * Validate if a file is an image
 * @param file The uploaded file
 * @returns boolean indicating if file is a valid image
 */
export function validateImageFile(file: fileUpload.UploadedFile): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return allowedTypes.includes(file.mimetype);
}

/**
 * Validate if a file is a document
 * @param file The uploaded file
 * @returns boolean indicating if file is a valid document
 */
export function validateDocumentFile(file: fileUpload.UploadedFile): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return allowedTypes.includes(file.mimetype);
}