import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';

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

const SCHOOL_ID = 'demo_pakistan_school';

// Demo Admin Account
const demoAdmin = {
  email: "demo_admin@taleemidunya.com",
  password: "passworddemo2121",
  role: "school-admin",
  name: "Demo Principal",
  schoolId: SCHOOL_ID,
  schoolName: "TaleemiDunya Model High School (Demo)"
};

// Pakistani Demo Data
const pakistaniStudents = [
  { name: "Ali Ahmed", rollNumber: "STU-001", class: "9", section: "A", gender: "Male", phone: "03001234567", city: "Lahore", fee: 3500 },
  { name: "Fatima Noor", rollNumber: "STU-002", class: "9", section: "A", gender: "Female", phone: "03211234567", city: "Karachi", fee: 3500 },
  { name: "Hamza Khan", rollNumber: "STU-003", class: "9", section: "B", gender: "Male", phone: "03331234567", city: "Islamabad", fee: 3500 },
  { name: "Ayesha Tariq", rollNumber: "STU-004", class: "9", section: "B", gender: "Female", phone: "03451234567", city: "Rawalpindi", fee: 3500 },
  { name: "Zainab Malik", rollNumber: "STU-005", class: "10", section: "A", gender: "Female", phone: "03011234567", city: "Faisalabad", fee: 4000 },
  { name: "Bilal Hassan", rollNumber: "STU-006", class: "10", section: "A", gender: "Male", phone: "03121234567", city: "Multan", fee: 4000 },
  { name: "Hira Shafiq", rollNumber: "STU-007", class: "10", section: "B", gender: "Female", phone: "03221234567", city: "Peshawar", fee: 4000 },
  { name: "Saad Ali", rollNumber: "STU-008", class: "10", section: "B", gender: "Male", phone: "03341234567", city: "Quetta", fee: 4000 },
  { name: "Sara Iqbal", rollNumber: "STU-009", class: "8", section: "A", gender: "Female", phone: "03461234567", city: "Lahore", fee: 3000 },
  { name: "Usman Raza", rollNumber: "STU-010", class: "8", section: "A", gender: "Male", phone: "03021234567", city: "Karachi", fee: 3000 },
  { name: "Maryam Jamil", rollNumber: "STU-011", class: "8", section: "B", gender: "Female", phone: "03131234567", city: "Islamabad", fee: 3000 },
  { name: "Talha Farooq", rollNumber: "STU-012", class: "8", section: "B", gender: "Male", phone: "03231234567", city: "Rawalpindi", fee: 3000 },
  { name: "Sana Mahmood", rollNumber: "STU-013", class: "7", section: "A", gender: "Female", phone: "03351234567", city: "Gujranwala", fee: 2500 },
  { name: "Zohaib Akhtar", rollNumber: "STU-014", class: "7", section: "A", gender: "Male", phone: "03471234567", city: "Sialkot", fee: 2500 },
  { name: "Amna Qureshi", rollNumber: "STU-015", class: "7", section: "B", gender: "Female", phone: "03031234567", city: "Bahawalpur", fee: 2500 },
  { name: "Fahad Junaid", rollNumber: "STU-016", class: "7", section: "B", gender: "Male", phone: "03141234567", city: "Sargodha", fee: 2500 },
  { name: "Maha Khalid", rollNumber: "STU-017", class: "6", section: "A", gender: "Female", phone: "03241234567", city: "Sukkur", fee: 2000 },
  { name: "Awais Qarni", rollNumber: "STU-018", class: "6", section: "A", gender: "Male", phone: "03361234567", city: "Hyderabad", fee: 2000 },
  { name: "Nida Siddiqui", rollNumber: "STU-019", class: "6", section: "B", gender: "Female", phone: "03481234567", city: "Abbottabad", fee: 2000 },
  { name: "Kashif Saeed", rollNumber: "STU-020", class: "6", section: "B", gender: "Male", phone: "03041234567", city: "Mardan", fee: 2000 }
];

