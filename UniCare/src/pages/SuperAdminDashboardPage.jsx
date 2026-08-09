import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/super-admin';

function SuperAdminDashboardPage({ adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminName, setAdminName] = useState(adminUser?.admin_name || 'superadmin');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Global Dashboard Stats
  const [stats, setStats] = useState({
    total_hospitals: 0,
    pending_hospitals: 0,
    approved_hospitals: 0,
    rejected_hospitals: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Hospital Requests State
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Manage Hospitals State
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailHospital, setDetailHospital] = useState(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    hospital_name: '',
    hospital_email: '',
    hospital_phone: '',
    hospital_address: '',
    hospital_status: 'Approved',
    hospital_is_active: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Feedback Notification Message
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-stats/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setStats(data.stats);
        if (data.admin_name) setAdminName(data.admin_name);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Hospital Requests (Pending)
  const fetchHospitalRequests = async () => {
    setRequestsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-requests/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching hospital requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  // 3. Fetch Hospitals List
  const fetchHospitals = async () => {
    setHospitalsLoading(true);
    try {
      const url = `${API_BASE_URL}/hospitals/?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setHospitals(data.hospitals || []);
      }
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    } finally {
      setHospitalsLoading(false);
    }
  };

  // 4. Fetch Analytics
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Refresh tab content when active tab changes
  useEffect(() => {
    fetchDashboardStats();
    if (activeTab === 'requests') {
      fetchHospitalRequests();
    } else if (activeTab === 'hospitals') {
      fetchHospitals();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'hospitals') {
      const delayDebounce = setTimeout(() => {
        fetchHospitals();
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery, statusFilter]);

  // Handle Approve / Reject Actions
  const handleRequestAction = async (hospitalId, action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-requests/action/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hospital_id: hospitalId, action }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        showToast(`Hospital request ${action}d successfully!`, 'success');
        fetchHospitalRequests();
        fetchDashboardStats();
      } else {
        showToast(data.message || 'Action failed', 'danger');
      }
    } catch (err) {
      console.error('Request action error:', err);
      showToast('Server connection failed', 'danger');
    }
  };

  // Handle Active Status Toggle
  const handleToggleActive = async (hospitalId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/toggle-active/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hospital_id: hospitalId }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        showToast(data.message, 'info');
        fetchHospitals();
        fetchDashboardStats();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Handle Delete Hospital
  const handleDeleteHospital = async (hospitalId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/hospitals/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hospital_id: hospitalId }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        showToast('Hospital deleted successfully', 'warning');
        fetchHospitals();
        fetchDashboardStats();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Handle Add / Edit Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    const endpoint = showEditModal ? '/hospitals/update/' : '/hospitals/add/';
    const payload = showEditModal ? { ...formData, hospital_id: selectedHospital.hospital_id } : formData;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        showToast(data.message, 'success');
        setShowAddModal(false);
        setShowEditModal(false);
        setFormData({
          hospital_name: '',
          hospital_email: '',
          hospital_phone: '',
          hospital_address: '',
          hospital_status: 'Approved',
          hospital_is_active: true,
        });
        fetchHospitals();
        fetchDashboardStats();
      } else {
        showToast(data.message || 'Operation failed', 'danger');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showToast('Connection error', 'danger');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEditModal = (h) => {
    setSelectedHospital(h);
    setFormData({
      hospital_name: h.hospital_name || '',
      hospital_email: h.hospital_email || '',
      hospital_phone: h.hospital_phone || '',
      hospital_address: h.hospital_address || '',
      hospital_status: h.hospital_status || 'Approved',
      hospital_is_active: Boolean(h.hospital_is_active),
    });
    setShowEditModal(true);
  };

  const handleLogoutClick = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout/`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('unicare_super_admin');
      if (onLogout) onLogout();
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar Navigation */}
      <aside 
        className="d-flex flex-column flex-shrink-0 p-3 text-white shadow-lg" 
        style={{ width: '260px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', zIndex: 1000 }}
      >
        {/* Brand Section */}
        <div className="d-flex align-items-center mb-4 px-2 pt-2">
          <div className="bg-primary rounded-3 p-2 text-white me-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
            <i className="bi bi-shield-plus fs-4"></i>
          </div>
          <div>
            <h5 className="fw-bold mb-0 text-white tracking-wide">UniCare</h5>
            <small className="text-white-50 text-uppercase fw-semibold" style={{ fontSize: '0.7rem' }}>Super Admin</small>
          </div>
        </div>

        <hr className="text-secondary opacity-25 my-2" />

        {/* Sidebar Menu Items */}
        <ul className="nav nav-pills flex-column mb-auto gap-1">
          {/* Dashboard */}
          <li className="nav-item">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-link w-100 text-start d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 fw-medium transition-all ${
                activeTab === 'dashboard' ? 'active bg-primary text-white shadow-sm' : 'text-white-50 hover-light'
              }`}
            >
              <i className="bi bi-grid-1x2-fill fs-5"></i>
              <span>Dashboard</span>
            </button>
          </li>

          {/* Hospital Requests */}
          <li className="nav-item">
            <button
              onClick={() => setActiveTab('requests')}
              className={`nav-link w-100 text-start d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 fw-medium transition-all position-relative ${
                activeTab === 'requests' ? 'active bg-primary text-white shadow-sm' : 'text-white-50 hover-light'
              }`}
            >
              <i className="bi bi-clock-history fs-5"></i>
              <span>Hospital Requests</span>
              {stats.pending_hospitals > 0 && (
                <span className="badge bg-warning text-dark ms-auto fw-bold" style={{ fontSize: '0.7rem' }}>
                  {stats.pending_hospitals}
                </span>
              )}
            </button>
          </li>

          {/* Manage Hospitals */}
          <li className="nav-item">
            <button
              onClick={() => setActiveTab('hospitals')}
              className={`nav-link w-100 text-start d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 fw-medium transition-all ${
                activeTab === 'hospitals' ? 'active bg-primary text-white shadow-sm' : 'text-white-50 hover-light'
              }`}
            >
              <i className="bi bi-hospital fs-5"></i>
              <span>Manage Hospitals</span>
            </button>
          </li>

          {/* Analytics */}
          <li className="nav-item">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`nav-link w-100 text-start d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 fw-medium transition-all ${
                activeTab === 'analytics' ? 'active bg-primary text-white shadow-sm' : 'text-white-50 hover-light'
              }`}
            >
              <i className="bi bi-bar-chart-line-fill fs-5"></i>
              <span>Analytics</span>
            </button>
          </li>

          {/* Profile */}
          <li className="nav-item mt-2">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="nav-link w-100 text-start d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 text-white-50 hover-light fw-medium"
            >
              <i className="bi bi-person-badge-fill fs-5"></i>
              <span>Profile</span>
            </button>
          </li>
        </ul>

        <hr className="text-secondary opacity-25 my-3" />

        {/* User Card & Logout */}
        <div className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-white bg-opacity-10 mb-2">
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div className="bg-primary bg-gradient rounded-circle text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="fw-semibold text-white text-truncate small">{adminName}</div>
              <small className="text-white-50 text-truncate d-block" style={{ fontSize: '0.7rem' }}>Super Admin</small>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogoutClick}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-3 border-opacity-50"
        >
          <i className="bi bi-box-arrow-right fs-5"></i>
          <span className="fw-bold">Logout</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow-1 d-flex flex-column min-vh-100 overflow-hidden">
        {/* Toast Notification */}
        {toastMessage && (
          <div className={`position-fixed top-0 end-0 p-3`} style={{ zIndex: 2000 }}>
            <div className={`toast show align-items-center text-white bg-${toastMessage.type} border-0 shadow-lg`}>
              <div className="d-flex">
                <div className="toast-body fw-medium">{toastMessage.msg}</div>
                <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToastMessage(null)}></button>
              </div>
            </div>
          </div>
        )}

        {/* Top Navigation Bar */}
        <header className="bg-white border-bottom px-4 py-3 shadow-sm d-flex align-items-center justify-content-between">
          <div>
            <span className="badge bg-primary-subtle text-primary fw-semibold px-2.5 py-1.5 rounded-pill mb-1">
              <i className="bi bi-shield-check me-1"></i> System Administration
            </span>
            <h4 className="fw-bold mb-0 text-dark">
              {activeTab === 'dashboard' && 'Super Admin Dashboard'}
              {activeTab === 'requests' && 'Hospital Registration Requests'}
              {activeTab === 'hospitals' && 'Manage Hospitals'}
              {activeTab === 'analytics' && 'Platform Analytics & System Intelligence'}
            </h4>
          </div>

          <div className="d-flex align-items-center gap-3">
            <button 
              onClick={() => {
                fetchDashboardStats();
                if (activeTab === 'requests') fetchHospitalRequests();
                if (activeTab === 'hospitals') fetchHospitals();
                if (activeTab === 'analytics') fetchAnalytics();
              }} 
              className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-2"
            >
              <i className={`bi bi-arrow-repeat ${statsLoading || requestsLoading || hospitalsLoading || analyticsLoading ? 'spin' : ''}`}></i>
              <span>Refresh Data</span>
            </button>
            <div className="vr opacity-25 my-1"></div>
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                <i className="bi bi-person-fill"></i>
              </div>
              <div className="d-none d-md-block text-end">
                <span className="fw-bold d-block text-dark small">{adminName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Body Area */}
        <div className="p-4 p-md-5 overflow-auto flex-grow-1">

          {/* Top Notification for Pending Hospital Requests */}
          {stats.pending_hospitals > 0 && (
            <div className="alert alert-warning border-0 shadow-sm rounded-4 mb-4 p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-warning text-dark p-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                  <i className="bi bi-bell-fill fs-5"></i>
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-0">Pending Registration Requests</h6>
                  <p className="text-secondary small mb-0">
                    You have <strong className="text-dark">{stats.pending_hospitals}</strong> pending hospital registration request(s) awaiting your review.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('requests')}
                className="btn btn-warning text-dark btn-sm rounded-pill fw-bold px-3 py-1.5"
              >
                Review Requests <i className="bi bi-arrow-right ms-1"></i>
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="card border-0 rounded-4 shadow-sm mb-4 bg-white overflow-hidden">
                <div className="card-body p-4 p-md-5 position-relative" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)' }}>
                  <div className="row align-items-center">
                    <div className="col-lg-8">
                      <div className="d-inline-flex align-items-center gap-2 bg-white px-3 py-1 rounded-pill text-primary fw-semibold small mb-3 shadow-sm">
                        <i className="bi bi-building-fill-add"></i> Platform Overview
                      </div>
                      <h2 className="display-6 fw-extrabold text-dark mb-2">
                        Welcome, <span className="text-primary">{adminName}</span>
                      </h2>
                      <p className="text-secondary lead mb-0" style={{ fontSize: '1.05rem' }}>
                        Real-time hospital operations, pending requests, and live system data.
                      </p>
                    </div>
                    <div className="col-lg-4 text-center d-none d-lg-block">
                      <div className="p-3 bg-white rounded-4 shadow-sm d-inline-block">
                        <i className="bi bi-hospital-fill text-primary" style={{ fontSize: '4.5rem' }}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="row g-4 mb-5">
                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 rounded-4 shadow-sm h-100 bg-white border-top border-4 border-primary">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary fw-semibold small text-uppercase">Total Active Hospitals</span>
                        <div className="rounded-circle p-3 bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="bi bi-hospital fs-3"></i>
                        </div>
                      </div>
                      <h2 className="display-5 fw-extrabold mb-0 text-dark">
                        {statsLoading ? <span className="spinner-border spinner-border-sm text-primary"></span> : stats.total_hospitals}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 rounded-4 shadow-sm h-100 bg-white border-top border-4 border-warning">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary fw-semibold small text-uppercase">Pending Requests</span>
                        <div className="rounded-circle p-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="bi bi-clock-history fs-3"></i>
                        </div>
                      </div>
                      <h2 className="display-5 fw-extrabold mb-0 text-dark">
                        {statsLoading ? <span className="spinner-border spinner-border-sm text-warning"></span> : stats.pending_hospitals}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 rounded-4 shadow-sm h-100 bg-white border-top border-4 border-success">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary fw-semibold small text-uppercase">Approved Hospitals</span>
                        <div className="rounded-circle p-3 bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="bi bi-check-circle-fill fs-3"></i>
                        </div>
                      </div>
                      <h2 className="display-5 fw-extrabold mb-0 text-dark">
                        {statsLoading ? <span className="spinner-border spinner-border-sm text-success"></span> : stats.approved_hospitals}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                  <div className="card border-0 rounded-4 shadow-sm h-100 bg-white border-top border-4 border-danger">
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="text-secondary fw-semibold small text-uppercase">Rejected Hospitals</span>
                        <div className="rounded-circle p-3 bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                          <i className="bi bi-x-circle-fill fs-3"></i>
                        </div>
                      </div>
                      <h2 className="display-5 fw-extrabold mb-0 text-dark">
                        {statsLoading ? <span className="spinner-border spinner-border-sm text-danger"></span> : stats.rejected_hospitals}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary bg-opacity-10 p-3 rounded-3 text-primary">
                        <i className="bi bi-clock-history fs-2"></i>
                      </div>
                      <div>
                        <h5 className="fw-bold mb-1">Review Pending Requests</h5>
                        <p className="text-muted small mb-2">Review and approve new hospital registration applications.</p>
                        <button onClick={() => setActiveTab('requests')} className="btn btn-primary btn-sm rounded-3">
                          View Pending ({stats.pending_hospitals})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0 rounded-4 shadow-sm p-4 bg-white">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-success bg-opacity-10 p-3 rounded-3 text-success">
                        <i className="bi bi-hospital fs-2"></i>
                      </div>
                      <div>
                        <h5 className="fw-bold mb-1">Manage All Hospitals</h5>
                        <p className="text-muted small mb-2">Search, edit, toggle active state, or add new hospital profiles.</p>
                        <button onClick={() => setActiveTab('hospitals')} className="btn btn-success btn-sm rounded-3">
                          Manage Hospitals
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: HOSPITAL REQUESTS */}
          {activeTab === 'requests' && (
            <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h5 className="fw-bold text-dark mb-1">Pending Hospital Registration Requests</h5>
                  <p className="text-muted small mb-0">Hospitals waiting for Super Admin review & approval.</p>
                </div>
                <button onClick={fetchHospitalRequests} className="btn btn-outline-primary btn-sm rounded-pill">
                  <i className="bi bi-arrow-repeat me-1"></i> Refresh Requests
                </button>
              </div>

              {requestsLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted mt-2">Loading pending requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-4">
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                  <h5 className="fw-bold mt-3">No Pending Requests</h5>
                  <p className="text-muted small">All hospital registration requests have been processed.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>UID</th>
                        <th>Hospital Name</th>
                        <th>Contact Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.hospital_id}>
                          <td><span className="badge bg-secondary-subtle text-secondary font-monospace">{r.hospital_uid}</span></td>
                          <td className="fw-bold text-dark">{r.hospital_name}</td>
                          <td>{r.hospital_email || 'N/A'}</td>
                          <td>{r.hospital_phone}</td>
                          <td><span className="badge bg-warning text-dark">Pending</span></td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button 
                                onClick={() => { setDetailHospital(r); setShowDetailModal(true); }}
                                className="btn btn-outline-info"
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i> Details
                              </button>
                              <button 
                                onClick={() => handleRequestAction(r.hospital_id, 'approve')}
                                className="btn btn-success"
                              >
                                <i className="bi bi-check-lg me-1"></i> Approve
                              </button>
                              <button 
                                onClick={() => handleRequestAction(r.hospital_id, 'reject')}
                                className="btn btn-danger"
                              >
                                <i className="bi bi-x-lg me-1"></i> Reject
                              </button>
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

          {/* TAB 3: MANAGE HOSPITALS */}
          {activeTab === 'hospitals' && (
            <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
                <div>
                  <h5 className="fw-bold text-dark mb-1">Manage Registered Hospitals</h5>
                  <p className="text-muted small mb-0">Search, filter status, edit, or add hospital entries.</p>
                </div>
                <button 
                  onClick={() => {
                    setFormData({
                      hospital_name: '',
                      hospital_email: '',
                      hospital_phone: '',
                      hospital_address: '',
                      hospital_status: 'Approved',
                      hospital_is_active: true,
                    });
                    setShowAddModal(true);
                  }}
                  className="btn btn-primary rounded-3 fw-bold d-flex align-items-center gap-2"
                >
                  <i className="bi bi-plus-circle-fill"></i> Add New Hospital
                </button>
              </div>

              {/* Search & Filters */}
              <div className="row g-3 mb-4">
                <div className="col-md-6 col-lg-8">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control bg-light border-start-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-lg-4">
                  <select 
                    className="form-select bg-light"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Filter: All Statuses</option>
                    <option value="Approved">Approved Only</option>
                    <option value="Pending">Pending Only</option>
                    <option value="Rejected">Rejected Only</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>

              {/* Hospitals Table */}
              {hospitalsLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="text-muted mt-2">Loading hospitals from database...</p>
                </div>
              ) : hospitals.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-4">
                  <i className="bi bi-hospital text-muted" style={{ fontSize: '3rem' }}></i>
                  <h6 className="fw-bold mt-3 text-secondary">No hospitals found</h6>
                  <p className="text-muted small">Try modifying your search query or status filter.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>UID</th>
                        <th>Hospital Name</th>
                        <th>Contact Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Active State</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hospitals.map((h) => (
                        <tr key={h.hospital_id}>
                          <td><span className="badge bg-secondary-subtle text-secondary font-monospace">{h.hospital_uid}</span></td>
                          <td className="fw-bold text-dark">{h.hospital_name}</td>
                          <td>{h.hospital_email || 'N/A'}</td>
                          <td>{h.hospital_phone}</td>
                          <td>
                            <span className={`badge ${
                              h.hospital_status === 'Approved' ? 'bg-success' :
                              h.hospital_status === 'Pending' ? 'bg-warning text-dark' : 'bg-danger'
                            }`}>
                              {h.hospital_status}
                            </span>
                          </td>
                          <td>
                            <div className="form-check form-switch">
                              <input 
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={Boolean(h.hospital_is_active)}
                                onChange={() => handleToggleActive(h.hospital_id)}
                              />
                              <span className="small text-muted ms-1">
                                {h.hospital_is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button 
                                onClick={() => openEditModal(h)}
                                className="btn btn-outline-primary"
                                title="Edit Hospital"
                              >
                                <i className="bi bi-pencil-square"></i> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteHospital(h.hospital_id, h.hospital_name)}
                                className="btn btn-outline-danger"
                                title="Delete Hospital"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
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

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="d-flex flex-column gap-4">
              <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">Analytics & System Metrics</h5>
                    <p className="text-muted small mb-0">System totals across hospitals, doctors, patients, and appointments.</p>
                  </div>
                  <button onClick={fetchAnalytics} className="btn btn-outline-primary btn-sm rounded-pill">
                    <i className="bi bi-arrow-repeat me-1"></i> Refresh Analytics
                  </button>
                </div>

                {analyticsLoading || !analytics ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="text-muted mt-2">Computing analytics queries...</p>
                  </div>
                ) : (
                  <>
                    <div className="row g-4 mb-4">
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-25">
                          <span className="text-primary fw-bold text-uppercase small">Total Doctors</span>
                          <h3 className="display-6 fw-extrabold text-primary mb-0 mt-1">{analytics.total_doctors}</h3>
                          <small className="text-muted">Registered doctors</small>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-info bg-opacity-10 border border-info border-opacity-25">
                          <span className="text-info-emphasis fw-bold text-uppercase small">Total Patients</span>
                          <h3 className="display-6 fw-extrabold text-info mb-0 mt-1">{analytics.total_patients}</h3>
                          <small className="text-muted">Registered patient profiles</small>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-success bg-opacity-10 border border-success border-opacity-25">
                          <span className="text-success fw-bold text-uppercase small">Departments</span>
                          <h3 className="display-6 fw-extrabold text-success mb-0 mt-1">{analytics.total_departments}</h3>
                          <small className="text-muted">Active medical departments</small>
                        </div>
                      </div>
                      <div className="col-sm-6 col-lg-3">
                        <div className="p-3 rounded-4 bg-warning bg-opacity-10 border border-warning border-opacity-25">
                          <span className="text-warning-emphasis fw-bold text-uppercase small">Appointments</span>
                          <h3 className="display-6 fw-extrabold text-warning mb-0 mt-1">{analytics.total_appointments}</h3>
                          <small className="text-muted">Total booked appointments</small>
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-bold text-dark mb-3">Hospital Status Distribution</h6>
                    <div className="p-4 bg-light rounded-4 mb-4">
                      <div className="progress mb-3" style={{ height: '24px' }}>
                        <div 
                          className="progress-bar bg-success font-monospace" 
                          style={{ width: `${analytics.total_hospitals ? (analytics.approved_hospitals / analytics.total_hospitals) * 100 : 0}%` }}
                        >
                          Approved ({analytics.approved_hospitals})
                        </div>
                        <div 
                          className="progress-bar bg-warning text-dark font-monospace" 
                          style={{ width: `${analytics.total_hospitals ? (analytics.pending_hospitals / analytics.total_hospitals) * 100 : 0}%` }}
                        >
                          Pending ({analytics.pending_hospitals})
                        </div>
                        <div 
                          className="progress-bar bg-danger font-monospace" 
                          style={{ width: `${analytics.total_hospitals ? (analytics.rejected_hospitals / analytics.total_hospitals) * 100 : 0}%` }}
                        >
                          Rejected ({analytics.rejected_hospitals})
                        </div>
                      </div>

                      <div className="row text-center text-muted small mt-2">
                        <div className="col-4"><i className="bi bi-circle-fill text-success me-1"></i> Approved: {analytics.approved_hospitals}</div>
                        <div className="col-4"><i className="bi bi-circle-fill text-warning me-1"></i> Pending: {analytics.pending_hospitals}</div>
                        <div className="col-4"><i className="bi bi-circle-fill text-danger me-1"></i> Rejected: {analytics.rejected_hospitals}</div>
                      </div>
                    </div>

                    <h6 className="fw-bold text-dark mb-3">Recent Hospital Registrations</h6>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>UID</th>
                            <th>Hospital Name</th>
                            <th>Email</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.recent_hospitals && analytics.recent_hospitals.map((rh) => (
                            <tr key={rh.hospital_id}>
                              <td><code>{rh.hospital_uid}</code></td>
                              <td className="fw-bold">{rh.hospital_name}</td>
                              <td>{rh.hospital_email}</td>
                              <td>
                                <span className={`badge ${
                                  rh.hospital_status === 'Approved' ? 'bg-success' :
                                  rh.hospital_status === 'Pending' ? 'bg-warning text-dark' : 'bg-danger'
                                }`}>
                                  {rh.hospital_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add / Edit Hospital Modal */}
      {(showAddModal || showEditModal) && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-primary text-white rounded-top-4 p-4">
                <h5 className="modal-title fw-bold">
                  <i className={`bi ${showEditModal ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                  {showEditModal ? 'Edit Hospital Entry' : 'Add New Hospital'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                ></button>
              </div>
              <form onSubmit={handleFormSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hospital Name <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control"
                        required
                        value={formData.hospital_name}
                        onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Contact Phone <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control"
                        required
                        value={formData.hospital_phone}
                        onChange={(e) => setFormData({ ...formData, hospital_phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Email Address</label>
                      <input 
                        type="email" 
                        className="form-control"
                        value={formData.hospital_email}
                        onChange={(e) => setFormData({ ...formData, hospital_email: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Registration Status</label>
                      <select 
                        className="form-select"
                        value={formData.hospital_status}
                        onChange={(e) => setFormData({ ...formData, hospital_status: e.target.value })}
                      >
                        
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Address</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        value={formData.hospital_address}
                        onChange={(e) => setFormData({ ...formData, hospital_address: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input 
                          className="form-check-input"
                          type="checkbox"
                          id="is_active_check"
                          checked={formData.hospital_is_active}
                          onChange={(e) => setFormData({ ...formData, hospital_is_active: e.target.checked })}
                        />
                        <label className="form-check-label fw-semibold small" htmlFor="is_active_check">
                          Hospital Active State (Enabled in System)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button 
                    type="button" 
                    className="btn btn-secondary rounded-3 px-4"
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary rounded-3 px-4 fw-bold"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? 'Saving...' : (showEditModal ? 'Update Hospital' : 'Add Hospital')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Detail Modal */}
      {showDetailModal && detailHospital && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-dark text-white rounded-top-4 p-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-info-circle me-2"></i>Hospital Details
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="list-group list-group-flush">
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">UID:</span>
                    <code className="fw-bold">{detailHospital.hospital_uid}</code>
                  </div>
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Hospital Name:</span>
                    <span className="fw-bold">{detailHospital.hospital_name}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Email:</span>
                    <span>{detailHospital.hospital_email || 'N/A'}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Phone:</span>
                    <span>{detailHospital.hospital_phone}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between">
                    <span className="text-muted">Status:</span>
                    <span className="badge bg-warning text-dark">{detailHospital.hospital_status}</span>
                  </div>
                  <div className="list-group-item">
                    <span className="text-muted d-block mb-1">Address:</span>
                    <p className="small text-dark mb-0">{detailHospital.hospital_address || 'No address provided.'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-3">
                <button className="btn btn-secondary rounded-3 px-4" onClick={() => setShowDetailModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileModalOpen && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-primary text-white rounded-top-4 p-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-circle me-2"></i>Super Admin Profile
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setProfileModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-2" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <h5 className="fw-bold mb-1">{adminName}</h5>
                  <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill">Active Administrator</span>
                </div>
                <div className="list-group list-group-flush border rounded-3">
                  <div className="list-group-item d-flex justify-content-between py-3">
                    <span className="text-muted fw-semibold">Admin Name:</span>
                    <span className="fw-bold">{adminName}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between py-3">
                    <span className="text-muted fw-semibold">Admin Email:</span>
                    <span>admin@unicare.com</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-3">
                <button 
                  type="button" 
                  className="btn btn-secondary rounded-3 px-4" 
                  onClick={() => setProfileModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminDashboardPage;
