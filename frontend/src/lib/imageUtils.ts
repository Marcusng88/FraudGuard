/**
 * Image utility functions for FraudGuard
 * Handles image validation, processing, and upload
 */

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ImageProcessingOptions {
  maxSize: number; // in bytes
  allowedTypes: string[];
  maxWidth?: number;
  maxHeight?: number;
}

const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxSize: 2 * 1024 * 1024, // 2MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  maxWidth: 1024,
  maxHeight: 1024,
};

/**
 * Validate image file
 */
export function validateImage(file: File, options: Partial<ImageProcessingOptions> = {}): ImageValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Check file size
  if (file.size > opts.maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${opts.maxSize / (1024 * 1024)}MB`,
    };
  }
  
  // Check file type
  if (!opts.allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type must be one of: ${opts.allowedTypes.join(', ')}`,
    };
  }
  
  return { isValid: true };
}

/**
 * Process image before upload (resize if needed)
 */
export async function processImage(file: File, options: Partial<ImageProcessingOptions> = {}): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // If no resizing is needed, return the original file
  if (!opts.maxWidth && !opts.maxHeight) {
    return file;
  }
  
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (opts.maxWidth && width > opts.maxWidth) {
        height = (height * opts.maxWidth) / width;
        width = opts.maxWidth;
      }
      
      if (opts.maxHeight && height > opts.maxHeight) {
        width = (width * opts.maxHeight) / height;
        height = opts.maxHeight;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw and resize image
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const processedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(processedFile);
          } else {
            reject(new Error('Failed to process image'));
          }
        },
        file.type,
        0.8 // Quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create a preview URL for an image file
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Clean up preview URL
 */
export function cleanupImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Convert file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const name = originalName.replace(`.${extension}`, '');
  
  return `${prefix || 'file'}_${name}_${timestamp}_${random}.${extension}`;
} 