import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const OLD_CLOUD_NAME = 'dz0mfu4al';
const NEW_CLOUD_NAME = 'dddqt9xkt';
const UPLOAD_PRESET = 'taleemidunya_unsigned';

async function uploadToNewCloudinary(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image: ' + response.statusText);
    const blob = await response.blob();
    
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', UPLOAD_PRESET);
    
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${NEW_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData
    });
    
    const result = await uploadRes.json();
    if (result.secure_url) {
      return { url: result.secure_url, publicId: result.public_id };
    } else {
      console.error("Upload error:", result);
      return null;
    }
  } catch(e) {
    console.error("Error migrating image:", imageUrl, e.message);
    return null;
  }
}

async function migrateCollection(collectionName, urlField, publicIdField) {
  console.log(`Migrating ${collectionName}...`);
  const snapshot = await getDocs(collection(db, collectionName));
  let count = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const photoUrl = data[urlField];
    
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.includes(OLD_CLOUD_NAME)) {
      console.log(`Found old URL for doc ${docSnap.id}: ${photoUrl}`);
      const newPhoto = await uploadToNewCloudinary(photoUrl);
      if (newPhoto) {
        await updateDoc(doc(db, collectionName, docSnap.id), {
          [urlField]: newPhoto.url,
          [publicIdField]: newPhoto.publicId
        });
        console.log(`Updated doc ${docSnap.id} with new URL: ${newPhoto.url}`);
        count++;
      }
    }
  }
  return count;
}

export const runCloudinaryMigration = async (onProgress) => {
  try {
    onProgress('Starting migration for students...');
    let studentsCount = await migrateCollection('students', 'photoUrl', 'photoPublicId');
    
    onProgress(`Migrated ${studentsCount} students. Starting migration for staff...`);
    let staffCount = await migrateCollection('staff', 'photoUrl', 'photoPublicId');
    
    onProgress(`Migrated ${staffCount} staff. Migration complete! Total: ${studentsCount + staffCount}`);
    return { success: true, count: studentsCount + staffCount };
  } catch (err) {
    console.error(err);
    onProgress('Migration failed: ' + err.message);
    return { success: false, error: err };
  }
};
