import React, { useState } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords, updateRecord } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

export default function Migration() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
  };

  const generateUsername = (name) => {
    const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return base ? `${base}${randomSuffix}` : null;
  };

  const handleMigration = async () => {
    setLogs([]);
    setLoading(true);

    const schoolId = userData?.schoolId;
    if (!schoolId) {
      addLog('ERROR: School ID not found. Please make sure you are logged in as School Admin.');
      setLoading(false);
      return;
    }

    addLog(`School ID: ${schoolId}`);
    addLog('Starting migration...');

    try {
      // Migrate Students
      addLog('---- Fetching students... ----');
      const students = await getRecords('students', schoolId);
      addLog(`Found ${students.length} total students`);
      let studentUpdates = 0;
      for (const student of students) {
        const hasValidUsername = student.username && student.username.replace(/[0-9]/g, '').length >= 2;
        if (!hasValidUsername && student.name) {
          const newUsername = generateUsername(student.name);
          if (newUsername) {
            await updateRecord('students', student.id, { username: newUsername });
            studentUpdates++;
            addLog(`✅ Student: ${student.name}  →  ${newUsername}`);
          }
        }
      }
      addLog(`Student migration done: ${studentUpdates} updated.`);

      // Migrate Staff
      addLog('---- Fetching staff... ----');
      const staff = await getRecords('staff', schoolId);
      addLog(`Found ${staff.length} total staff`);
      let staffUpdates = 0;
      for (const s of staff) {
        const hasValidUsername = s.username && s.username.replace(/[0-9]/g, '').length >= 2;
        if (!hasValidUsername && s.name) {
          const newUsername = generateUsername(s.name);
          if (newUsername) {
            await updateRecord('staff', s.id, { username: newUsername });
            staffUpdates++;
            addLog(`✅ Staff: ${s.name}  →  ${newUsername}`);
          }
        }
      }
      addLog(`Staff migration done: ${staffUpdates} updated.`);

      // Migrate Parents (parentUsername is stored inside student records)
      addLog('---- Fetching parents (from students)... ----');
      const allStudentsForParents = await getRecords('students', schoolId);
      // Group by fatherName + phone to avoid duplicate updates for siblings
      const processedParents = new Set();
      let parentUpdates = 0;
      for (const student of allStudentsForParents) {
        const hasValidUsername = student.parentUsername && student.parentUsername.replace(/[0-9]/g, '').length >= 2;
        const nameToUse = student.fatherName;
        const parentKey = `${student.fatherName}_${student.parentPhone || student.phone || ''}`;
        
        if (!hasValidUsername && nameToUse && !processedParents.has(parentKey)) {
          const newUsername = generateUsername(nameToUse);
          if (newUsername) {
            await updateRecord('students', student.id, { parentUsername: newUsername });
            processedParents.add(parentKey);
            parentUpdates++;
            addLog(`✅ Parent: ${nameToUse}  →  ${newUsername}`);
          }
        }
      }
      addLog(`Parent migration done: ${parentUpdates} updated.`);

      addLog('');
      addLog('🎉 Migration completed successfully!');
      addLog(`Total Updated: ${studentUpdates} students, ${staffUpdates} staff, ${parentUpdates} parents`);
    } catch (err) {
      addLog('ERROR: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-dark-muted">Database Migration</h1>
          <p className="text-dark-muted mt-2">Update missing or incomplete usernames for old students, staff, and parents.</p>
        </div>
        {userData?.schoolId && (
          <span className="text-xs text-green-400 font-mono border border-green-500/30 bg-green-500/10 px-3 py-1 rounded-full">
            School ID: {userData.schoolId}
          </span>
        )}
      </div>

      <GlassCard className="p-6">
        <button 
          onClick={handleMigration}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            '▶ Run Auto-Generate Username Script'
          )}
        </button>

        <div className="mt-6 bg-black/60 p-4 rounded-xl border border-dark-border min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-sm text-green-400">
          {logs.map((log, i) => (
            <div key={i} className={`mb-1 ${log.startsWith('ERROR') ? 'text-red-400' : log.startsWith('----') ? 'text-yellow-400 mt-3' : log.startsWith('🎉') || log.startsWith('Total') ? 'text-blue-400 font-bold' : ''}`}>
              {log}
            </div>
          ))}
          {logs.length === 0 && <span className="text-dark-muted">Logs will appear here after clicking run...</span>}
        </div>
      </GlassCard>
    </div>
  );
}
