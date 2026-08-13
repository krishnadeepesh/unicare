import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/super-admin';

function HospitalAdminDashboardPage({ hospitalInfo, onBackToRoleSelect, onLogout }) {
  const initialHospitalName = hospitalInfo?.name || hospitalInfo?.hospital_name || 'Hospital Admin';
  const initialHospitalId = hospitalInfo?.hospital_id || hospitalInfo?.id;
  
  // Dashboard & Profile State
  const [hospitalData, setHospitalData] = useState(hospitalInfo || null);
  const [statsData, setStatsData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Navigation States inside Hospital Admin
  const [activeSection, setActiveSection] = useState('home'); // 'home' | 'doctors' | 'departments' | 'receptionists'
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);

  // Doctors list stored in MySQL database
  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // New Doctor Form State
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docDept, setDocDept] = useState('General Medicine');
  const [docLicense, setDocLicense] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch Hospital Details & Hospital-Specific Dashboard Stats from MySQL
  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-admin/dashboard-data/?hospital_id=${encodeURIComponent(initialHospitalId || '')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        if (data.hospital_info) {
          setHospitalData(data.hospital_info);
        }
        if (data.stats) {
          setStatsData(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching hospital admin dashboard data:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Fetch Doctors directly from MySQL
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    const targetHId = hospitalData?.hospital_id || initialHospitalId;
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/?hospital_id=${encodeURIComponent(targetHId || '')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setDoctorsList(data.doctors || []);
      }
    } catch (err) {
      console.error('Error fetching doctors from MySQL:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchDoctors();
  }, []);

  const currentHospitalName = hospitalData?.name || hospitalData?.hospital_name || initialHospitalName;
  const currentHospitalUid = hospitalData?.hospital_uid || hospitalData?.id || initialHospitalId || 'HSP0001';
  const currentHospitalId = hospitalData?.hospital_id || initialHospitalId;

  // Handle Add Doctor directly into MySQL
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!docName.trim() || !docEmail.trim()) return;

    setSubmitting(true);
    const payload = {
      hospital_id: currentHospitalId,
      name: docName.trim(),
      email: docEmail.trim(),
      phone: docPhone.trim(),
      department: docDept,
      specialization: docDept,
      license: docLicense.trim(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/doctors/add/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        showToast(`Doctor registered successfully! Doctor ID & Login Password: ${data.doctor?.doc_uid || data.doctor?.id}`, 'success');
        fetchDoctors();
        fetchDashboardData();
        // Reset Form
        setDocName('');
        setDocEmail('');
        setDocPhone('');
        setDocDept('General Medicine');
        setDocLicense('');
        setShowAddDoctorModal(false);
      } else {
        showToast(data.message || 'Failed to register doctor', 'danger');
      }
    } catch (err) {
      console.error('Add doctor error:', err);
      showToast('Network error while saving doctor', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Doctor from MySQL
  const handleDeleteDoctor = async (docId, docUid) => {
    if (!window.confirm(`Are you sure you want to remove Doctor "${docUid}"?`)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/doctors/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: docId }),
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        showToast('Doctor record removed', 'warning');
        fetchDoctors();
        fetchDashboardData();
      } else {
        showToast(data.message || 'Failed to delete doctor', 'danger');
      }
    } catch (err) {
      console.error('Delete doctor error:', err);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className={`toast show align-items-center text-white bg-${toastMessage.type} border-0 shadow-lg`}>
            <div className="d-flex">
              <div className="toast-body fw-bold">{toastMessage.msg}</div>
              <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => setToastMessage(null)}></button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-white border-bottom shadow-sm py-3 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-success text-white rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
            <i className="bi bi-shield-lock-fill fs-4"></i>
          </div>
          <div>
            <h5 className="fw-bold mb-0 text-dark">{currentHospitalName}</h5>
            <small className="text-muted fw-semibold">Hospital ID: <code className="text-primary fw-bold">{currentHospitalUid}</code></small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button 
            onClick={onBackToRoleSelect}
            className="btn btn-outline-secondary btn-sm rounded-pill px-3"
          >
            <i className="bi bi-arrow-left me-1"></i> Switch Role
          </button> 
          <button 
            onClick={onLogout}
            className="btn btn-outline-danger btn-sm rounded-pill px-3"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="container py-4 flex-grow-1">
        
        {/* Navigation Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <span className="badge bg-success bg-opacity-10 text-success px-3 py-1 rounded-pill fw-semibold mb-2">
              <i className="bi bi-building me-1"></i> {currentHospitalName}
            </span>
            <h2 className="fw-bold text-dark mb-1">
              Welcome to <span className="text-success">{currentHospitalName}</span>
            </h2>
            <p className="text-muted small mb-0">
              Hospital ID: <code className="fw-bold text-primary">{currentHospitalUid}</code> &bull; Hospital Administrator Control Panel
            </p>
          </div>


        </div>

        {/* SECTION 1: DASHBOARD HOME (PROFILE & STATS & CARDS) */}
        {activeSection === 'home' && (
          <div>
            
            {/* DYNAMIC HOSPITAL PROFILE / DETAILS CARD */}
            <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-flex align-items-center justify-content-center" style={{ width: '54px', height: '54px' }}>
                    <i className="bi bi-hospital fs-3"></i>
                  </div>
                  <div>
                    <h4 className="fw-bold text-dark mb-0">Hospital Information</h4>
                  </div>
                </div>
                <span className={`badge px-3 py-2 rounded-pill fs-6 ${
                  (hospitalData?.is_active ?? hospitalData?.hospital_is_active ?? true) ? 'bg-success text-white' : 'bg-secondary text-white'
                }`}>
                  Status: {(hospitalData?.is_active ?? hospitalData?.hospital_is_active ?? true) ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Hospital Name</span>
                    <span className="fw-bold text-dark fs-6">{currentHospitalName}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Hospital ID</span>
                    <code className="fw-bold text-primary fs-6">{currentHospitalUid}</code>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Registration Number</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.hospital_registration_number || currentHospitalUid}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Email</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.email || hospitalData?.hospital_email || 'admin@hospital.com'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Contact Number</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.phone || hospitalData?.hospital_contact_number || hospitalData?.hospital_phone || 'N/A'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Address</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.address || hospitalData?.hospital_address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HOSPITAL-SPECIFIC SUMMARY STATISTICS */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-4 col-lg">
                <div className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-primary">
                  <span className="text-muted small d-block mb-1">Total Doctors</span>
                  <span className="fs-3 fw-bold text-primary">{statsData?.total_doctors ?? doctorsList.length}</span>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg">
                <div className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-warning">
                  <span className="text-muted small d-block mb-1">Total Receptionists</span>
                  <span className="fs-3 fw-bold text-warning-emphasis">{statsData?.total_receptionists ?? 0}</span>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg">
                <div className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-info">
                  <span className="text-muted small d-block mb-1">Total Patients</span>
                  <span className="fs-3 fw-bold text-info-emphasis">{statsData?.total_patients ?? 0}</span>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg">
                <div className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-danger">
                  <span className="text-muted small d-block mb-1">Today's Appointments</span>
                  <span className="fs-3 fw-bold text-danger">{statsData?.today_appointments ?? 0}</span>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg">
                <div className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-success">
                  <span className="text-muted small d-block mb-1">Departments</span>
                  <span className="fs-3 fw-bold text-success">{statsData?.total_departments ?? 0}</span>
                </div>
              </div>
            </div>

            {/* DASHBOARD MANAGEMENT SECTIONS */}
            <div className="row g-4">
              
              {/* CARD 1: DOCTOR MANAGEMENT */}
              <div className="col-md-6 col-lg-4">
                <div className="card border-0 rounded-4 shadow-sm h-100 bg-white hover-lift transition-all border-start border-5 border-primary">
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-3">
                          <i className="bi bi-person-badge-fill fs-2"></i>
                        </div>
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3 py-1">
                          {doctorsList.length} Registered
                        </span>
                      </div>
                      <h4 className="fw-bold text-dark mb-2">Doctor Management</h4>
                      <p className="text-muted small mb-4">
                        Add new doctors, view doctor credentials, and assign Doctor ID passwords.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveSection('doctors')}
                      className="btn btn-primary w-100 py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                    >
                      <span>Manage Doctors</span>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 2: RECEPTIONIST MANAGEMENT */}
              <div className="col-md-6 col-lg-4">
                <div className="card border-0 rounded-4 shadow-sm h-100 bg-white hover-lift transition-all border-start border-5 border-warning">
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="bg-warning bg-opacity-10 text-warning p-3 rounded-3">
                          <i className="bi bi-person-workspace fs-2"></i>
                        </div>
                        <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3 py-1">
                          Receptionists
                        </span>
                      </div>
                      <h4 className="fw-bold text-dark mb-2">Receptionist Management</h4>
                      <p className="text-muted small mb-4">
                        Create receptionist accounts, grant desk permissions, and monitor check-in activities.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveSection('receptionists')}
                      className="btn btn-warning text-dark w-100 py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                    >
                      <span>Manage Receptionists</span>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 3: DEPARTMENT MANAGEMENT */}
              <div className="col-md-6 col-lg-4">
                <div className="card border-0 rounded-4 shadow-sm h-100 bg-white hover-lift transition-all border-start border-5 border-success">
                  <div className="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="bg-success bg-opacity-10 text-success p-3 rounded-3">
                          <i className="bi bi-diagram-3-fill fs-2"></i>
                        </div>
                        <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1">
                          Departments
                        </span>
                      </div>
                      <h4 className="fw-bold text-dark mb-2">Department Management</h4>
                      <p className="text-muted small mb-4">
                        Define clinical departments (Cardiology, Pediatrics, OPD) and assign department heads.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveSection('departments')}
                      className="btn btn-success w-100 py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2"
                    >
                      <span>Manage Departments</span>
                      <i className="bi bi-arrow-right"></i>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SECTION 2: DOCTOR MANAGEMENT VIEW */}
        {activeSection === 'doctors' && (
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1">Doctor Directory & Registration</h5>
                <p className="text-muted small mb-0">Doctor records directory and login management. Doctor ID is set as the login password.</p>
              </div>
              <button 
                onClick={() => setShowAddDoctorModal(true)}
                className="btn btn-primary rounded-3 fw-bold d-flex align-items-center gap-2"
              >
                <i className="bi bi-plus-circle-fill"></i> Register New Doctor
              </button>
            </div>

            {loadingDoctors ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="text-muted mt-2">Loading doctors...</p>
              </div>
            ) : doctorsList.length === 0 ? (
              <div className="text-center py-5 bg-light rounded-4">
                <i className="bi bi-person-badge text-muted" style={{ fontSize: '3.5rem' }}></i>
                <h5 className="fw-bold mt-3 text-secondary">No Doctors Registered</h5>
                <p className="text-muted small mb-3">Click the button above to register your first doctor.</p>
                <button 
                  onClick={() => setShowAddDoctorModal(true)}
                  className="btn btn-outline-primary btn-sm rounded-pill"
                >
                  + Add First Doctor
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Doctor ID (Login ID)</th>
                      <th>Doctor Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Department</th>
                      <th>Login Password</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorsList.map((doc) => (
                      <tr key={doc.doctor_id || doc.id}>
                        <td><code className="fw-bold text-primary">{doc.doc_uid || doc.id}</code></td>
                        <td className="fw-bold text-dark">{doc.name}</td>
                        <td>{doc.email}</td>
                        <td>{doc.phone || 'N/A'}</td>
                        <td><span className="badge bg-info-subtle text-info-emphasis">{doc.department || doc.specialization}</span></td>
                        <td><span className="badge bg-light text-dark border font-monospace">{doc.password || doc.doc_uid || doc.id}</span></td>
                        <td className="text-end">
                          <button 
                            onClick={() => handleDeleteDoctor(doc.doctor_id || doc.id, doc.doc_uid || doc.id)}
                            className="btn btn-outline-danger btn-sm"
                            title="Remove Doctor"
                          >
                            <i className="bi bi-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: RECEPTIONIST MANAGEMENT VIEW */}
        {activeSection === 'receptionists' && (
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 text-center py-5">
            <i className="bi bi-person-workspace text-warning" style={{ fontSize: '3.5rem' }}></i>
            <h5 className="fw-bold mt-3">Receptionist Management</h5>
            <p className="text-muted small">No receptionists registered yet. Management section ready.</p>
          </div>
        )}

        {/* SECTION 4: DEPARTMENT MANAGEMENT VIEW */}
        {activeSection === 'departments' && (
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 text-center py-5">
            <i className="bi bi-diagram-3-fill text-success" style={{ fontSize: '3.5rem' }}></i>
            <h5 className="fw-bold mt-3">Department Management</h5>
            <p className="text-muted small">Configure clinical departments and specialized wards here.</p>
          </div>
        )}

      </div>

      {/* REGISTER NEW DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-primary text-white rounded-top-4 p-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>Register New Doctor
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddDoctorModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddDoctor}>
                <div className="modal-body p-4">
                  <div className="alert alert-info py-2 px-3 small mb-3">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    Doctor's generated ID (e.g. <code>DOC-1001</code>) will automatically be set as their <strong>Login Password</strong>.
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Doctor Full Name <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className="form-control"
                      required
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email Address <span className="text-danger">*</span></label>
                    <input 
                      type="email" 
                      className="form-control"
                      required
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                    />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Phone Number</label>
                      <input 
                        type="tel" 
                        className="form-control"
                        value={docPhone}
                        onChange={(e) => setDocPhone(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Department</label>
                      <select 
                        className="form-select"
                        value={docDept}
                        onChange={(e) => setDocDept(e.target.value)}
                      >
                        <option value="General Medicine">General Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Dermatology">Dermatology</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Medical License Number</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={docLicense}
                      onChange={(e) => setDocLicense(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button 
                    type="button" 
                    className="btn btn-secondary rounded-3 px-4"
                    onClick={() => setShowAddDoctorModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary rounded-3 px-4 fw-bold"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Register Doctor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalAdminDashboardPage;
