const fs = require('fs');
const path = 'src/pages/school-admin/Exams.jsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const featureLines = fs.readFileSync('scratch/add_subject_feature.js', 'utf8').split('\n');

const handlers = [];
const uiBlock = [];
let mode = 0; // 0 = start, 1 = handlers, 2 = uiBlock

for (const line of featureLines) {
  if (line.includes('// Handlers to inject')) {
    mode = 1;
    continue;
  }
  if (line.includes('// UI Block to inject before {activeTab === \'list\' && (')) {
    mode = 2;
    continue;
  }
  if (mode === 1) handlers.push(line);
  if (mode === 2) uiBlock.push(line);
}

const newLines = [];
let injectedHandlers = false;
let injectedUI = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  newLines.push(line);
  
  if (!injectedHandlers && line.includes('const [savingSubject, setSavingSubject] = useState(false);')) {
    newLines.push(...handlers);
    injectedHandlers = true;
  }
  
  // We want to insert right BEFORE `{activeTab === 'list' && (`
  // Let's check the next line to insert before it
  if (!injectedUI && i + 1 < lines.length && lines[i+1].includes("{activeTab === 'list' && (")) {
    newLines.push(...uiBlock);
    injectedUI = true;
  }
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Injected successfully! Handlers:', injectedHandlers, 'UI:', injectedUI);
