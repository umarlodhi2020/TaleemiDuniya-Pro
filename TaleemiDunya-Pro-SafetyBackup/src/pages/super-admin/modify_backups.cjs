const fs = require('fs');
let code = fs.readFileSync('SchoolBackups.jsx', 'utf8');

code = code.replace(/const SchoolsManager = \(\) => \{/g, 'const SchoolBackups = () => {');
code = code.replace(/export default SchoolsManager/g, 'export default SchoolBackups');

code = code.replace(/s\.status !== 'deleted'/g, "s.status === 'deleted'");

code = code.replace(/const toggleStatus = async[\s\S]*?const deleteSchool = async \(id\) => \{[\s\S]*?\}\s*\};/m, `
  const restoreSchool = async (id) => {
    setActionLoading(id + '-restore');
    try {
      await updateDoc(doc(db, 'schools', id), {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      setSchools(prev => prev.filter(s => s.id !== id));
      showToast('success', 'School restored successfully.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to restore school. Check permissions.');
    } finally {
      setActionLoading(null);
    }
  };

  const permanentDeleteSchool = async (id) => {
    setActionLoading(id + '-pdelete');
    try {
      await deleteDoc(doc(db, 'schools', id));
      setSchools(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
      showToast('success', 'School permanently deleted.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Failed to permanently delete school.');
    } finally {
      setActionLoading(null);
    }
  };
`);

code = code.replace(/<Link\s+to="\/super-admin\/schools\/add"[\s\S]*?<\/Link>/m, '');

code = code.replace(/<Building2 size=\{28\} className="text-primary-600" \/>\s*Schools/g, '<Database size={28} className="text-red-600" /> School Backups');

code = code.replace(/<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">\s*<div className="flex items-center justify-end gap-3">[\s\S]*?<\/div>\s*<\/td>/g, (match) => {
  if (match.includes('actions')) return match;
  return `
<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
  <div className="flex items-center justify-end gap-3">
    <button
      onClick={() => restoreSchool(school.id)}
      disabled={actionLoading === school.id + '-restore'}
      title="Restore School"
      className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded-lg"
    >
      <RefreshCw size={18} className={actionLoading === school.id + '-restore' ? 'animate-spin' : ''} />
    </button>
    <button
      onClick={() => setDeleteConfirm(school.id)}
      disabled={actionLoading === school.id + '-pdelete'}
      title="Permanent Delete"
      className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"
    >
      <Trash2 size={18} className={actionLoading === school.id + '-pdelete' ? 'animate-spin' : ''} />
    </button>
  </div>
</td>`;
});

code = code.replace(/onClick=\{.*?deleteSchool.*?}/g, 'onClick={() => permanentDeleteSchool(deleteConfirm)}');

if (!code.includes('Database')) {
  code = code.replace(/import \{.*?\} from 'lucide-react';/, (m) => m.replace('}', ', Database, RefreshCw }'));
}

fs.writeFileSync('SchoolBackups.jsx', code);
