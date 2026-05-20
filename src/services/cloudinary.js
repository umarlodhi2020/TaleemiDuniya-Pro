/**
 * Cloudinary Upload Service for TaleemiDunya-Pro
 * Handles: Profile photos, documents (PDF), certificates, logos
 * Features: Compression, optimization, folder organization, deletion
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dz0mfu4al';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'taleemidunya_unsigned';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

/**
 * Upload a file to Cloudinary with optimization
 * @param {File} file - The file to upload
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder path (e.g., 'students/photos')
 * @param {string} options.publicId - Custom public ID for the file
 * @param {Function} options.onProgress - Progress callback (0-100)
 * @param {string} options.resourceType - 'image', 'raw' (for PDFs), or 'auto'
 * @param {Object} options.transformation - Cloudinary transformations
 * @returns {Promise<{success: boolean, url: string, publicId: string, error?: string}>}
 */
export const uploadToCloudinary = async (file, options = {}) => {
  const {
    folder = 'taleemidunya',
    publicId = null,
    onProgress = null,
    transformation = null,
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Apply transformations for images (auto quality, format, resize)
    if (file.type?.startsWith('image/')) {
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
  });
};

/**
 * Delete a file from Cloudinary
 * NOTE: For unsigned presets, deletion must happen server-side.
 * This function stores the publicId for later cleanup.
 * In a production app, use a Firebase Cloud Function to handle deletion.
 * @param {string} publicId - The public ID of the file to delete
 */
export const markForDeletion = async (publicId) => {
  // Store deletion request in Firestore for server-side cleanup
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
