/**
 * Cloudinary Upload Service — TaleemiDunya-Pro
 * 
 * Handles: Profile photos, documents (PDF), certificates, logos
 * Features:
 *   - Client-side image compression before upload
 *   - Progress tracking via XHR
 *   - Optimized URL generation with on-the-fly transformations
 *   - Folder organization by school/type
 *   - Cloudinary deletion queue (server-side cleanup)
 *   - File validation (type, size)
 *   - Thumbnail generation
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz0mfu4al';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'taleemidunya_unsigned';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

// ═══════════════════════════════════════════════════════
//  IMAGE COMPRESSION (client-side, before upload)
// ═══════════════════════════════════════════════════════

/**
 * Compress an image file using Canvas API
 * @param {File} file - Original image file
 * @param {Object} options - { maxWidth, maxHeight, quality }
 * @returns {Promise<File>} Compressed file
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    // Skip non-image files
    if (!file.type?.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            // Only use compressed if it's actually smaller
            resolve(compressedFile.size < file.size ? compressedFile : file);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
};

// ═══════════════════════════════════════════════════════
//  FILE VALIDATION
// ═══════════════════════════════════════════════════════

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024;  // 10MB

/**
 * Validate a file before upload
 * @param {File} file
 * @param {'image'|'document'|'any'} type
 * @returns {{valid: boolean, error?: string}}
 */
export const validateFile = (file, type = 'any') => {
  if (!file) return { valid: false, error: 'No file provided' };

  if (type === 'image') {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, WebP and GIF images are allowed' };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image size must be under ${MAX_IMAGE_SIZE / 1024 / 1024}MB` };
    }
  } else if (type === 'document') {
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      return { valid: false, error: 'Only PDF and DOC files are allowed' };
    }
    if (file.size > MAX_DOC_SIZE) {
      return { valid: false, error: `Document size must be under ${MAX_DOC_SIZE / 1024 / 1024}MB` };
    }
  } else {
    // Generic 10MB limit
    if (file.size > MAX_DOC_SIZE) {
      return { valid: false, error: `File size must be under ${MAX_DOC_SIZE / 1024 / 1024}MB` };
    }
  }

  return { valid: true };
};

// ═══════════════════════════════════════════════════════
//  CORE UPLOAD FUNCTION
// ═══════════════════════════════════════════════════════

/**
 * Upload a file to Cloudinary with optimization
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder path (e.g., 'students/photos')
 * @param {string} options.publicId - Custom public ID for the file
 * @param {Function} options.onProgress - Progress callback (0-100)
 * @param {string} options.resourceType - 'image', 'raw' (for PDFs), or 'auto'
 * @param {Object} options.transformation - Cloudinary transformations
 * @param {boolean} options.compress - Whether to compress images before upload (default: true)
 * @returns {Promise<{success: boolean, url: string, publicId: string, error?: string}>}
 */
export const uploadToCloudinary = async (file, options = {}) => {
  const {
    folder = 'taleemidunya',
    publicId = null,
    onProgress = null,
    transformation = null,
    compress = true,
  } = options;

  try {
    // Validate file
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // File size check (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File size exceeds 10MB limit' };
    }

    // Compress image if applicable
    let uploadFile = file;
    if (compress && file.type?.startsWith('image/')) {
      try {
        uploadFile = await compressImage(file);
      } catch (e) {
        console.warn('Image compression failed, uploading original:', e);
      }
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Apply transformations for images (auto quality, format, resize)
    if (uploadFile.type?.startsWith('image/')) {
      formData.append('transformation', 'q_auto,f_auto');
    }

    if (transformation) {
      formData.append('transformation', JSON.stringify(transformation));
    }

    // Upload with progress tracking
    const response = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));

      xhr.open('POST', UPLOAD_URL);
      xhr.send(formData);
    });

    return {
      success: true,
      url: response.secure_url,
      publicId: response.public_id,
      format: response.format,
      size: response.bytes,
      width: response.width,
      height: response.height,
      originalFilename: response.original_filename,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
};

// ═══════════════════════════════════════════════════════
//  SPECIALIZED UPLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Upload a student profile photo with automatic optimization
 * @param {File} file - Image file
 * @param {string} schoolId - School identifier
 * @param {string} studentId - Student identifier
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, url: string, publicId: string}>}
 */
export const uploadStudentPhoto = async (file, schoolId, studentId, onProgress) => {
  return uploadToCloudinary(file, {
    folder: `taleemidunya/${schoolId}/students`,
    publicId: `student_${studentId}_${Date.now()}`,
    onProgress,
    compress: true,
  });
};

