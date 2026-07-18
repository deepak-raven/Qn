import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Database, 
  FileText, 
  HardDrive, 
  Trash2, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  BookOpen, 
  ChevronRight 
} from 'lucide-react';

export default function AdminTab({
  API_BASE,
  fetchSubjects,
  loadQuestionsForSubject,
  setSelectedSubCode,
  setActiveTab,
  auth
}) {
  const [stats, setStats] = useState({
    total_subjects: 0,
    total_questions: 0,
    total_users: 0,
    total_storage_bytes: 0,
    total_storage_formatted: '0 B'
  });
  const [users, setUsers] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState('overview'); // 'overview' | 'uploads'
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { code, semester, name }

  const token = auth?.token || localStorage.getItem('jec_auth_token') || '';
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  useEffect(() => {
    loadAdminData();
  }, [API_BASE, token]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, uploadsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/users`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/uploads`, { headers: authHeaders })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (uploadsRes.ok) setUploads(await uploadsRes.json());
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestionBank = async (code, semester) => {
    try {
      const res = await fetch(`${API_BASE}/admin/subjects/${code}/${semester}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        setDeleteConfirm(null);

        await loadAdminData();
        if (fetchSubjects) fetchSubjects();
      } else {
        const err = await res.json();
        alert(`Failed to delete: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const filteredUploads = uploads.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.code.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.uploader_name && u.uploader_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
      <div className="glass-panel card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Admin Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={24} /> Admin Storage & User Control Center
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Monitor system storage usage, track uploads per user, and manage question bank databases.
            </p>
          </div>
          <button 
            className="btn" 
            onClick={loadAdminData} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>

        {/* Top Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '10px' }}>
              <Users size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Uploaders</span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem' }}>{stats.total_users}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '10px' }}>
              <BookOpen size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Question Banks</span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem' }}>{stats.total_subjects}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.75rem', borderRadius: '10px' }}>
              <Database size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Questions Stored</span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem' }}>{stats.total_questions}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '10px' }}>
              <HardDrive size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Disk Storage</span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem' }}>{stats.total_storage_formatted}</h3>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn ${activeSubView === 'overview' ? 'btn-primary' : ''}`}
            onClick={() => setActiveSubView('overview')}
            style={{ fontSize: '0.85rem' }}
          >
            User Storage Breakdown
          </button>
          <button
            className={`btn ${activeSubView === 'uploads' ? 'btn-primary' : ''}`}
            onClick={() => setActiveSubView('uploads')}
            style={{ fontSize: '0.85rem' }}
          >
            All Question Banks ({uploads.length})
          </button>
        </div>

        {/* SUB-VIEW 1: User Storage Breakdown */}
        {activeSubView === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Storage Used Per User / Faculty Uploader
            </h4>
            
            {users.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No uploads found yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Uploader / User Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Question Banks</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Questions</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Disk Storage Used</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Uploaded Subjects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {user.uploader_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{user.subjects_count} QB(s)</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{user.questions_count} questions</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{user.storage_formatted}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {user.subjects.map((s, sIdx) => (
                              <span 
                                key={sIdx} 
                                className="tag tag-unit"
                                style={{ fontSize: '0.7rem', cursor: 'pointer' }}
                                onClick={() => {
                                  setSelectedSubCode(s.code);
                                  loadQuestionsForSubject(s.code, s.semester);
                                  setActiveTab('questions');
                                }}
                                title="Click to view workspace"
                              >
                                {s.code} ({s.questions_count}Q)
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUB-VIEW 2: All Question Banks Management */}
        {activeSubView === 'uploads' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by subject code, subject name, or uploader..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.2rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Subject Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Semester</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Uploader</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Questions</th>
                    <th style={{ padding: '0.75rem 1rem' }}>File Size</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUploads.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No question banks matching search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUploads.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{item.code}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{item.name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{item.semester} (Reg {item.regulation})</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--primary)', fontWeight: 600 }}>{item.uploader_name}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{item.questions_count}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{item.file_size_formatted}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedSubCode(item.code);
                                loadQuestionsForSubject(item.code, item.semester);
                                setActiveTab('questions');
                              }}
                            >
                              Open Workspace
                            </button>
                            <button
                              className="btn"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                              onClick={() => setDeleteConfirm(item)}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-panel card-body" style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#dc2626' }}>
                <Trash2 size={24} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Delete Question Bank?</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to delete <strong>[{deleteConfirm.code}] {deleteConfirm.name}</strong> uploaded by <strong>{deleteConfirm.uploader_name}</strong>?
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                This will permanently delete all {deleteConfirm.questions_count} parsed questions and the stored document file.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button 
                  className="btn" 
                  style={{ background: '#dc2626', color: '#fff' }}
                  onClick={() => handleDeleteQuestionBank(deleteConfirm.code, deleteConfirm.semester)}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
