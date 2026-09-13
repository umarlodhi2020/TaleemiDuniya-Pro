const fs = require('fs');
const examsContent = fs.readFileSync('src/pages/school-admin/Exams.jsx', 'utf8');

// 1. Extract the Add Subject Tab JSX
const tabStart = examsContent.indexOf("{activeTab === 'add-subject' && (");
if (tabStart === -1) {
  console.log("Could not find add-subject tab block.");
  process.exit(1);
}

// Find the end of the tab block by matching braces/parentheses.
let openParens = 1; // Since we start after `&& (`
let i = tabStart + "{activeTab === 'add-subject' && (".length;
while(i < examsContent.length && openParens > 0) {
  if (examsContent[i] === '(') openParens++;
  if (examsContent[i] === ')') openParens--;
  i++;
}
const tabEnd = i;

// Note: we remove the first div if it was wrapped just for the condition, but wait, the JSX is:
// {activeTab === 'add-subject' && (
//   <div className="space-y-6 animate-fade-in">
//   ...
//   </div>
// )}
const addSubjectJSX = examsContent.slice(tabStart + "{activeTab === 'add-subject' && (".length, tabEnd - 1).trim();

// 2. We need the state variables and functions that were injected for Add Subject:
// newSubject, setNewSubject
// handleAddSubject
// handleEditSubject
// handleDeleteSubject

const stateStart = examsContent.indexOf("const [newSubject, setNewSubject] = useState");
let stateEnd = examsContent.indexOf("const getClasses = () => {"); // Find where the next unrelated function starts
if(stateEnd === -1) stateEnd = examsContent.indexOf("const handleGenerateAdmitCards");
const stateAndFunctions = examsContent.slice(stateStart, stateEnd).trim();

// 3. We also need existingSubjects (from Firebase DB state)
// Actually we can just re-fetch them locally in AddSubject.jsx or use SchoolContext (which has subjects!)
// Wait, SchoolContext provides { subjects, setSubjects } or they are fetched locally.
// In my previous injection I just used `subjects` which is already fetched in Exams.jsx.
// In `AddSubject.jsx`, we should fetch them. Let's see how Exams.jsx gets them.
// Exams fetches everything in a big useEffect.
// I will just write `AddSubject.jsx` with its own simple useEffect to fetch subjects, or use `SchoolContext`.
// Since I want to make sure it works perfectly, I'll generate the full React component string here.

const addSubjectComponent = `import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { addDoc, collection, serverTimestamp, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Edit2 } from 'lucide-react';

const AddSubject = () => {
  const { userData } = useAuth();
  const { schoolData } = useSchool();
  const [subjects, setSubjects] = useState([]);
  
  // Realtime fetch subjects
  useEffect(() => {
    if (!userData?.schoolId) return;
    const unsub = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => s.schoolId === userData.schoolId);
      setSubjects(data);
    });
    return () => unsub();
  }, [userData]);

  // Make classes available for the form
  const getClasses = () => {
    return schoolData?.classes || [];
  };

  ` + stateAndFunctions + `

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto">
       <h1 className="text-2xl md:text-3xl font-black text-white mb-6">Subject Management</h1>
       ` + addSubjectJSX + `
    </div>
  );
};

export default AddSubject;
`;

fs.writeFileSync('src/pages/school-admin/AddSubject.jsx', addSubjectComponent, 'utf8');
console.log('AddSubject.jsx created.');

// 4. Now modify App.jsx to add the route
let appContent = fs.readFileSync('src/App.jsx', 'utf8');
if (!appContent.includes('AddSubject')) {
  // Add import
  appContent = appContent.replace(
    "import Exams from './pages/school-admin/Exams';", 
    "import Exams from './pages/school-admin/Exams';\nimport AddSubject from './pages/school-admin/AddSubject';"
  );
  // Add route near Exams
  appContent = appContent.replace(
    '<Route path="exams" element={<Exams />} />',
    '<Route path="exams" element={<Exams />} />\n        <Route path="add-subject" element={<AddSubject />} />'
  );
  fs.writeFileSync('src/App.jsx', appContent, 'utf8');
  console.log('App.jsx modified.');
}

// 5. Modify Sidebar.jsx to link to /school-admin/add-subject
let sidebarContent = fs.readFileSync('src/components/layout/Sidebar.jsx', 'utf8');
sidebarContent = sidebarContent.replace(
  "path: '/school-admin/exams?tab=add-subject'",
  "path: '/school-admin/add-subject'"
);
fs.writeFileSync('src/components/layout/Sidebar.jsx', sidebarContent, 'utf8');
console.log('Sidebar.jsx modified.');

// 6. Remove add-subject from Exams.jsx
// Remove the tab object
let newExams = examsContent.replace(
  /\{ id: 'add-subject', label: '2\. Add Subject',.*\},\n/,
  ""
);
// Remove the state variables and functions
newExams = newExams.replace(stateAndFunctions, "");
// Remove the JSX block
newExams = newExams.replace(examsContent.slice(tabStart, tabEnd), "");
fs.writeFileSync('src/pages/school-admin/Exams.jsx', newExams, 'utf8');
console.log('Exams.jsx modified.');