/**
 * Upload a staff/teacher profile photo
 * @param {File} file - Image file
 * @param {string} schoolId - School identifier
 * @param {string} staffId - Staff identifier
 * @param {Function} onProgress - Progress callback
 */
export const uploadStaffPhoto = async (file, schoolId, staffId, onProgress) => {
  return uploadToCloudinary(file, {
    folder: `taleemidunya/${schoolId}/staff`,
    publicId: `staff_${staffId}_${Date.now()}`,
    onProgress,
    compress: true,
  });
};

/**
 * Upload a document (PDF, certificate, etc.)
 * @param {File} file - Document file
 * @param {string} schoolId - School identifier
 * @param {string} docType - Document type ('certificates', 'documents', 'reports')
 * @param {Function} onProgress - Progress callback
 */
export const uploadDocument = async (file, schoolId, docType = 'documents', onProgress) => {
  return uploadToCloudinary(file, {
    folder: `taleemidunya/${schoolId}/${docType}`,
    publicId: `${docType}_${Date.now()}`,
    onProgress,
    compress: false, // Don't compress PDFs
  });
};

/**
 * Upload school logo
 * @param {File} file - Logo image file
 * @param {string} schoolId - School identifier
 * @param {Function} onProgress - Progress callback
 */
export const uploadSchoolLogo = async (file, schoolId, onProgress) => {
  return uploadToCloudinary(file, {
    folder: `taleemidunya/${schoolId}/branding`,
    publicId: `logo_${schoolId}`,
    onProgress,
    compress: true,
  });
};

// ═══════════════════════════════════════════════════════
//  DELETION MANAGEMENT
// ═══════════════════════════════════════════════════════

/**
 * Delete a file from Cloudinary
 * NOTE: For unsigned presets, deletion must happen server-side.
 * This function stores the publicId in Firestore for later cleanup
 * by a Cloud Function or scheduled job.
 * 
 * @param {string} publicId - The public ID of the file to delete
 */
export const markForDeletion = async (publicId) => {
  if (!publicId) return { success: true }; // Nothing to delete

  try {
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    await addDoc(collection(db, 'cloudinary_deletions'), {
      publicId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking file for deletion:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Replace a file: mark old one for deletion, upload new one
 * @param {File} newFile - New file to upload
 * @param {string} oldPublicId - Public ID of old file to delete
 * @param {Object} uploadOptions - Options for uploadToCloudinary
 * @returns {Promise<{success: boolean, url: string, publicId: string}>}
 */
export const replaceFile = async (newFile, oldPublicId, uploadOptions) => {
  // Delete old file
  if (oldPublicId) {
    await markForDeletion(oldPublicId);
  }

  // Upload new file
  return uploadToCloudinary(newFile, uploadOptions);
};

// ═══════════════════════════════════════════════════════
//  URL TRANSFORMATION HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Get an optimized URL for a Cloudinary image
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @param {number} options.width - Desired width
 * @param {number} options.height - Desired height
 * @param {string} options.crop - Crop mode ('fill', 'fit', 'thumb')
 * @param {string} options.quality - Quality ('auto', 'auto:good', 'auto:best')
 * @returns {string} Optimized URL
 */
export const getOptimizedUrl = (url, options = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url;

  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  // Insert transformation before /upload/
  const transformation = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
  return url.replace('/upload/', `/upload/${transformation}/`);
};

/**
 * Get a thumbnail URL for a Cloudinary image
 * @param {string} url - Original Cloudinary URL
 * @param {number} size - Thumbnail size (default 80)
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (url, size = 80) => {
  return getOptimizedUrl(url, {
    width: size,
    height: size,
    crop: 'thumb',
    quality: 'auto:good',
  });
};

/**
 * Get a responsive URL for a Cloudinary image (auto width)
 * @param {string} url - Original Cloudinary URL
 * @param {number} maxWidth - Max width
 * @returns {string}
 */
export const getResponsiveUrl = (url, maxWidth = 800) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  const transformation = `w_${maxWidth},c_limit,q_auto,f_auto`;
  return url.replace('/upload/', `/upload/${transformation}/`);
};

/**
 * Get a blurred placeholder URL (for lazy loading)
 * @param {string} url - Original Cloudinary URL
 * @returns {string}
 */
export const getBlurPlaceholderUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/w_50,e_blur:800,q_10,f_auto/');
};
