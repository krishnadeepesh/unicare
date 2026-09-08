import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/super-admin';

function HospitalAdminDashboardPage({ hospitalInfo, onBackToRoleSelect, onLogout, onNavigateHome }) {
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
  const [hospitalRegistration, setHospitalRegistration] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    registration_number: '',
    license_number: '',
    license_issuing_authority: '',
    license_issue_date: '',
    license_expiry_date: '',
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [existingLicenseDoc, setExistingLicenseDoc] = useState('');

  // Doctors list stored in MySQL database
  const [doctorsList, setDoctorsList] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // New Doctor Form State
  const [docName, setDocName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docPhone, setDocPhone] = useState('');
  const [docDept, setDocDept] = useState('');
  const [docLicense, setDocLicense] = useState('');
  const [docExperience, setDocExperience] = useState('');
  const [docPassword, setDocPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live validation states
  const [docTouched, setDocTouched] = useState({});
  const [recTouched, setRecTouched] = useState({});
  const [hospTouched, setHospTouched] = useState({});

  const markDocTouched = (f) => setDocTouched(p => ({ ...p, [f]: true }));
  const markRecTouched = (f) => setRecTouched(p => ({ ...p, [f]: true }));
  const markHospTouched = (f) => setHospTouched(p => ({ ...p, [f]: true }));

  const getDocErrors = () => {
    const errs = {};
    if (!docDept) errs.dept = 'Please select a department.';
    if (!docName.trim()) errs.name = 'Doctor name is required.';
    else if (docName.trim().length < 3) errs.name = 'Name must be at least 3 characters.';

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!docEmail.trim()) errs.email = 'Email address is required.';
    else if (!emailRegex.test(docEmail.trim())) errs.email = 'Enter a valid email address.';

    if (docPhone.trim()) {
      const d = docPhone.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(d)) errs.phone = 'Enter a valid 10-digit mobile number.';
    }

    if (!editingDoctor) {
      if (!docPassword) errs.password = 'Password is required.';
      else if (docPassword.length < 8) errs.password = 'Minimum 8 characters required.';
    }
    return errs;
  };

  const getRecErrors = () => {
    const errs = {};
    if (!receptionistForm.name.trim()) errs.name = 'Receptionist name is required.';
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!receptionistForm.email.trim()) errs.email = 'Email is required.';
    else if (!emailRegex.test(receptionistForm.email.trim())) errs.email = 'Enter a valid email address.';

    if (receptionistForm.phone.trim()) {
      const d = receptionistForm.phone.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
      if (!/^[6-9]\d{9}$/.test(d)) errs.phone = 'Enter a valid 10-digit mobile number.';
    }

    if (!editingReceptionist) {
      if (!receptionistForm.password) errs.password = 'Password is required.';
      else if (receptionistForm.password.length < 8) errs.password = 'Minimum 8 characters.';
    }
    return errs;
  };

  const getHospErrors = () => {
    const errs = {};
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

    // Hospital Name *
    if (!hospitalRegistration.name.trim()) {
      errs.name = 'Hospital name is required.';
    } else if (hospitalRegistration.name.trim().length < 3) {
      errs.name = 'Hospital name must be at least 3 characters.';
    }

    // Hospital Email *
    if (!hospitalRegistration.email.trim()) {
      errs.email = 'Hospital email is required.';
    } else if (!emailRegex.test(hospitalRegistration.email.trim())) {
      errs.email = 'Enter a valid email address.';
    }

    // Hospital Phone *
    const d = (hospitalRegistration.phone || '').replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!hospitalRegistration.phone || !hospitalRegistration.phone.trim()) {
      errs.phone = 'Hospital phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(d)) {
      errs.phone = 'Enter a valid 10-digit mobile number.';
    }

    // Hospital Address *
    if (!hospitalRegistration.address.trim()) {
      errs.address = 'Hospital address is required.';
    }

    // Hospital Registration Number *
    if (!hospitalRegistration.registration_number.trim()) {
      errs.registration_number = 'Hospital registration number is required.';
    }

    // Hospital License Number *
    if (!hospitalRegistration.license_number.trim()) {
      errs.license_number = 'Hospital license number is required.';
    }

    // License Issuing Authority *
    if (!hospitalRegistration.license_issuing_authority.trim()) {
      errs.license_issuing_authority = 'License issuing authority is required.';
    }

    // License Issue Date *
    if (!hospitalRegistration.license_issue_date) {
      errs.license_issue_date = 'License issue date is required.';
    }

    // License Expiry Date
    if (hospitalRegistration.license_expiry_date && hospitalRegistration.license_issue_date) {
      if (new Date(hospitalRegistration.license_expiry_date) < new Date(hospitalRegistration.license_issue_date)) {
        errs.license_expiry_date = 'Expiry date cannot be before issue date.';
      }
    }

    // License Document (PDF file) *
    if (!licenseFile && !existingLicenseDoc) {
      errs.license_document = 'Please upload the hospital license document (PDF format).';
    } else if (licenseFile && !licenseFile.name.toLowerCase().endsWith('.pdf')) {
      errs.license_document = 'Only PDF files are accepted.';
    }

    return errs;
  };

  const docErrors = getDocErrors();
  const recErrors = getRecErrors();
  const hospErrors = getHospErrors();

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
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        if (data.hospital_info) {
          setHospitalData(data.hospital_info);
          setHospitalRegistration({
            name: data.hospital_info.hospital_name || data.hospital_info.name || '',
            email: data.hospital_info.hospital_email || data.hospital_info.email || '',
            phone: data.hospital_info.hospital_phone || data.hospital_info.phone || '',
            address: data.hospital_info.hospital_address || data.hospital_info.address || '',
            registration_number: data.hospital_info.hospital_registration_number || '',
            license_number: data.hospital_info.hospital_license_number || '',
            license_issuing_authority: data.hospital_info.license_issuing_authority || '',
            license_issue_date: data.hospital_info.license_issue_date || '',
            license_expiry_date: data.hospital_info.license_expiry_date || '',
          });
          if (data.hospital_info.license_document) {
            setExistingLicenseDoc(data.hospital_info.license_document);
          }
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
        credentials: 'include',
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
        fetch(`${API_BASE_URL}/receptionists/?hospital_id=${encodeURIComponent(targetHId)}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/departments/?hospital_id=${encodeURIComponent(targetHId)}`, { credentials: 'include' }),
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
  }, []);

  // Re-fetch management data (departments, receptionists) once hospitalData is resolved
  useEffect(() => {
    if (hospitalData?.hospital_id || initialHospitalId) {
      fetchManagementData();
    }
  }, [hospitalData?.hospital_id]);

  const currentHospitalName = hospitalData?.name || hospitalData?.hospital_name || hospitalInfo?.name || hospitalInfo?.hospital_name || 'City General Hospital';
  const currentHospitalUid = hospitalData?.hospital_uid || hospitalData?.id || initialHospitalId || 'HSP0001';
  const currentHospitalId = hospitalData?.hospital_id || initialHospitalId;
  const registrationStatus = hospitalData?.status || hospitalData?.hospital_status || hospitalInfo?.status || hospitalInfo?.hospital_status || 'Draft';
  const isApproved = registrationStatus === 'Approved';
  const userRole = hospitalData?.role || hospitalInfo?.role || 'Hospital Administrator';
  const username = hospitalData?.username || hospitalData?.user_name || hospitalInfo?.username || hospitalInfo?.user_name || hospitalInfo?.adminEmail || hospitalInfo?.email || 'admin';

  const validatePhone = (value) => {
    if (!value || !value.trim()) return true; // optional field
    const digits = value.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
    return /^[6-9]\d{9}$/.test(digits);
  };

  // Handle Add Doctor directly into MySQL
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setDocTouched({
      dept: true,
      name: true,
      email: true,
      phone: true,
      password: true,
    });

    const errs = getDocErrors();
    if (Object.keys(errs).length > 0) {
      showToast(Object.values(errs)[0], 'danger');
      return;
    }

    setSubmitting(true);
    const payload = {
      hospital_id: currentHospitalId,
      name: docName.trim(),
      email: docEmail.trim(),
      phone: docPhone.trim(),
      department: docDept,
      specialization: docDept,
      license: docLicense.trim(),
      experience: docExperience.trim(),
      password: docPassword,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/doctors/${editingDoctor ? 'update' : 'add'}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        setDocDept('');
        setDocLicense('');
        setDocExperience('');
        setDocPassword('');
        setDocTouched({});
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
    setDocTouched({});
    setEditingDoctor(doctor);
    setDocName(doctor?.name || '');
    setDocEmail(doctor?.email || '');
    setDocPhone(doctor?.phone || '');
    setDocDept(doctor?.department || doctor?.specialization || '');
    setDocLicense(doctor?.license || '');
    setDocExperience(doctor?.experience || '');
    setDocPassword('');
    setShowAddDoctorModal(true);
  };

  const saveReceptionist = async (e) => {
    e.preventDefault();
    setRecTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
    });

    const errs = getRecErrors();
    if (Object.keys(errs).length > 0) {
      showToast(Object.values(errs)[0], 'danger');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/receptionists/${editingReceptionist ? 'update' : 'add'}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ hospital_id: currentHospitalId, ...receptionistForm, ...(editingReceptionist ? { receptionist_id: editingReceptionist.receptionist_id } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      showToast(data.message); setShowReceptionistModal(false); setEditingReceptionist(null); setReceptionistForm({ name: '', email: '', phone: '' }); setRecTouched({}); fetchManagementData(); fetchDashboardData();
    } catch (err) { showToast(err.message || 'Could not save receptionist.', 'danger'); }
  };

  const deleteReceptionist = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const response = await fetch(`${API_BASE_URL}/receptionists/delete/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ receptionist_id: item.receptionist_id }) });
    const data = await response.json(); showToast(data.message, response.ok ? 'warning' : 'danger'); if (response.ok) { fetchManagementData(); fetchDashboardData(); }
  };

  const saveDepartment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/departments/save/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ hospital_id: currentHospitalId, ...departmentForm, ...(editingDepartment ? { department_id: editingDepartment.department_id } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      showToast(data.message); setShowDepartmentModal(false); setEditingDepartment(null); setDepartmentForm({ name: '', description: '' }); fetchManagementData(); fetchDashboardData();
    } catch (err) { showToast(err.message || 'Could not save department.', 'danger'); }
  };

  const deleteDepartment = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    const response = await fetch(`${API_BASE_URL}/departments/delete/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ hospital_id: currentHospitalId, department_id: item.department_id }) });
    const data = await response.json(); showToast(data.message, response.ok ? 'warning' : 'danger'); if (response.ok) { fetchManagementData(); fetchDashboardData(); }
  };

  const submitHospitalRegistration = async (e) => {
    e.preventDefault();
    setHospTouched({
      name: true,
      email: true,
      phone: true,
      address: true,
      registration_number: true,
      license_number: true,
      license_issuing_authority: true,
      license_issue_date: true,
      license_expiry_date: true,
      license_document: true,
    });

    const errs = getHospErrors();
    if (Object.keys(errs).length > 0) {
      showToast(Object.values(errs)[0], 'danger');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('hospital_id', currentHospitalId || '');
      formData.append('hospital_name', hospitalRegistration.name);
      formData.append('hospital_email', hospitalRegistration.email);
      formData.append('hospital_phone', hospitalRegistration.phone);
      formData.append('hospital_address', hospitalRegistration.address);
      formData.append('hospital_registration_number', hospitalRegistration.registration_number);
      formData.append('hospital_license_number', hospitalRegistration.license_number);
      formData.append('license_issuing_authority', hospitalRegistration.license_issuing_authority);
      formData.append('license_issue_date', hospitalRegistration.license_issue_date);
      formData.append('license_expiry_date', hospitalRegistration.license_expiry_date || '');
      if (licenseFile) {
        formData.append('license_document', licenseFile);
      }

      const response = await fetch(`${API_BASE_URL}/hospital-registration/submit/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setHospitalData((current) => ({
        ...current,
        hospital_name: hospitalRegistration.name,
        name: hospitalRegistration.name,
        hospital_email: hospitalRegistration.email,
        email: hospitalRegistration.email,
        hospital_phone: hospitalRegistration.phone,
        phone: hospitalRegistration.phone,
        hospital_address: hospitalRegistration.address,
        address: hospitalRegistration.address,
        hospital_registration_number: hospitalRegistration.registration_number,
        hospital_license_number: hospitalRegistration.license_number,
        license_issuing_authority: hospitalRegistration.license_issuing_authority,
        license_issue_date: hospitalRegistration.license_issue_date,
        license_expiry_date: hospitalRegistration.license_expiry_date,
        license_document: data.license_document || current?.license_document,
        status: 'Pending',
        hospital_status: 'Pending',
      }));
      if (data.license_document) {
        setExistingLicenseDoc(data.license_document);
      }
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
        credentials: 'include',
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
    <div className="d-flex min-vh-100 bg-light" style={{ fontFamily: 'var(--font-body)' }}>
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

      {/* FIXED LEFT SIDEBAR (LIGHT THEME, ROOMY & BEAUTIFULLY ANIMATED) */}
      <aside className="unicare-sidebar">
        {/* Brand Header */}
        <div 
          className="sidebar-brand-box" 
          onClick={() => onNavigateHome && onNavigateHome()} 
          title="Return to UniCare Homepage"
          style={{ cursor: 'pointer' }}
        >
          <div className="sidebar-brand-icon">
            <i className="bi bi-shield-plus"></i>
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-slate-800" style={{ fontSize: '1.1rem', letterSpacing: '0.3px' }}>UniCare</h6>
            <small className="text-teal fw-bold extra-small" style={{ fontSize: '0.74rem', letterSpacing: '0.6px' }}>HOSPITAL ADMIN</small>
          </div>
        </div>

        {/* Hospital Card */}
        <div className="sidebar-context-card">
          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{currentHospitalName}</div>
          <small className="text-muted d-block text-truncate mb-2" style={{ fontSize: '0.8rem' }}>Admin: {username}</small>
          <div className="badge bg-white text-teal border px-2.5 py-1.5 rounded-2 font-monospace w-100 text-truncate text-start" style={{ color: '#0d9488', fontSize: '0.75rem' }}>
            ID: {currentHospitalUid}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="d-flex flex-column mb-auto">
          <div className="sidebar-section-title">
            Administration
          </div>

          {[
            { id: 'home', icon: 'bi-speedometer2', label: 'Dashboard' },
            { id: 'doctors', icon: 'bi-person-badge', label: 'Doctor Management', count: doctorsList.length },
            { id: 'receptionists', icon: 'bi-person-workspace', label: 'Staff & Receptionists', count: receptionistsList.length },
            { id: 'departments', icon: 'bi-diagram-3', label: 'Departments', count: departmentsList.length },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`sidebar-nav-link ${activeSection === item.id ? 'active' : ''}`}
            >
              <div className="sidebar-nav-icon-box">
                <i className={`bi ${item.icon}`}></i>
              </div>
              <span className="flex-grow-1 text-truncate">{item.label}</span>
              {item.count > 0 && (
                <span className="sidebar-count-badge">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow-1 overflow-auto d-flex flex-column min-vh-100">
        {/* Top Header Bar */}
        <header className="portal-topbar d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-teal-subtle text-teal px-3 py-1.5 rounded-pill fw-bold" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
              🏥 {currentHospitalName} ({currentHospitalUid})
            </span>
          </div>

          {/* Top Right Profile Avatar Dropdown */}
          <div className="position-relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-2.5 border-0 shadow-none"
              style={{ outline: 'none' }}
            >
              <div className="text-end d-none d-sm-block">
                <div className="fw-bold text-dark small">{username}</div>
                <small className="text-muted extra-small">Hospital Administrator</small>
              </div>
              <div className="rounded-circle bg-teal text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}>
                {username ? username.charAt(0).toUpperCase() : 'A'}
              </div>
              <i className={`bi bi-chevron-${showProfileMenu ? 'up' : 'down'} text-muted extra-small ms-1`}></i>
            </button>

            {showProfileMenu && (
              <div 
                className="dropdown-menu dropdown-menu-end show shadow-lg border-0 rounded-4 p-2 mt-2" 
                style={{ minWidth: '230px', zIndex: 1050, position: 'absolute', right: 0 }}
              >
                <div className="px-3 py-2 border-bottom mb-1 bg-light rounded-3">
                  <div className="fw-bold text-dark small">{username}</div>
                  <small className="text-muted extra-small d-block text-truncate">{hospitalData?.email || 'admin@hospital.com'}</small>
                  <span className="badge bg-teal-subtle text-teal mt-1 font-monospace extra-small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    {currentHospitalUid}
                  </span>
                </div>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                  onClick={() => { setActiveSection('home'); setShowProfileMenu(false); }}
                >
                  <i className="bi bi-speedometer2 text-teal fs-6"></i>
                  <span>Admin Dashboard</span>
                </button>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                  onClick={() => { setShowProfileMenu(false); onNavigateHome && onNavigateHome(); }}
                >
                  <i className="bi bi-house-door text-teal fs-6" style={{ color: '#0d9488' }}></i>
                  <span>Return to Homepage</span>
                </button>
                <div className="dropdown-divider my-1"></div>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-danger small fw-semibold"
                  onClick={() => { setShowProfileMenu(false); onLogout(); }}
                >
                  <i className="bi bi-box-arrow-right fs-6"></i>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Body */}
        <div className="container-fluid max-w-7xl py-4 flex-grow-1 px-lg-5 animate-soft-entrance">
        {!isApproved ? (
          <div className="row justify-content-center"><div className="col-lg-8">
            <div className={`alert ${registrationStatus === 'Rejected' ? 'alert-danger' : 'alert-warning'} border-0 rounded-4 shadow-sm p-4 mb-4`}>
              <h4 className="fw-bold mb-2"><i className="bi bi-hourglass-split me-2"></i>Hospital Registration Status: {registrationStatus}</h4>
              <p className="mb-0">{registrationStatus === 'Pending' ? 'Your registration has been sent to Super Admin. Management tools will unlock after approval.' : registrationStatus === 'Rejected' ? 'Your registration was not approved. Update the details and submit again.' : 'Complete the hospital registration below to request UniCare access from Super Admin.'}</p>
            </div>
            {registrationStatus !== 'Pending' && (
              <div className="card border-0 rounded-4 shadow-sm p-4">
                <h4 className="fw-bold mb-1">Hospital Registration</h4>
                <p className="text-muted small mb-4">Submit these details for Super Admin approval.</p>
                <form onSubmit={submitHospitalRegistration} noValidate>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hospital Name <span className="text-danger">*</span></label>
                      <input 
                        type="text"
                        className={`form-control ${hospTouched.name ? (hospErrors.name ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.name} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, name: e.target.value })} 
                        onBlur={() => markHospTouched('name')}
                        placeholder="e.g. City General Hospital"
                        required 
                      />
                      {hospTouched.name && hospErrors.name && (
                        <div className="invalid-feedback small">{hospErrors.name}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hospital Email <span className="text-danger">*</span></label>
                      <input 
                        type="email" 
                        className={`form-control ${hospTouched.email ? (hospErrors.email ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.email} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, email: e.target.value })} 
                        onBlur={() => markHospTouched('email')}
                        placeholder="admin@hospital.com"
                        required 
                      />
                      {hospTouched.email && hospErrors.email && (
                        <div className="invalid-feedback small">{hospErrors.email}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hospital Phone <span className="text-danger">*</span></label>
                      <input 
                        type="tel"
                        className={`form-control ${hospTouched.phone ? (hospErrors.phone ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.phone} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, phone: e.target.value })} 
                        onBlur={() => markHospTouched('phone')}
                        placeholder="10-digit mobile number"
                        required 
                      />
                      {hospTouched.phone && hospErrors.phone && (
                        <div className="invalid-feedback small">{hospErrors.phone}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hospital Registration Number <span className="text-danger">*</span></label>
                      <input 
                        type="text"
                        className={`form-control ${hospTouched.registration_number ? (hospErrors.registration_number ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.registration_number} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, registration_number: e.target.value })} 
                        onBlur={() => markHospTouched('registration_number')}
                        placeholder="e.g. HOSP-REG-2026-001"
                        required 
                      />
                      {hospTouched.registration_number && hospErrors.registration_number && (
                        <div className="invalid-feedback small">{hospErrors.registration_number}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Hospital License Number <span className="text-danger">*</span></label>
                      <input 
                        type="text"
                        className={`form-control ${hospTouched.license_number ? (hospErrors.license_number ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.license_number} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, license_number: e.target.value })} 
                        onBlur={() => markHospTouched('license_number')}
                        placeholder="e.g. LIC-KL-2026-987"
                        required 
                      />
                      {hospTouched.license_number && hospErrors.license_number && (
                        <div className="invalid-feedback small">{hospErrors.license_number}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">License Issuing Authority <span className="text-danger">*</span></label>
                      <input 
                        type="text"
                        className={`form-control ${hospTouched.license_issuing_authority ? (hospErrors.license_issuing_authority ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.license_issuing_authority} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, license_issuing_authority: e.target.value })} 
                        onBlur={() => markHospTouched('license_issuing_authority')}
                        placeholder="e.g. State Directorate of Health Services"
                        required 
                      />
                      {hospTouched.license_issuing_authority && hospErrors.license_issuing_authority && (
                        <div className="invalid-feedback small">{hospErrors.license_issuing_authority}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">License Issue Date <span className="text-danger">*</span></label>
                      <input 
                        type="date"
                        className={`form-control ${hospTouched.license_issue_date ? (hospErrors.license_issue_date ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.license_issue_date} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, license_issue_date: e.target.value })} 
                        onBlur={() => markHospTouched('license_issue_date')}
                        required 
                      />
                      {hospTouched.license_issue_date && hospErrors.license_issue_date && (
                        <div className="invalid-feedback small">{hospErrors.license_issue_date}</div>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">License Expiry Date</label>
                      <input 
                        type="date"
                        className={`form-control ${hospTouched.license_expiry_date ? (hospErrors.license_expiry_date ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={hospitalRegistration.license_expiry_date} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, license_expiry_date: e.target.value })} 
                        onBlur={() => markHospTouched('license_expiry_date')}
                      />
                      {hospTouched.license_expiry_date && hospErrors.license_expiry_date && (
                        <div className="invalid-feedback small">{hospErrors.license_expiry_date}</div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Hospital Address <span className="text-danger">*</span></label>
                      <textarea 
                        className={`form-control ${hospTouched.address ? (hospErrors.address ? 'is-invalid' : 'is-valid') : ''}`} 
                        rows="2"
                        value={hospitalRegistration.address} 
                        onChange={(e) => setHospitalRegistration({ ...hospitalRegistration, address: e.target.value })} 
                        onBlur={() => markHospTouched('address')}
                        placeholder="Complete hospital physical address, city, state, pincode"
                        required
                      />
                      {hospTouched.address && hospErrors.address && (
                        <div className="invalid-feedback small">{hospErrors.address}</div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        Upload License Document (PDF only) <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="file" 
                        accept="application/pdf,.pdf"
                        className={`form-control ${hospTouched.license_document ? (hospErrors.license_document ? 'is-invalid' : 'is-valid') : ''}`}
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          setLicenseFile(file || null);
                          markHospTouched('license_document');
                        }}
                        onBlur={() => markHospTouched('license_document')}
                      />
                      {hospTouched.license_document && hospErrors.license_document && (
                        <div className="invalid-feedback small">{hospErrors.license_document}</div>
                      )}
                      {existingLicenseDoc && !licenseFile && (
                        <small className="text-muted mt-1 d-block">
                          <i className="bi bi-file-earmark-pdf text-danger me-1"></i> Current document uploaded:{' '}
                          <a 
                            href={`http://localhost:8000/media/${existingLicenseDoc}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary text-decoration-underline"
                          >
                            View Uploaded PDF
                          </a>
                        </small>
                      )}
                      {licenseFile && (
                        <small className="text-success mt-1 d-block">
                          <i className="bi bi-check-circle me-1"></i> Selected: {licenseFile.name} ({(licenseFile.size / 1024).toFixed(1)} KB)
                        </small>
                      )}
                    </div>
                    <div className="col-12">
                      <button className="btn btn-teal text-white px-4 fw-semibold rounded-3 shadow-sm" type="submit" style={{ backgroundColor: '#0d9488' }}>
                        <i className="bi bi-send me-2"></i>Send Registration Request
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
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
          <button onClick={() => setActiveSection('home')} className={`btn ${activeSection === 'home' ? 'btn-teal text-white' : 'btn-outline-teal'} rounded-3`} style={activeSection === 'home' ? { backgroundColor: '#0d9488' } : {}}><i className="bi bi-grid me-2"></i>Dashboard</button>
          <button onClick={() => setActiveSection('doctors')} className={`btn ${activeSection === 'doctors' ? 'btn-teal text-white' : 'btn-outline-teal'} rounded-3`} style={activeSection === 'doctors' ? { backgroundColor: '#0d9488' } : {}}><i className="bi bi-person-badge me-2"></i>Doctor Management</button>
          <button onClick={() => setActiveSection('receptionists')} className={`btn ${activeSection === 'receptionists' ? 'btn-teal text-white' : 'btn-outline-teal'} rounded-3`} style={activeSection === 'receptionists' ? { backgroundColor: '#0d9488' } : {}}><i className="bi bi-person-workspace me-2"></i>Receptionist Management</button>
          <button onClick={() => setActiveSection('departments')} className={`btn ${activeSection === 'departments' ? 'btn-teal text-white' : 'btn-outline-teal'} rounded-3`} style={activeSection === 'departments' ? { backgroundColor: '#0d9488' } : {}}><i className="bi bi-diagram-3 me-2"></i>Department Management</button>
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
                    <span className="text-muted small d-block mb-1">License Number</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.hospital_license_number || hospitalData?.license_number || 'N/A'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Issuing Authority</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.license_issuing_authority || 'N/A'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">License Validity</span>
                    <span className="fw-semibold text-dark fs-6">
                      {hospitalData?.license_issue_date ? `Issued: ${hospitalData.license_issue_date}` : 'N/A'}
                      {hospitalData?.license_expiry_date ? ` · Exp: ${hospitalData.license_expiry_date}` : ''}
                    </span>
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="p-3 bg-light rounded-3 border">
                    <span className="text-muted small d-block mb-1">Address</span>
                    <span className="fw-semibold text-dark fs-6">{hospitalData?.address || hospitalData?.hospital_address || 'N/A'}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded-3 border d-flex flex-column justify-content-between h-100">
                    <span className="text-muted small d-block mb-1">Hospital License Document</span>
                    {hospitalData?.license_document ? (
                      <a 
                        href={`http://localhost:8000/media/${hospitalData.license_document}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-danger fw-semibold mt-1"
                      >
                        <i className="bi bi-file-earmark-pdf me-1"></i>View Uploaded PDF
                      </a>
                    ) : (
                      <span className="text-muted small">No document uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* HOSPITAL-SPECIFIC SUMMARY STATISTICS (CLICKABLE REDIRECTION) */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-4 col-lg">
                <div 
                  className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-primary hover-teal cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveSection('doctors')}
                  title="Click to view Doctors"
                >
                  <span className="text-muted small d-block mb-1">Total Doctors</span>
                  <span className="fs-3 fw-bold text-primary">{statsData?.total_doctors ?? doctorsList.length}</span>
                  <small className="text-primary d-block mt-1"><i className="bi bi-arrow-right-circle me-1"></i>Manage</small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg">
                <div 
                  className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-warning hover-teal cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveSection('receptionists')}
                  title="Click to view Receptionists"
                >
                  <span className="text-muted small d-block mb-1">Total Receptionists</span>
                  <span className="fs-3 fw-bold text-warning-emphasis">{statsData?.total_receptionists ?? receptionistsList.length}</span>
                  <small className="text-warning-emphasis d-block mt-1"><i className="bi bi-arrow-right-circle me-1"></i>Manage</small>
                </div>
              </div>
              <div className="col-6 col-md-4 col-lg">
                <div 
                  className="card border-0 rounded-4 shadow-sm bg-white p-3 text-center border-bottom border-4 border-success hover-teal cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveSection('departments')}
                  title="Click to view Departments"
                >
                  <span className="text-muted small d-block mb-1">Departments</span>
                  <span className="fs-3 fw-bold text-success">{statsData?.total_departments ?? departmentsList.length}</span>
                  <small className="text-success d-block mt-1"><i className="bi bi-arrow-right-circle me-1"></i>Manage</small>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="card border-0 rounded-4 shadow-sm bg-white p-4 mb-4">
              <h5 className="fw-bold text-dark mb-3"><i className="bi bi-lightning-charge-fill text-teal me-2" style={{ color: '#0d9488' }}></i>Quick Administrative Actions</h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <button 
                    className="btn btn-outline-teal w-100 p-3 rounded-3 text-start d-flex align-items-center gap-3"
                    onClick={() => { setActiveSection('doctors'); openDoctorModal(); }}
                  >
                    <i className="bi bi-person-plus-fill fs-3 text-teal" style={{ color: '#0d9488' }}></i>
                    <div>
                      <div className="fw-bold">Register Doctor</div>
                      <small className="text-muted">Add doctor with login credentials</small>
                    </div>
                  </button>
                </div>
                <div className="col-md-4">
                  <button 
                    className="btn btn-outline-teal w-100 p-3 rounded-3 text-start d-flex align-items-center gap-3"
                    onClick={() => { setActiveSection('receptionists'); setShowReceptionistModal(true); }}
                  >
                    <i className="bi bi-person-workspace fs-3 text-teal" style={{ color: '#0d9488' }}></i>
                    <div>
                      <div className="fw-bold">Add Receptionist</div>
                      <small className="text-muted">Create desk staff account</small>
                    </div>
                  </button>
                </div>
                <div className="col-md-4">
                  <button 
                    className="btn btn-outline-teal w-100 p-3 rounded-3 text-start d-flex align-items-center gap-3"
                    onClick={() => { setActiveSection('departments'); setShowDepartmentModal(true); }}
                  >
                    <i className="bi bi-diagram-3-fill fs-3 text-teal" style={{ color: '#0d9488' }}></i>
                    <div>
                      <div className="fw-bold">Create Department</div>
                      <small className="text-muted">Add medical specialty unit</small>
                    </div>
                  </button>
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
                <p className="text-muted small mb-0">Doctor records directory and login management. </p>
              </div>
              <button 
                onClick={() => openDoctorModal()}
                className="btn btn-teal text-white rounded-3 fw-bold d-flex align-items-center gap-2 shadow-sm"
                style={{ backgroundColor: '#0d9488' }}
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
                <p className="text-muted small mb-3">Click the button above to register your first doctor.</p>
                <button 
                  onClick={() => openDoctorModal()}
                  className="btn btn-outline-teal btn-sm rounded-pill"
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
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorsList.map((doc) => (
                      <tr key={doc.doctor_id || doc.id}>
                        <td><code className="fw-bold text-teal" style={{ color: '#0d9488' }}>{doc.doc_uid || doc.id}</code></td>
                        <td className="fw-bold text-dark">{doc.name}</td>
                        <td>{doc.email}</td>
                        <td>{doc.phone || 'N/A'}</td>
                        <td><span className="badge bg-teal-subtle text-teal" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>{doc.department || doc.specialization}</span></td>
                        <td className="text-end">
                          <button onClick={() => openDoctorModal(doc)} className="btn btn-outline-teal btn-sm me-2" title="Edit Doctor"><i className="bi bi-pencil"></i> Edit</button>
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
            <div className="d-flex justify-content-between align-items-center mb-4"><div><h5 className="fw-bold mb-1">Receptionist Management</h5><p className="text-muted small mb-0">Create, edit, and remove reception desk accounts.</p></div><button className="btn btn-teal text-white shadow-sm" style={{ backgroundColor: '#0d9488' }} onClick={() => { setEditingReceptionist(null); setReceptionistForm({ name: '', email: '', phone: '' }); setShowReceptionistModal(true); }}><i className="bi bi-plus-circle me-2"></i>Add Receptionist</button></div>
            <ManagementTable items={receptionistsList} idKey="receptionist_id" codeKey="rec_uid" onEdit={(item) => { setEditingReceptionist(item); setReceptionistForm({ name: item.name, email: item.email, phone: item.phone || '' }); setShowReceptionistModal(true); }} onDelete={deleteReceptionist} emptyText="No receptionists registered." />
          </div>
        )}

        {/* SECTION 4: DEPARTMENT MANAGEMENT VIEW */}
        {activeSection === 'departments' && (
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4">
            <div className="d-flex justify-content-between align-items-center mb-4"><div><h5 className="fw-bold mb-1">Department Management</h5><p className="text-muted small mb-0">Create and maintain your hospital departments.</p></div><button className="btn btn-teal text-white shadow-sm" style={{ backgroundColor: '#0d9488' }} onClick={() => { setEditingDepartment(null); setDepartmentForm({ name: '', description: '' }); setShowDepartmentModal(true); }}><i className="bi bi-plus-circle me-2"></i>Add Department</button></div>
            {departmentsList.length === 0 ? <p className="text-center text-muted py-5 mb-0">No departments added yet.</p> : <div className="table-responsive"><table className="table align-middle"><thead className="table-light"><tr><th>Department</th><th>Description</th><th className="text-end">Actions</th></tr></thead><tbody>{departmentsList.map((item) => <tr key={item.department_id}><td className="fw-bold">{item.name}</td><td>{item.description || '—'}</td><td className="text-end"><button className="btn btn-outline-teal btn-sm me-2" onClick={() => { setEditingDepartment(item); setDepartmentForm({ name: item.name, description: item.description || '' }); setShowDepartmentModal(true); }}><i className="bi bi-pencil"></i> Edit</button><button className="btn btn-outline-danger btn-sm" onClick={() => deleteDepartment(item)}><i className="bi bi-trash"></i> Delete</button></td></tr>)}</tbody></table></div>}
          </div>
        )}

        </>)}
      </div>

      {/* REGISTER NEW DOCTOR MODAL */}
      {showAddDoctorModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-teal text-white rounded-top-4 p-4" style={{ backgroundColor: '#0d9488' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>{editingDoctor ? 'Edit Doctor' : 'Register New Doctor'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddDoctorModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddDoctor} noValidate>
                <div className="modal-body p-4">

                  {/* 1. Department Field First */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">
                      Department <span className="text-danger">*</span>
                    </label>
                    {departmentsList.length === 0 ? (
                      <div className="alert alert-warning p-2 mb-0 small">
                        No departments found. Please add departments first.
                      </div>
                    ) : (
                      <>
                        <select
                          className={`form-select ${docTouched.dept ? (docErrors.dept ? 'is-invalid' : 'is-valid') : ''}`}
                          value={docDept}
                          onChange={(e) => { setDocDept(e.target.value); markDocTouched('dept'); }}
                          onBlur={() => markDocTouched('dept')}
                          required
                        >
                          <option value="">-- Select Department --</option>
                          {departmentsList.filter(d => d.is_active !== false).map(dept => (
                            <option key={dept.department_id || dept.id || dept.name} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {docTouched.dept && docErrors.dept && (
                          <div className="invalid-feedback small">{docErrors.dept}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 2. Doctor Full Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Doctor Full Name <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      className={`form-control ${docTouched.name ? (docErrors.name ? 'is-invalid' : 'is-valid') : ''}`}
                      required
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      onBlur={() => markDocTouched('name')}
                      placeholder="e.g. Dr. John Doe"
                    />
                    {docTouched.name && docErrors.name && (
                      <div className="invalid-feedback small">{docErrors.name}</div>
                    )}
                  </div>

                  {/* 3. Email Address */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email Address <span className="text-danger">*</span></label>
                    <input 
                      type="email" 
                      className={`form-control ${docTouched.email ? (docErrors.email ? 'is-invalid' : 'is-valid') : ''}`}
                      required
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      onBlur={() => markDocTouched('email')}
                      placeholder="doctor@hospital.com"
                    />
                    {docTouched.email && docErrors.email && (
                      <div className="invalid-feedback small">{docErrors.email}</div>
                    )}
                  </div>

                  {/* 4. Phone Number & License Number */}
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Phone Number</label>
                      <input 
                        type="tel" 
                        className={`form-control ${docTouched.phone ? (docErrors.phone ? 'is-invalid' : 'is-valid') : ''}`}
                        value={docPhone}
                        onChange={(e) => setDocPhone(e.target.value)}
                        onBlur={() => markDocTouched('phone')}
                        placeholder="10-digit mobile"
                        maxLength="15"
                      />
                      {docTouched.phone && docErrors.phone && (
                        <div className="invalid-feedback small">{docErrors.phone}</div>
                      )}
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Medical License Number</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={docLicense}
                        onChange={(e) => setDocLicense(e.target.value)}
                        placeholder="e.g. MED12345"
                      />
                    </div>
                  </div>

                  {/* 5. Experience */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Experience</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={docExperience} 
                      onChange={(e) => setDocExperience(e.target.value)} 
                      placeholder="e.g. 5 years, Senior Consultant"
                    />
                  </div>

                  {/* 6. Password (for new doctor) */}
                  {!editingDoctor && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Password <span className="text-danger">*</span></label>
                      <input 
                        type="password" 
                        className={`form-control ${docTouched.password ? (docErrors.password ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={docPassword} 
                        onChange={(e) => setDocPassword(e.target.value)} 
                        onBlur={() => markDocTouched('password')}
                        minLength="8" 
                        required 
                        placeholder="Minimum 8 characters"
                      />
                      {docTouched.password && docErrors.password && (
                        <div className="invalid-feedback small">{docErrors.password}</div>
                      )}
                    </div>
                  )}
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
                    className="btn btn-teal text-white rounded-3 px-4 fw-bold shadow-sm"
                    style={{ backgroundColor: '#0d9488' }}
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
        <div className="modal show d-block bg-dark bg-opacity-50">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0">
              <div className="modal-header bg-teal text-white" style={{ backgroundColor: '#0d9488' }}>
                <h5 className="modal-title fw-bold text-white">{editingReceptionist ? 'Edit Receptionist' : 'Add Receptionist'}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowReceptionistModal(false)}></button>
              </div>
              <form onSubmit={saveReceptionist} noValidate>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Full Name <span className="text-danger">*</span></label>
                    <input 
                      className={`form-control ${recTouched.name ? (recErrors.name ? 'is-invalid' : 'is-valid') : ''}`} 
                      value={receptionistForm.name} 
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })} 
                      onBlur={() => markRecTouched('name')}
                      placeholder="e.g. Sarah Jenkins"
                      required 
                    />
                    {recTouched.name && recErrors.name && (
                      <div className="invalid-feedback small">{recErrors.name}</div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email <span className="text-danger">*</span></label>
                    <input 
                      type="email" 
                      className={`form-control ${recTouched.email ? (recErrors.email ? 'is-invalid' : 'is-valid') : ''}`} 
                      value={receptionistForm.email} 
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })} 
                      onBlur={() => markRecTouched('email')}
                      placeholder="reception@hospital.com"
                      required 
                    />
                    {recTouched.email && recErrors.email && (
                      <div className="invalid-feedback small">{recErrors.email}</div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Phone</label>
                    <input 
                      type="tel"
                      className={`form-control ${recTouched.phone ? (recErrors.phone ? 'is-invalid' : 'is-valid') : ''}`} 
                      value={receptionistForm.phone} 
                      onChange={(e) => setReceptionistForm({ ...receptionistForm, phone: e.target.value })} 
                      onBlur={() => markRecTouched('phone')}
                      placeholder="10-digit mobile number"
                    />
                    {recTouched.phone && recErrors.phone && (
                      <div className="invalid-feedback small">{recErrors.phone}</div>
                    )}
                  </div>
                  {!editingReceptionist && (
                    <div className="mb-2">
                      <label className="form-label fw-semibold small">Password <span className="text-danger">*</span></label>
                      <input 
                        type="password" 
                        minLength="8" 
                        className={`form-control ${recTouched.password ? (recErrors.password ? 'is-invalid' : 'is-valid') : ''}`} 
                        value={receptionistForm.password} 
                        onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })} 
                        onBlur={() => markRecTouched('password')}
                        placeholder="Minimum 8 characters"
                        required 
                      />
                      {recTouched.password && recErrors.password && (
                        <div className="invalid-feedback small">{recErrors.password}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 p-4 pt-0">
                  <button className="btn btn-secondary rounded-3 px-4" type="button" onClick={() => setShowReceptionistModal(false)}>Cancel</button>
                  <button className="btn btn-teal text-white rounded-3 px-4 fw-bold shadow-sm" type="submit" style={{ backgroundColor: '#0d9488' }}>Save Receptionist</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDepartmentModal && (
        <div className="modal show d-block bg-dark bg-opacity-50"><div className="modal-dialog modal-dialog-centered"><div className="modal-content rounded-4 border-0"><div className="modal-header bg-teal text-white" style={{ backgroundColor: '#0d9488' }}><h5 className="modal-title fw-bold text-white">{editingDepartment ? 'Edit Department' : 'Add Department'}</h5><button className="btn-close btn-close-white" onClick={() => setShowDepartmentModal(false)}></button></div><form onSubmit={saveDepartment}><div className="modal-body p-4"><div className="mb-3"><label className="form-label">Department Name *</label><input className="form-control" value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} required /></div><div><label className="form-label">Description</label><textarea className="form-control" rows="3" value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}></textarea></div></div><div className="modal-footer"><button className="btn btn-secondary" type="button" onClick={() => setShowDepartmentModal(false)}>Cancel</button><button className="btn btn-teal text-white" type="submit" style={{ backgroundColor: '#0d9488' }}>Save Department</button></div></form></div></div></div>
      )}
      </main>
    </div>
  );
}

function ManagementTable({ items, idKey, codeKey, onEdit, onDelete, emptyText }) {
  if (!items.length) return <p className="text-center text-muted py-5 mb-0">{emptyText}</p>;
  return <div className="table-responsive"><table className="table align-middle"><thead className="table-light"><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th className="text-end">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item[idKey]}><td><code>{item[codeKey]}</code></td><td className="fw-bold">{item.name}</td><td>{item.email}</td><td>{item.phone || '—'}</td><td className="text-end"><button className="btn btn-outline-teal btn-sm me-2" onClick={() => onEdit(item)}><i className="bi bi-pencil"></i> Edit</button><button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(item)}><i className="bi bi-trash"></i> Delete</button></td></tr>)}</tbody></table></div>;
}

export default HospitalAdminDashboardPage;
