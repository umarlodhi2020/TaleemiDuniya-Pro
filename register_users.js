import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDDVwn-o7X_R4JmJs8a8wE7QjFOrc21jOQ",
  authDomain: "taleemidunya-pro-ed44e.firebaseapp.com",
  projectId: "taleemidunya-pro-ed44e",
  storageBucket: "taleemidunya-pro-ed44e.firebasestorage.app",
  messagingSenderId: "909284889749",
  appId: "1:909284889749:web:c73f707ba6756c1823779c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const usersToCreate = [
  {
    email: "superadmin@lodhischool.com",
    password: "passwordlodhi2121",
    role: "super-admin",
    name: "LODHI SUPER ADMIN",
    schoolId: "system"
  },
  {
    email: "schooladmin1@lodhischool.com",
    password: "passwordlodhi2121",
    role: "school-admin",
    name: "LODHI SCHOOL ADMIN",
    schoolId: "lodhi-school-id"
  },
  {
    email: "teacheradmin1@lodhischool.com",
    password: "passwordlodhi2121",
    role: "teacher",
    name: "LODHI TEACHER",
    schoolId: "lodhi-school-id"
  },
  {
    email: "studentadmin1@lodhischool.com",
    password: "passwordlodhi2121",
    role: "student",
    name: "LODHI STUDENT",
    schoolId: "lodhi-school-id"
  }
];

const registerAll = async () => {
  console.log("Starting Firebase real account provisioning...");
  
  for (const user of usersToCreate) {
    try {
      console.log(`\nRegistering user in Auth: ${user.email}...`);
      let uid = "";
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
        uid = userCredential.user.uid;
        console.log(`Created new auth user with UID: ${uid}`);
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          console.log("Email already in use, signing in to retrieve UID...");
          const userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
          uid = userCredential.user.uid;
          console.log(`Retrieved existing UID: ${uid}`);
        } else {
          throw authError;
        }
      }

      console.log(`Writing profile to Firestore collection 'users' for UID ${uid}...`);
      await setDoc(doc(db, "users", uid), {
        email: user.email,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        createdAt: new Date().toISOString()
      });
      console.log(`Success: Registered and profiled ${user.email} as ${user.role}!`);
    } catch (error) {
      console.error(`Failed to register ${user.email}:`, error.message);
    }
  }

  console.log("\nAll account provisions completed!");
  process.exit(0);
};

registerAll();
