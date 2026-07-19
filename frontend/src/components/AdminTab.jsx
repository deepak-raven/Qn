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
  UserPlus,
  UserCheck,
  X
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
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null); // username string

  // Add user modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [submittingUser, setSubmittingUser] = useState(false);

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

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim() || !newPassword) {
      alert("Please fill in username, full name, and password.");
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          name: newName.trim(),
          password: newPassword,
          role: newRole
        })
      });

      if (res.ok) {
        setShowAddUserModal(false);
        setNewUsername('');
        setNewName('');
        setNewPassword('');
        setNewRole('user');
        await loadAdminData();
      } else {
        const err = await res.json();
        alert(`Failed to create user: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (username) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${username}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        setDeleteUserConfirm(null);
        await loadAdminData();
      } else {
        const err = await res.json();
        alert(`Failed to delete user: ${err.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={24} /> Admin Storage & User Control Center
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Monitor system storage usage, manage users, and delete question bank databases.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddUserModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <UserPlus size={16} /> Add New User
            </button>
            <button 
              type="button"
              className="btn" 
              onClick={loadAdminData} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Top Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '10px' }}>
              <Users size={28} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Users</span>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.4rem' }}>{users.length}</h3>
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
            Registered Users & Storage ({users.length})
          </button>
          <button
            className={`btn ${activeSubView === 'uploads' ? 'btn-primary' : ''}`}
            onClick={() => setActiveSubView('uploads')}
            style={{ fontSize: '0.85rem' }}
          >
            All Question Banks ({uploads.length})
          </button>
        </div>

        {/* SUB-VIEW 1: User Storage Breakdown & User Removal */}
        {activeSubView === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                System Users & Account Management
              </h4>
            </div>
            
            {users.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No users found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>User / Faculty Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Question Banks</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Total Questions</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Storage Used</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{user.uploader_name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)' }}>@{user.username}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span className="tag tag-unit" style={{
                            background: user.role === 'admin' ? '#fee2e2' : '#e0e7ff',
                            color: user.role === 'admin' ? '#dc2626' : '#4338ca'
                          }}>
                            {user.role === 'admin' ? 'Administrator' : user.role === 'guest' ? 'Guest Uploader' : 'Faculty'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{user.subjects_count} QB(s)</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{user.questions_count} questions</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{user.storage_formatted}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          {user.role !== 'admin' && user.username !== 'admin' ? (
                            <button
                              type="button"
                              className="btn"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                              onClick={() => setDeleteUserConfirm(user.username)}
                              title="Delete user account"
                            >
                              <Trash2 size={13} /> Remove User
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dimmed)', fontStyle: 'italic' }}>System Admin</span>
                          )}
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

        {/* Add User Modal */}
        {showAddUserModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-panel card-body" style={{ width: '450px', background: '#ffffff', borderRadius: '8px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={20} /> Register New System User
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Username ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. karthick"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. Karthick"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Account Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Set secure password..."
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Role Access</label>
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                  >
                    <option value="user">Faculty Uploader</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowAddUserModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingUser}
                  >
                    {submittingUser ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Question Bank Confirmation Modal */}
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

        {/* Delete User Confirmation Modal */}
        {deleteUserConfirm && (
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
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Delete User Account?</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
                Are you sure you want to delete user account <strong>{deleteUserConfirm}</strong>?
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                This user will no longer be able to log in to the Question Paper Generator system.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn" onClick={() => setDeleteUserConfirm(null)}>
                  Cancel
                </button>
                <button 
                  className="btn" 
                  style={{ background: '#dc2626', color: '#fff' }}
                  onClick={() => handleDeleteUser(deleteUserConfirm)}
                >
                  Confirm Delete User
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
