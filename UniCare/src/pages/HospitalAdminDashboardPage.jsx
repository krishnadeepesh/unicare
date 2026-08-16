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
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [receptionistsList, setReceptionistsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [showReceptionistModal, setShowReceptionistModal] = useState(false);
  const [editingReceptionist, setEditingReceptionist] = useState(null);
  const [receptionistForm, setReceptionistForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' });
  const [hospitalRegistration, setHospitalRegistration] = useState({ name: '', email: '', phone: '', address: '' });

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
  const [docPassword, setDocPassword] = useState('');
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

  const fetchManagementData = async () => {
    const targetHId = hospitalData?.hospital_id || initialHospitalId;
    if (!targetHId) return;
    try {
      const [receptionistsResponse, departmentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/receptionists/?hospital_id=${encodeURIComponent(targetHId)}`),
        fetch(`${API_BASE_URL}/departments/?hospital_id=${encodeURIComponent(targetHId)}`),
      ]);
      const [receptionistsData, departmentsData] = await Promise.all([receptionistsResponse.json(), departmentsResponse.json()]);
      if (receptionistsResponse.ok) setReceptionistsList(receptionistsData.receptionists || []);
      if (departmentsResponse.ok) setDepartmentsList(departmentsData.departments || []);
    } catch (err) {
      console.error('Error fetching management data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchDoctors();
    fetchManagementData();
  }, []);

  const currentHospitalName = hospitalData?.name || hospitalData?.hospital_name || hospitalInfo?.name || hospitalInfo?.hospital_name || 'City General Hospital';
  const currentHospitalUid = hospitalData?.hospital_uid || hospitalData?.id || initialHospitalId || 'HSP0001';
  const currentHospitalId = hospitalData?.hospital_id || initialHospitalId;
  const registrationStatus = hospitalData?.status || hospitalData?.hospital_status || hospitalInfo?.status || hospitalInfo?.hospital_status || 'Draft';
  const isApproved = registrationStatus === 'Approved';
  const userRole = hospitalData?.role || hospitalInfo?.role || 'Hospital Administrator';
  const username = hospitalData?.username || hospitalData?.user_name || hospitalInfo?.username || hospitalInfo?.user_name || hospitalInfo?.adminEmail || hospitalInfo?.email || 'admin';

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
      password: docPassword,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/doctors/${editingDoctor ? 'update' : 'add'}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDoctor ? { ...payload, doctor_id: editingDoctor.doctor_id } : payload),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        showToast(editingDoctor ? 'Doctor updated successfully.' : `Doctor registered successfully! Doctor ID & Login Password: ${data.doctor?.doc_uid || data.doctor?.id}`, 'success');
        fetchDoctors();
        fetchDashboardData();
        // Reset Form
        setDocName('');
        setDocEmail('');
        setDocPhone('');
        setDocDept('General Medicine');
        setDocLicense('');
        setDocPassword('');
        setEditingDoctor(null);
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

  const openDoctorModal = (doctor = null) => {
    setEditingDoctor(doctor);
    setDocName(doctor?.name || ''); setDocEmail(doctor?.email || ''); setDocPhone(doctor?.phone || '');
    setDocDept(doctor?.department || doctor?.specialization || 'General Medicine'); setDocLicense(doctor?.license || '');
    setDocPassword('');
    setShowAddDoctorModal(true);
  };

  const saveReceptionist = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/receptionists/${editingReceptionist ? 'update' : 'add'}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hospital_id: currentHospitalId, ...receptionistForm, ...(editingReceptionist ? { receptionist_id: editingReceptionist.receptionist_id } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      showToast(data.message); setShowReceptionistModal(false); setEditingReceptionist(null); setReceptionistForm({ name: '', email: '', phone: '' }); fetchManagementData(); fetchDashboardData();
    } catch (err) { showToast(err.message || 'Could not save receptionist.', 'danger'); }
  };

  const deleteReceptionist = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const response = await fetch(`${API_BASE_URL}/receptionists/delete/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receptionist_id: item.receptionist_id }) });
    const data = await response.json(); showToast(data.message, response.ok ? 'warning' : 'danger'); if (response.ok) { fetchManagementData(); fetchDashboardData(); }
  };

  const saveDepartment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/departments/save/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hospital_id: currentHospitalId, ...departmentForm, ...(editingDepartment ? { department_id: editingDepartment.department_id } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      showToast(data.message); setShowDepartmentModal(false); setEditingDepartment(null); setDepartmentForm({ name: '', description: '' }); fetchManagementData(); fetchDashboardData();
    } catch (err) { showToast(err.message || 'Could not save department.', 'danger'); }
  };

  const deleteDepartment = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const response = await fetch(`${API_BASE_URL}/departments/delete/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hospital_id: currentHospitalId, department_id: item.department_id }) });
    const data = await response.json(); showToast(data.message, response.ok ? 'warning' : 'danger'); if (response.ok) { fetchManagementData(); fetchDashboardData(); }
  };

  const submitHospitalRegistration = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/hospital-registration/submit/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital_id: currentHospitalId, hospital_name: hospitalRegistration.name, hospital_email: hospitalRegistration.email, hospital_phone: hospitalRegistration.phone, hospital_address: hospitalRegistration.address }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setHospitalData((current) => ({ ...current, hospital_name: hospitalRegistration.name, name: hospitalRegistration.name, hospital_email: hospitalRegistration.email, email: hospitalRegistration.email, hospital_phone: hospitalRegistration.phone, phone: hospitalRegistration.phone, hospital_address: hospitalRegistration.address, address: hospitalRegistration.address, status: 'Pending', hospital_status: 'Pending' }));
      showToast(data.message);
    } catch (err) { showToast(err.message || 'Could not submit hospital registration.', 'danger'); }
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

      {/* Header Bar displaying Hospital Name, Role, and Username */}
      <header className="bg-white border-bottom shadow-sm py-3 px-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <div className="text-white rounded-3 p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '45px', height: '45px', backgroundColor: '#0d9488' }}>
            <i className="bi bi-hospital fs-4"></i>
          </div>
          <div>
            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
              <span>{currentHospitalName}</span>
              <small className="text-muted fw-normal fs-7">({currentHospitalUid})</small>
            </h5>
            <div className="d-flex align-items-center gap-2 mt-1" style={{ fontSize: '0.875rem' }}>
              <span className="badge border px-2 py-1 rounded-pill fw-semibold" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                <i className="bi bi-person-badge me-1"></i>Role: {userRole}
              </span>
              <span className="text-secondary fw-semibold ms-1">
                <i className="bi bi-person-circle me-1 text-teal"></i>Username: <code className="text-dark fw-bold bg-light px-2 py-0.5 rounded border">{username}</code>
              </span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button 
            onClick={onLogout}
            className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1.5"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="container py-4 flex-grow-1">
        {!isApproved ? (
          <div className="row justify-content-center"><div className="col-lg-8">
            <div className={`alert ${registrationStatus === 'Rejected' ? 'alert-danger' : 'alert-warning'} border-0 rounded-4 shadow-sm p-4 mb-4`}>
              <h4 className="fw-bold mb-2"><i className="bi bi-hourglass-split me-2"></i>Hospital Registration Status: {registrationStatus}</h4>
              <p className="mb-0">{registrationStatus === 'Pending' ? 'Your registration has been sent to Super Admin. Management tools will unlock after approval.' : registrationStatus === 'Rejected' ? 'Your registration was not approved. Update the details and submit again.' : 'Complete the hospital registration below to request UniCare access from Super Admin.'}</p>
            </div>
            {registrationStatus !== 'Pending' && <div className="card border-0 rounded-4 shadow-sm p-4"><h4 className="fw-bold mb-1">Hospital Registration</h4><p className="text-muted small mb-4">Submit these details for Super Admin approval.</p><form onSubmit={submitHospitalRegistration}><div className="row g-3"><div className="col-md-6"><label className="form-label">Hospital Name *</label><input className="form-control" value={hospitalRegistration.name} onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, name: e.target.value })} required /></div><div className="col-md-6"><label className="form-label">Hospital Email *</label><input type="email" className="form-control" value={hospitalRegistration.email} onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, email: e.target.value })} required /></div><div className="col-md-6"><label className="form-label">Hospital Phone *</label><input className="form-control" value={hospitalRegistration.phone} onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, phone: e.target.value })} required /></div><div className="col-md-6"><label className="form-label">Hospital Address</label><input className="form-control" value={hospitalRegistration.address} onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, address: e.target.value })} /></div><div className="col-12"><button className="btn btn-primary px-4" type="submit"><i className="bi bi-send me-2"></i>Send Registration Request</button></div></div></form></div>}
          </div></div>
        ) : (<>
        
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

        <div className="bg-white rounded-4 shadow-sm border p-3 mb-4 d-flex flex-wrap gap-2">
          <button onClick={() => setActiveSection('home')} className={`btn ${activeSection === 'home' ? 'btn-dark' : 'btn-outline-dark'} rounded-3`}><i className="bi bi-grid me-2"></i>Dashboard</button>
          <button onClick={() => setActiveSection('doctors')} className={`btn ${activeSection === 'doctors' ? 'btn-primary' : 'btn-outline-primary'} rounded-3`}><i className="bi bi-person-badge me-2"></i>Doctor Management</button>
          <button onClick={() => setActiveSection('receptionists')} className={`btn ${activeSection === 'receptionists' ? 'btn-warning' : 'btn-outline-warning'} rounded-3`}><i className="bi bi-person-workspace me-2"></i>Receptionist Management</button>
          <button onClick={() => setActiveSection('departments')} className={`btn ${activeSection === 'departments' ? 'btn-success' : 'btn-outline-success'} rounded-3`}><i className="bi bi-diagram-3 me-2"></i>Department Management</button>
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
                  <span className="fs-3 fw-bold text-warning-emphasis">{statsData?.total_receptionists ?? receptionistsList.length}</span>
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
                  <span className="fs-3 fw-bold text-success">{statsData?.total_departments ?? departmentsList.length}</span>
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
                onClick={() => openDoctorModal()}
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
                  onClick={() => openDoctorModal()}
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
                          <button onClick={() => openDoctorModal(doc)} className="btn btn-outline-primary btn-sm me-2" title="Edit Doctor"><i className="bi bi-pencil"></i> Edit</button>
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
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
            <div className="d-flex justify-content-between align-items-center mb-4"><div><h5 className="fw-bold mb-1">Receptionist Management</h5><p className="text-muted small mb-0">Create, edit, and remove reception desk accounts.</p></div><button className="btn btn-warning" onClick={() => { setEditingReceptionist(null); setReceptionistForm({ name: '', email: '', phone: '' }); setShowReceptionistModal(true); }}><i className="bi bi-plus-circle me-2"></i>Add Receptionist</button></div>
            <ManagementTable items={receptionistsList} idKey="receptionist_id" codeKey="rec_uid" onEdit={(item) => { setEditingReceptionist(item); setReceptionistForm({ name: item.name, email: item.email, phone: item.phone || '' }); setShowReceptionistModal(true); }} onDelete={deleteReceptionist} emptyText="No receptionists registered." />
          </div>
        )}

        {/* SECTION 4: DEPARTMENT MANAGEMENT VIEW */}
        {activeSection === 'departments' && (
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
            <div className="d-flex justify-content-between align-items-center mb-4"><div><h5 className="fw-bold mb-1">Department Management</h5><p className="text-muted small mb-0">Create and maintain your hospital departments.</p></div><button className="btn btn-success" onClick={() => { setEditingDepartment(null); setDepartmentForm({ name: '', description: '' }); setShowDepartmentModal(true); }}><i className="bi bi-plus-circle me-2"></i>Add Department</button></div>
            {departmentsList.length === 0 ? <p className="text-center text-muted py-5 mb-0">No departments added yet.</p> : <div className="table-responsive"><table className="table align-middle"><thead className="table-light"><tr><th>Department</th><th>Description</th><th className="text-end">Actions</th></tr></thead><tbody>{departmentsList.map((item) => <tr key={item.department_id}><td className="fw-bold">{item.name}</td><td>{item.description || '—'}</td><td className="text-end"><button className="btn btn-outline-success btn-sm me-2" onClick={() => { setEditingDepartment(item); setDepartmentForm({ name: item.name, description: item.description || '' }); setShowDepartmentModal(true); }}><i className="bi bi-pencil"></i> Edit</button><button className="btn btn-outline-danger btn-sm" onClick={() => deleteDepartment(item)}><i className="bi bi-trash"></i> Delete</button></td></tr>)}</tbody></table></div>}
          </div>
        )}

        </>)}
      </div>

      {/* REGISTER NEW DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-primary text-white rounded-top-4 p-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>{editingDoctor ? 'Edit Doctor' : 'Register New Doctor'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddDoctorModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddDoctor}>
                <div className="modal-body p-4">

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
                  {!editingDoctor && <div className="mb-3"><label className="form-label fw-semibold small">Password <span className="text-danger">*</span></label><input type="password" className="form-control" value={docPassword} onChange={(e) => setDocPassword(e.target.value)} minLength="8" required /></div>}
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
                    {submitting ? 'Saving...' : editingDoctor ? 'Save Changes' : 'Register Doctor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showReceptionistModal && (
        <div className="modal show d-block bg-dark bg-opacity-50"><div className="modal-dialog modal-dialog-centered"><div className="modal-content rounded-4 border-0"><div className="modal-header bg-warning"><h5 className="modal-title fw-bold">{editingReceptionist ? 'Edit Receptionist' : 'Add Receptionist'}</h5><button className="btn-close" onClick={() => setShowReceptionistModal(false)}></button></div><form onSubmit={saveReceptionist}><div className="modal-body p-4"><div className="mb-3"><label className="form-label">Full Name *</label><input className="form-control" value={receptionistForm.name} onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })} required /></div><div className="mb-3"><label className="form-label">Email *</label><input type="email" className="form-control" value={receptionistForm.email} onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })} required /></div><div className="mb-3"><label className="form-label">Phone</label><input className="form-control" value={receptionistForm.phone} onChange={(e) => setReceptionistForm({ ...receptionistForm, phone: e.target.value })} /></div>{!editingReceptionist && <div><label className="form-label">Password *</label><input type="password" minLength="8" className="form-control" value={receptionistForm.password} onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })} required /></div>}</div><div className="modal-footer"><button className="btn btn-secondary" type="button" onClick={() => setShowReceptionistModal(false)}>Cancel</button><button className="btn btn-warning" type="submit">Save Receptionist</button></div></form></div></div></div>
      )}

      {showDepartmentModal && (
        <div className="modal show d-block bg-dark bg-opacity-50"><div className="modal-dialog modal-dialog-centered"><div className="modal-content rounded-4 border-0"><div className="modal-header bg-success text-white"><h5 className="modal-title fw-bold">{editingDepartment ? 'Edit Department' : 'Add Department'}</h5><button className="btn-close btn-close-white" onClick={() => setShowDepartmentModal(false)}></button></div><form onSubmit={saveDepartment}><div className="modal-body p-4"><div className="mb-3"><label className="form-label">Department Name *</label><input className="form-control" value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} required /></div><div><label className="form-label">Description</label><textarea className="form-control" rows="3" value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}></textarea></div></div><div className="modal-footer"><button className="btn btn-secondary" type="button" onClick={() => setShowDepartmentModal(false)}>Cancel</button><button className="btn btn-success" type="submit">Save Department</button></div></form></div></div></div>
      )}
    </div>
  );
}

function ManagementTable({ items, idKey, codeKey, onEdit, onDelete, emptyText }) {
  if (!items.length) return <p className="text-center text-muted py-5 mb-0">{emptyText}</p>;
  return <div className="table-responsive"><table className="table align-middle"><thead className="table-light"><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th className="text-end">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item[idKey]}><td><code>{item[codeKey]}</code></td><td className="fw-bold">{item.name}</td><td>{item.email}</td><td>{item.phone || '—'}</td><td className="text-end"><button className="btn btn-outline-primary btn-sm me-2" onClick={() => onEdit(item)}><i className="bi bi-pencil"></i> Edit</button><button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(item)}><i className="bi bi-trash"></i> Delete</button></td></tr>)}</tbody></table></div>;
}

export default HospitalAdminDashboardPage;
