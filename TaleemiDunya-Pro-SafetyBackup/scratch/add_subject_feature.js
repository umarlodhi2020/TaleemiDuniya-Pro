// Handlers to inject
  const [editingSubjectId, setEditingSubjectId] = useState(null);

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.name || !newSubject.classId) {
      alert("Subject Name and Class are required.");
      return;
    }
    setSavingSubject(true);
    try {
      if (editingSubjectId) {
        await setDoc(doc(db, 'subjects', editingSubjectId), {
          ...newSubject,
          schoolId: userData.schoolId,
          updatedAt: serverTimestamp()
        }, { merge: true });
        alert('Subject updated successfully!');
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...newSubject,
          schoolId: userData.schoolId,
          createdAt: serverTimestamp()
        });
        alert('Subject saved successfully!');
      }
      setNewSubject({ name: '', classId: '', totalMarks: 100, theoryMarks: 75, practicalMarks: 25, passingPct: 33 });
      setEditingSubjectId(null);
    } catch (err) {
      console.error(err);
      alert('Error saving subject');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleEditSubject = (subject) => {
    setNewSubject({
      name: subject.name || '',
      classId: subject.classId || '',
      totalMarks: subject.totalMarks || 100,
      theoryMarks: subject.theoryMarks || 75,
      practicalMarks: subject.practicalMarks || 25,
      passingPct: subject.passingPct || 33
    });
    setEditingSubjectId(subject.id);
  };

  const handleDeleteSubject = async (subjectId) => {
    if (window.confirm("Are you sure you want to delete this subject?")) {
      try {
        await deleteDoc(doc(db, 'subjects', subjectId));
        alert("Subject deleted successfully");
      } catch (err) {
        console.error(err);
        alert("Error deleting subject");
      }
    }
  };

// UI Block to inject before {activeTab === 'list' && (
          {activeTab === 'add-subject' && (
            <div className="space-y-6 animate-fade-in">
              <GlassCard className="p-8 bg-gradient-to-b from-dark-card to-dark-bg border border-dark-border/80">
                <div className="flex items-center justify-between pb-4 border-b border-dark-border/60 mb-6">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <FileText size={18} />
                    </span>
                    {editingSubjectId ? 'Edit Subject' : 'Add New Subject'}
                  </h2>
                </div>
                
                <form onSubmit={handleSaveSubject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider block">Class <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={newSubject.classId}
                        onChange={(e) => setNewSubject({ ...newSubject, classId: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c} value={c}>{formatClassName(c)}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider block">Subject Name <span className="text-red-500">*</span></label>
                      <input
                        required
                        type="text"
                        list="subject-suggestions"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                        placeholder="e.g. Mathematics"
                      />
                      <datalist id="subject-suggestions">
                        {[...new Set(subjects.map(s => s.name))].map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider block">Total Marks</label>
                      <input
                        type="number"
                        value={newSubject.totalMarks}
                        onChange={(e) => setNewSubject({ ...newSubject, totalMarks: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider block">Theory Marks</label>
                      <input
                        type="number"
                        value={newSubject.theoryMarks}
                        onChange={(e) => setNewSubject({ ...newSubject, theoryMarks: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider block">Practical Marks</label>
                      <input
                        type="number"
                        value={newSubject.practicalMarks}
                        onChange={(e) => setNewSubject({ ...newSubject, practicalMarks: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider block">Passing %</label>
                      <input
                        type="number"
                        value={newSubject.passingPct}
                        onChange={(e) => setNewSubject({ ...newSubject, passingPct: e.target.value })}
                        className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-dark-border/50 gap-3">
                    {editingSubjectId && (
                      <button
                        type="button"
                        onClick={() => { setEditingSubjectId(null); setNewSubject({ name: '', classId: '', totalMarks: 100, theoryMarks: 75, practicalMarks: 25, passingPct: 33 }); }}
                        className="px-6 py-2.5 bg-dark-hover text-white font-bold text-sm rounded-xl hover:bg-dark-border transition-all cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={savingSubject}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      {savingSubject ? 'Saving...' : (editingSubjectId ? 'Update Subject' : 'Save Subject')}
                    </button>
                  </div>
                </form>
              </GlassCard>

              {/* Subject List Table */}
              <GlassCard className="overflow-hidden bg-gradient-to-b from-dark-card to-dark-bg border border-dark-border/80">
                <div className="p-6 border-b border-dark-border/60">
                   <h3 className="text-lg font-black text-white">Existing Subjects</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-dark-muted uppercase bg-dark-hover/50 font-black border-b border-dark-border">
                      <tr>
                        <th className="px-6 py-4">Class</th>
                        <th className="px-6 py-4">Subject Name</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Theory</th>
                        <th className="px-6 py-4">Practical</th>
                        <th className="px-6 py-4">Pass %</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/50 text-gray-300 font-medium">
                      {subjects.map(sub => (
                        <tr key={sub.id} className="hover:bg-dark-hover/30 transition-colors">
                          <td className="px-6 py-4"><span className="px-2 py-1 bg-dark-bg border border-dark-border rounded-md text-xs font-bold">{formatClassName(sub.classId)}</span></td>
                          <td className="px-6 py-4 text-white font-bold">{sub.name}</td>
                          <td className="px-6 py-4">{sub.totalMarks}</td>
                          <td className="px-6 py-4">{sub.theoryMarks}</td>
                          <td className="px-6 py-4">{sub.practicalMarks}</td>
                          <td className="px-6 py-4">{sub.passingPct}%</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditSubject(sub)} className="text-blue-400 hover:text-blue-300 p-1 cursor-pointer" title="Edit">
                              <i className="fa-solid fa-pen-to-square"></i> Edit
                            </button>
                            <button onClick={() => handleDeleteSubject(sub.id)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer" title="Delete">
                              <i className="fa-solid fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {subjects.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-dark-muted">No subjects found. Please add subjects first.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