const pakistaniStaff = [
  // Teachers
  { name: "Sir Muhammad Usman", role: "Teacher", department: "Science", phone: "03051234567", salary: 45000, joinedDate: "2023-01-15", city: "Lahore" },
  { name: "Madam Ayesha Rahman", role: "Teacher", department: "Mathematics", phone: "03151234567", salary: 48000, joinedDate: "2022-08-01", city: "Karachi" },
  { name: "Sir Tariq Jamil", role: "Teacher", department: "Urdu", phone: "03251234567", salary: 42000, joinedDate: "2023-03-10", city: "Islamabad" },
  { name: "Madam Zainab Abbas", role: "Teacher", department: "English", phone: "03371234567", salary: 46000, joinedDate: "2021-09-01", city: "Rawalpindi" },
  { name: "Sir Kamran Akmal", role: "Teacher", department: "Computer Science", phone: "03491234567", salary: 50000, joinedDate: "2024-02-15", city: "Lahore" },
  { name: "Madam Sana Mir", role: "Teacher", department: "Physics", phone: "03061234567", salary: 49000, joinedDate: "2023-11-01", city: "Faisalabad" },
  { name: "Sir Babar Azam", role: "Teacher", department: "Physical Education", phone: "03161234567", salary: 40000, joinedDate: "2022-05-15", city: "Multan" },
  { name: "Madam Nida Dar", role: "Teacher", department: "Chemistry", phone: "03261234567", salary: 47000, joinedDate: "2021-04-10", city: "Peshawar" },
  { name: "Sir Shoaib Akhtar", role: "Teacher", department: "History", phone: "03381234567", salary: 43000, joinedDate: "2020-08-20", city: "Quetta" },
  { name: "Madam Bismah Maroof", role: "Teacher", department: "Biology", phone: "03071234567", salary: 48000, joinedDate: "2024-01-05", city: "Karachi" },
  
  // Non-Teaching Staff
  { name: "Abdul Ghafoor", role: "Guard", department: "Security", phone: "03171234567", salary: 25000, joinedDate: "2019-01-01", city: "Lahore" },
  { name: "Rehmat Ali", role: "Peon", department: "Support", phone: "03271234567", salary: 22000, joinedDate: "2020-03-15", city: "Lahore" },
  { name: "Bashir Ahmed", role: "Driver", department: "Transport", phone: "03391234567", salary: 28000, joinedDate: "2021-06-10", city: "Lahore" },
  { name: "Shazia Bibi", role: "Cleaner", department: "Maintenance", phone: "03081234567", salary: 20000, joinedDate: "2022-02-01", city: "Lahore" },
  { name: "Sajid Khan", role: "Accountant", department: "Accounts", phone: "03181234567", salary: 45000, joinedDate: "2023-09-01", city: "Lahore" },
  { name: "Imran Qureshi", role: "Librarian", department: "Library", phone: "03281234567", salary: 35000, joinedDate: "2021-11-15", city: "Lahore" },
  { name: "Naseem Shah", role: "IT Assistant", department: "IT", phone: "03401234567", salary: 38000, joinedDate: "2024-04-01", city: "Lahore" },
  { name: "Zubaida Begum", role: "Maid", department: "Maintenance", phone: "03091234567", salary: 20000, joinedDate: "2018-05-10", city: "Lahore" },
  { name: "Ghulam Rasool", role: "Gardener", department: "Maintenance", phone: "03191234567", salary: 22000, joinedDate: "2017-08-01", city: "Lahore" },
  { name: "Waqar Younis", role: "Clerk", department: "Administration", phone: "03291234567", salary: 30000, joinedDate: "2020-10-15", city: "Lahore" }
];

const generateDemoData = async () => {
  console.log("Starting Demo Pakistan Data Generator...");
  
  // 1. Create Demo Admin Account
  try {
    console.log(`\nRegistering Demo Admin in Auth: ${demoAdmin.email}...`);
    let uid = "";
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, demoAdmin.email, demoAdmin.password);
      uid = userCredential.user.uid;
      console.log(`Created new auth user with UID: ${uid}`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log("Email already in use, signing in to retrieve UID...");
        const userCredential = await signInWithEmailAndPassword(auth, demoAdmin.email, demoAdmin.password);
        uid = userCredential.user.uid;
        console.log(`Retrieved existing UID: ${uid}`);
      } else {
        throw authError;
      }
    }

    console.log(`Writing profile to Firestore 'users' for UID ${uid}...`);
    await setDoc(doc(db, "users", uid), {
      email: demoAdmin.email,
      name: demoAdmin.name,
      role: demoAdmin.role,
      schoolId: demoAdmin.schoolId,
      schoolName: demoAdmin.schoolName,
      createdAt: new Date().toISOString()
    });
    console.log(`Success: Registered Demo Admin!`);
  } catch (error) {
    console.error(`Failed to register demo admin:`, error.message);
  }

  // 2. Insert Students
  console.log(`\nInserting 20 Pakistani Students...`);
  const studentsCol = collection(db, "students");
  for (const student of pakistaniStudents) {
    try {
      await addDoc(studentsCol, {
        ...student,
        schoolId: SCHOOL_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`Added student: ${student.name}`);
    } catch (e) {
      console.error(`Error adding student ${student.name}:`, e.message);
    }
  }

  // 3. Insert Staff
  console.log(`\nInserting 20 Pakistani Staff Members (10 Teachers, 10 Staff)...`);
  const staffCol = collection(db, "staff");
  for (const person of pakistaniStaff) {
    try {
      await addDoc(staffCol, {
        ...person,
        schoolId: SCHOOL_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`Added staff: ${person.name} (${person.role})`);
    } catch (e) {
      console.error(`Error adding staff ${person.name}:`, e.message);
    }
  }
  
  console.log("\nDemo Data successfully injected!");
  process.exit(0);
};

generateDemoData();
