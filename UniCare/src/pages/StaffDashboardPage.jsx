import React, { useEffect, useState, useRef } from 'react';

const API = 'http://localhost:8000/api/super-admin';

export default function StaffDashboardPage({ user, onLogout }) {
  const isDoctor = user?.role === 'doctor' || user?.role === 'Doctor';
  const roleName = isDoctor ? 'Doctor' : 'Receptionist';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [hospitalName, setHospitalName] = useState(user?.hospital_name || user?.hospital || '');
  const [hospitalId, setHospitalId] = useState(user?.hospital_id || user?.unicare_hospital_id || null);
  const [doctorHospitals, setDoctorHospitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState(null);

  // Search & Live Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // Selected Patient Details & Modals
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [showReceptionistOverlay, setShowReceptionistOverlay] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Receptionist Booking Flow inside Overlay
  const [bookingDepartments, setBookingDepartments] = useState([]);
  const [bookingDoctors, setBookingDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Doctor Visit Entry
  const [visitForm, setVisitForm] = useState({ diagnosis: '', medical_notes: '', appointment_id: '' });
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  // Patient Registration Form
  const [patientForm, setPatientForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'A+',
    address: '',
    emergency_contact: ''
  });
  const [registerResult, setRegisterResult] = useState(null);

const RECOVERY_QUESTIONS = [
  "What is the name of your best friend?",
  "What was the official name of the high school or secondary school you attended?",
  "What is the name of your first pet?",
  "What is your mother's name?",
  "What was the make and model of your first car?",
  "What city were you born in?",
];

  const [profileTab, setProfileTab] = useState('security');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', experience: '' });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    recovery_question: RECOVERY_QUESTIONS[0],
    recovery_answer: ''
  });
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Time Slots
  const availableTimeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // Load Profile, Appointments & Doctor Hospitals
  const loadData = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`${API}/profile/`, { credentials: 'include' }),
        fetch(`${API}/appointments/`, { credentials: 'include' })
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData.profile);
        if (pData.profile?.hospital_name) setHospitalName(pData.profile.hospital_name);
        if (pData.profile?.hospital_id) setHospitalId(pData.profile.hospital_id);
        setProfileForm({
          name: pData.profile?.name || '',
          phone: pData.profile?.phone || '',
          experience: pData.profile?.experience || ''
        });
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAppointments(aData.appointments || []);
      }

      if (isDoctor) {
        const dhRes = await fetch(`${API}/doctor/hospitals/`, { credentials: 'include' });
        if (dhRes.ok) {
          const dhData = await dhRes.json();
          setDoctorHospitals(dhData.hospitals || []);
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close live suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Suggestions API Trigger
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const endpoint = isDoctor
          ? `${API}/doctor/patient-suggestions/?query=${encodeURIComponent(searchQuery.trim())}`
          : `${API}/receptionist/patient-suggestions/?query=${encodeURIComponent(searchQuery.trim())}`;
        const res = await fetch(endpoint, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.patients || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Suggestions error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isDoctor]);

  // Handle Switch Hospital for Doctor
  const handleSwitchHospital = async (targetHid) => {
    try {
      const res = await fetch(`${API}/doctor/hospitals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hospital_id: targetHid })
      });
      if (res.ok) {
        const data = await res.json();
        setHospitalId(data.hospital_id);
        const match = doctorHospitals.find(h => h.hospital_id === data.hospital_id);
        if (match) setHospitalName(match.hospital_name);
        setSelectedPatient(null);
        setPatientHistory([]);
        loadData();
        setMessage({ text: 'Hospital context switched successfully.', type: 'success' });
      }
    } catch (err) {
      console.error("Error switching hospital:", err);
    }
  };

  // Select a patient from Live Suggestions or Table
  const handleSelectPatient = async (p) => {
    setShowSuggestions(false);
    setSelectedPatient(p);

    if (isDoctor) {
      // Fetch authorized medical history
      try {
        const res = await fetch(`${API}/patient-history/?patient_id=${p.patient_id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSelectedPatient(data.patient);
          setPatientHistory(data.visits || []);
        } else {
          setPatientHistory([]);
        }
      } catch (err) {
        console.error("Error fetching patient history:", err);
      }
    } else {
      // Receptionist: Open Detailed Overlay & Load Booking Options
      loadBookingOptions();
      setShowReceptionistOverlay(true);
    }
  };

  // Load Booking Options for Receptionist
  const loadBookingOptions = async () => {
    const activeHid = hospitalId || user?.hospital_id;
    if (!activeHid) return;
    try {
      const res = await fetch(`${API}/appointments/options/?hospital_id=${activeHid}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBookingDepartments(data.departments || []);
        setBookingDoctors(data.doctors || []);
        if (data.departments?.length) setSelectedDeptId(data.departments[0].department_id);
      }
    } catch (err) {
      console.error("Error loading booking options:", err);
    }
  };

  // Filter Doctors by Selected Department
  const filteredBookingDoctors = bookingDoctors.filter(
    doc => !selectedDeptId || String(doc.department_id) === String(selectedDeptId)
  );

  // Submit Appointment Booking from Receptionist Overlay
  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDocId || !bookingDate || !bookingTime) {
      setMessage({ text: 'Please fill in Doctor, Date, and Time.', type: 'danger' });
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await fetch(`${API}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          doctor_id: selectedDocId,
          department_id: selectedDeptId,
          hospital_id: hospitalId || user?.hospital_id,
          appointment_date: bookingDate,
          appointment_time: bookingTime,
          reason: bookingReason
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Appointment booked successfully for ${selectedPatient.name}!`, type: 'success' });
        setShowReceptionistOverlay(false);
        setBookingReason('');
        loadData();
      } else {
        setMessage({ text: data.message || 'Could not book appointment.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Error booking appointment', type: 'danger' });
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Register Patient (Receptionist)
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setMessage(null);
    setRegisterResult(null);

    const validatePhone = (value) => {
      if (!value || !value.trim()) return true; // optional field
      const digits = value.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
      return /^[6-9]\d{9}$/.test(digits);
    };

    if (!validatePhone(patientForm.phone)) {
      setMessage({ text: 'Enter a valid 10-digit phone number.', type: 'danger' });
      return;
    }
    if (!validatePhone(patientForm.emergency_contact)) {
      setMessage({ text: 'Enter a valid 10-digit emergency contact number.', type: 'danger' });
      return;
    }

    try {
      const res = await fetch(`${API}/patients/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patientForm)
      });
      const data = await res.json();
      if (res.ok) {
        const p = data.patient;
        setRegisterResult(p);
        setMessage({
          text: data.existing ? 'Existing patient record found and linked!' : 'New patient registered successfully!',
          type: 'success'
        });
        setPatientForm({
          name: '', email: '', phone: '', password: '', date_of_birth: '',
          gender: 'Male', blood_group: 'A+', address: '', emergency_contact: ''
        });
        if (p) handleSelectPatient(p);
      } else {
        setMessage({ text: data.message || 'Failed to register patient.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Network error registering patient.', type: 'danger' });
    }
  };

  // Save Visit Record (Doctor)
  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !visitForm.appointment_id) {
      setMessage({ text: 'Please select an appointment.', type: 'danger' });
      return;
    }
    setVisitSubmitting(true);
    try {
      const res = await fetch(`${API}/visits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...visitForm,
          patient_id: selectedPatient.patient_id
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Patient visit record saved successfully!', type: 'success' });
        setVisitForm({ diagnosis: '', medical_notes: '', appointment_id: '' });
        handleSelectPatient(selectedPatient);
        loadData();
      } else {
        setMessage({ text: data.message || 'Failed to save visit record.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Error saving visit record.', type: 'danger' });
    } finally {
      setVisitSubmitting(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const validatePhone = (value) => {
      if (!value || !value.trim()) return true; // optional field
      const digits = value.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
      return /^[6-9]\d{9}$/.test(digits);
    };
    if (!validatePhone(profileForm.phone)) {
      setMessage({ text: 'Enter a valid 10-digit phone number.', type: 'danger' });
      return;
    }
    try {
      const res = await fetch(`${API}/profile/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        loadData();
      } else {
        setMessage({ text: data.message || 'Failed to update profile.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Error updating profile.', type: 'danger' });
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'danger' });
      return;
    }
    if (!passwordForm.recovery_question || !passwordForm.recovery_answer.trim()) {
      setPasswordMsg({ text: 'Please select a security recovery question and enter your answer.', type: 'danger' });
      return;
    }
    try {
      const res = await fetch(`${API}/profile/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
          recovery_question: passwordForm.recovery_question,
          recovery_answer: passwordForm.recovery_answer
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ text: 'Password and security recovery details updated successfully!', type: 'success' });
        setPasswordForm(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: '',
          recovery_answer: ''
        }));
        if (profile) {
          setProfile({ ...profile, must_change_password: false, has_recovery_question: true });
        }
        loadData();
      } else {
        setPasswordMsg({ text: data.message || 'Could not change password.', type: 'danger' });
      }
    } catch (err) {
      setPasswordMsg({ text: 'Error updating password and recovery question.', type: 'danger' });
    }
  };

  // Stats Calculations
  const totalApps = appointments.length;
  const pendingApps = appointments.filter(a => a.status === 'Pending').length;
  const confirmedApps = appointments.filter(a => a.status === 'Confirmed').length;
  const completedApps = appointments.filter(a => a.status === 'Completed').length;
  const displayName = profile?.name || user?.name || 'User';
  const displayHospital = hospitalName || user?.hospital_name || 'Hospital Network';

  return (
    <div className="d-flex min-vh-100 bg-light" style={{ fontFamily: 'var(--font-body)' }}>
      {/* FIXED LEFT SIDEBAR (LIGHT THEME) */}
      <aside className="bg-white border-end d-flex flex-column flex-shrink-0 p-3 shadow-sm" style={{ width: '260px' }}>
        <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3 border-bottom">
          <div className="rounded-3 p-2 text-white d-flex align-items-center justify-content-center shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}>
            <i className="bi bi-person-badge-fill fs-5"></i>
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-slate-800" style={{ fontSize: '1rem', letterSpacing: '0.3px', color: '#0f172a' }}>UniCare Desk</h6>
            <small className="text-teal fw-semibold extra-small" style={{ fontSize: '0.75rem', color: '#0d9488' }}>Receptionist Portal</small>
          </div>
        </div>

        <div className="p-2.5 rounded-3 mb-3 border" style={{ backgroundColor: '#f8fafc' }}>
          <div className="fw-bold text-dark small truncate">{displayName}</div>
          <div className="text-teal extra-small font-monospace fw-semibold" style={{ color: '#0d9488', fontSize: '0.75rem' }}>
            🏥 {displayHospital}
          </div>
        </div>

        <nav className="nav nav-pills flex-column mb-auto gap-1">
          {[
            { id: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
            { id: 'registration', icon: 'bi-person-plus', label: 'Patient Registration' },
            { id: 'appointments', icon: 'bi-calendar-event', label: 'Appointments', count: appointments.length },
            { id: 'queue', icon: 'bi-clock-history', label: 'Hospital Queue', count: pendingApps },
            { id: 'patients', icon: 'bi-people', label: 'Patients Roster' },
            { id: 'reports', icon: 'bi-file-earmark-medical', label: 'Reports' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 rounded-3 border-0 fw-semibold ${
                activeTab === item.id ? 'text-white' : 'text-slate-700'
              }`}
              style={{
                backgroundColor: activeTab === item.id ? '#0d9488' : 'transparent',
                color: activeTab === item.id ? '#ffffff' : '#334155'
              }}
            >
              <i className={`bi ${item.icon}`}></i> {item.label}
              {item.count > 0 && (
                <span className={`badge rounded-pill ms-auto extra-small ${activeTab === item.id ? 'bg-white text-teal' : 'bg-teal-subtle text-teal'}`} style={{ backgroundColor: activeTab === item.id ? '#ffffff' : '#e6f4f1', color: '#0d9488' }}>
                  {item.count}
                </span>
              )}
            </button>
          ))}

          <hr className="my-2 text-muted opacity-25" />

          <button
            onClick={() => { setActiveTab('profile'); setShowProfileModal(true); setProfileTab('info'); }}
            className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 rounded-3 border-0 fw-semibold ${
              activeTab === 'profile' ? 'text-white' : 'text-slate-700'
            }`}
            style={{
              backgroundColor: activeTab === 'profile' ? '#0d9488' : 'transparent',
              color: activeTab === 'profile' ? '#ffffff' : '#334155'
            }}
          >
            <i className="bi bi-person"></i> My Profile
          </button>

          <button
            onClick={() => { setActiveTab('password'); setShowProfileModal(true); setProfileTab('security'); }}
            className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 rounded-3 border-0 fw-semibold ${
              activeTab === 'password' ? 'text-white' : 'text-slate-700'
            }`}
            style={{
              backgroundColor: activeTab === 'password' ? '#0d9488' : 'transparent',
              color: activeTab === 'password' ? '#ffffff' : '#334155'
            }}
          >
            <i className="bi bi-shield-lock"></i> Change Password
          </button>
        </nav>

        <div className="pt-2 border-top mt-2">
          <button
            onClick={onLogout}
            className="btn btn-outline-danger btn-sm w-100 rounded-3 d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
          >
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow-1 overflow-auto d-flex flex-column">
        <header className="bg-white border-bottom shadow-sm py-2.5 px-4 sticky-top d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-teal-subtle text-teal px-3 py-1.5 rounded-pill fw-bold" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
              🏥 {displayHospital}
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="fw-bold text-dark small">{displayName}</div>
              <small className="text-muted extra-small">Receptionist & Desk Admin</small>
            </div>
          </div>
        </header>

      {/* DASHBOARD BODY */}
      <div className="container-fluid max-w-7xl py-4 flex-grow-1">
        {/* Banner Alert Messages */}
        {message && (
          <div className={`alert alert-${message.type} alert-dismissible fade show border-0 shadow-sm rounded-3 mb-4`} role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill fs-5' : 'bi-exclamation-triangle-fill fs-5'}`}></i>
              <div>{message.text}</div>
            </div>
            <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {/* Temporary Password & Security Recovery Warning Banner */}
        {(profile?.must_change_password || user?.must_change_password || !profile?.has_recovery_question) && (
          <div className="alert alert-warning border-warning shadow-sm mb-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 gap-3">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-shield-exclamation fs-2 text-warning"></i>
              <div>
                <strong className="text-dark">Action Required: Temporary Password Detected</strong>
                <div className="small text-secondary">
                  Your account password was temporarily set by your administrator. Please update your password and set a security recovery question to secure your account.
                </div>
              </div>
            </div>
            <button
              className="btn btn-warning btn-sm fw-bold px-3 text-nowrap rounded-pill shadow-sm"
              onClick={() => setShowProfileModal(true)}
            >
              <i className="bi bi-key me-1"></i> Change Password & Recovery
            </button>
          </div>
        )}

        {/* Dashboard Header Bar */}
        <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <span className="badge bg-teal-subtle text-teal px-3 py-1 rounded-pill fw-medium small mb-2 d-inline-block" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                <i className="bi bi-geo-alt me-1"></i> {displayHospital}
              </span>
              <h3 className="fw-bold text-dark mb-1">
                {isDoctor ? `Dr. ${displayName}` : displayName}'s Workspace
              </h3>
              <p className="text-muted small mb-0">
                Logged in as <strong className="text-dark">{roleName}</strong> at <strong>{displayHospital}</strong>
              </p>
            </div>

            {/* Quick Stat Cards */}
            <div className="d-flex flex-wrap gap-2">
              <div className="bg-light border rounded-3 p-2 px-3 text-center" style={{ minWidth: '90px' }}>
                <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Total</span>
                <span className="fw-bold text-dark fs-5">{totalApps}</span>
              </div>
              <div className="bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '90px' }}>
                <span className="text-warning-emphasis small d-block" style={{ fontSize: '0.72rem' }}>Pending</span>
                <span className="fw-bold text-warning-emphasis fs-5">{pendingApps}</span>
              </div>
              <div className="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '90px' }}>
                <span className="text-primary small d-block" style={{ fontSize: '0.72rem' }}>Confirmed</span>
                <span className="fw-bold text-primary fs-5">{confirmedApps}</span>
              </div>
              <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '90px' }}>
                <span className="text-success small d-block" style={{ fontSize: '0.72rem' }}>Completed</span>
                <span className="fw-bold text-success fs-5">{completedApps}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH BAR WITH LIVE SUGGESTIONS */}
        <div className="card border-0 shadow-sm rounded-4 mb-4 p-4" ref={searchContainerRef}>
          <h5 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
            <i className="bi bi-search text-teal"></i>
            <span>{isDoctor ? 'Doctor Patient Search' : 'Receptionist Global Patient Search'}</span>
          </h5>
          <p className="text-muted small mb-3">
            {isDoctor
              ? 'Search by Patient Name or Health ID (PTA001). Live suggestions show ONLY patients having appointments with you at this hospital.'
              : 'Search by Patient Name, Health ID (PTA001), or Phone. Live suggestions show ALL registered UniCare patients.'}
          </p>

          <div className="position-relative">
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-light border-end-0">
                {isSearching ? (
                  <span className="spinner-border spinner-border-sm text-teal" role="status"></span>
                ) : (
                  <i className="bi bi-person-search text-muted"></i>
                )}
              </span>
              <input
                type="text"
                className="form-control border-start-0 fs-6"
                placeholder={isDoctor ? 'Type patient name or Health ID e.g. PTA001...' : 'Type patient name, Health ID e.g. PTA001, or phone number...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
              />
            </div>

            {/* LIVE SUGGESTIONS DROPDOWN */}
            {showSuggestions && (
              <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 z-3 overflow-hidden">
                <div className="p-2 bg-light border-bottom text-muted small fw-bold d-flex justify-content-between">
                  <span>LIVE MATCHING PATIENTS</span>
                  <span>{suggestions.length} Found</span>
                </div>
                <div className="list-group list-group-flush max-h-60 overflow-auto" style={{ maxHeight: '300px' }}>
                  {suggestions.map((p) => (
                    <button
                      key={p.patient_id}
                      type="button"
                      className="list-group-item list-group-item-action p-3 d-flex justify-content-between align-items-center"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <div>
                        <div className="fw-bold text-dark d-flex align-items-center gap-2">
                          <span>{p.name}</span>
                          <span className="badge bg-teal-subtle text-teal font-monospace px-2 py-0.5" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                            {p.patient_uid || p.health_id}
                          </span>
                        </div>
                        <small className="text-muted">
                          <i className="bi bi-telephone me-1"></i>{p.phone || 'No phone'} &bull; DOB: {p.date_of_birth || 'N/A'} &bull; Gender: {p.gender || 'N/A'}
                        </small>
                      </div>
                      <span className="btn btn-sm btn-outline-teal rounded-pill px-3">
                        {isDoctor ? 'Open Record' : 'Confirm & Book'}
                      </span>
                    </button>
                  ))}
                  {!suggestions.length && (
                    <div className="p-4 text-center text-muted small">
                      No matching patients found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT ROW */}
        <div className="row g-4">
          {/* LEFT COLUMN: Receptionist Patient Registration / Doctor Patient History */}
          <div className="col-lg-5 col-xl-4">
            {!isDoctor ? (
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-teal text-white p-3 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: '#0d9488' }}>
                  <i className="bi bi-person-plus-fill fs-5"></i>
                  <h5 className="fw-bold mb-0 text-white">Patient Registration</h5>
                </div>
                <div className="card-body p-4">
                  <p className="text-muted small mb-3">
                    Register patient into UniCare. Global Health ID (PTA001) is automatically generated. Existing patients will link automatically.
                  </p>

                  <form onSubmit={handleRegisterPatient}>
                    <div className="mb-2.5">
                      <label className="form-label fw-semibold small text-secondary mb-1">Full Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-2"
                        required
                        value={patientForm.name}
                        onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      />
                    </div>
                    <div className="row g-2 mb-2.5">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Email</label>
                        <input
                          type="email"
                          className="form-control form-control-sm rounded-2"
                          value={patientForm.email}
                          onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Phone *</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm rounded-2"
                          required
                          pattern="[0-9+()\-\s]{10,15}"
                          title="Enter a valid 10-digit phone number"
                          maxLength="15"
                          value={patientForm.phone}
                          onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="row g-2 mb-2.5">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          className="form-control form-control-sm rounded-2"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={patientForm.date_of_birth}
                          onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Gender *</label>
                        <select
                          className="form-select form-select-sm rounded-2"
                          value={patientForm.gender}
                          onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="row g-2 mb-2.5">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Blood Group</label>
                        <select
                          className="form-select form-select-sm rounded-2"
                          value={patientForm.blood_group}
                          onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                        >
                          <option value="A+">A+</option><option value="A-">A-</option>
                          <option value="B+">B+</option><option value="B-">B-</option>
                          <option value="AB+">AB+</option><option value="AB-">AB-</option>
                          <option value="O+">O+</option><option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Emergency Contact</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm rounded-2"
                          value={patientForm.emergency_contact}
                          onChange={(e) => setPatientForm({ ...patientForm, emergency_contact: e.target.value })}
                          pattern="[0-9+()\-\s]{10,15}"
                          title="Enter a valid 10-digit phone number"
                          maxLength="15"
                        />
                      </div>
                    </div>
                    <div className="mb-2.5">
                      <label className="form-label fw-semibold small text-secondary mb-1">Address</label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm rounded-2"
                        value={patientForm.address}
                        onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary mb-1">Password *</label>
                      <input
                        type="password"
                        className="form-control form-control-sm rounded-2"
                        placeholder="Min 8 chars"
                        minLength="8"
                        required
                        value={patientForm.password}
                        onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn w-100 fw-bold py-2 rounded-3 text-white shadow-sm"
                      style={{ backgroundColor: '#0d9488' }}
                    >
                      <i className="bi bi-person-check-fill me-1"></i> Complete Patient Registration
                    </button>
                  </form>

                  {registerResult && (
                    <div className="mt-3 p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 text-center">
                      <small className="text-success fw-bold d-block mb-1">Assigned Global Health ID</small>
                      <span className="fs-4 fw-bold font-monospace text-dark bg-white px-3 py-1 rounded border shadow-sm d-inline-block">
                        {registerResult.patient_uid || registerResult.health_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Doctor View: Selected Patient & Medical History */
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-medical text-teal fs-5"></i>
                  <h5 className="fw-bold mb-0 text-dark">Patient Clinical History</h5>
                </div>
                <div className="card-body p-4">
                  {selectedPatient ? (
                    <div>
                      <div className="p-3 bg-light rounded-3 border mb-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h5 className="fw-bold text-dark mb-1">{selectedPatient.name}</h5>
                            <span className="badge bg-teal-subtle text-teal font-monospace" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                              {selectedPatient.patient_uid || selectedPatient.health_id}
                            </span>
                          </div>
                          <span className="badge bg-secondary">{selectedPatient.gender}</span>
                        </div>
                        <div className="small text-muted mt-2">
                          <i className="bi bi-telephone me-1"></i>{selectedPatient.phone || 'N/A'} &bull; DOB: {selectedPatient.date_of_birth || 'N/A'}
                        </div>
                      </div>

                      <h6 className="fw-bold text-dark mb-2">Past Medical Visits ({patientHistory.length})</h6>
                      <div className="overflow-auto max-h-60" style={{ maxHeight: '250px' }}>
                        {patientHistory.map((v) => (
                          <div key={v.visit_id} className="p-3 border rounded-3 mb-2 bg-white">
                            <div className="d-flex justify-content-between small text-muted mb-1">
                              <span><i className="bi bi-person-badge me-1"></i>Dr. {v.doctor_name}</span>
                              <span>{v.visited_at}</span>
                            </div>
                            <div className="fw-semibold text-primary mb-1">Diagnosis: {v.diagnosis}</div>
                            <small className="text-secondary d-block">{v.medical_notes}</small>
                          </div>
                        ))}
                        {!patientHistory.length && (
                          <div className="text-center text-muted small py-3">
                            No prior clinical visit records found.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-muted small">
                      Select a patient from search suggestions or appointment list to view clinical history.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Appointments & Action Panels */}
          <div className="col-lg-7 col-xl-8">
            {/* Doctor View: Record Patient Visit Form */}
            {isDoctor && selectedPatient && (
              <div className="card border-0 shadow-sm rounded-4 mb-4 border-top border-teal border-4">
                <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                  <i className="bi bi-journal-medical text-teal fs-5"></i>
                  <h5 className="fw-bold mb-0 text-dark">Record Clinical Visit for {selectedPatient.name}</h5>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleSaveVisit}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Linked Appointment *</label>
                      <select
                        className="form-select"
                        required
                        value={visitForm.appointment_id}
                        onChange={(e) => setVisitForm({ ...visitForm, appointment_id: e.target.value })}
                      >
                        <option value="">-- Select Scheduled Appointment --</option>
                        {appointments
                          .filter(a => (a.health_id === selectedPatient.health_id || a.health_id === selectedPatient.patient_uid) && a.status !== 'Completed')
                          .map(a => (
                            <option key={a.appointment_id} value={a.appointment_id}>
                              {a.date} at {a.time} — {a.reason || 'Consultation'}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Diagnosis *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Hypertension Grade 1"
                        required
                        value={visitForm.diagnosis}
                        onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Medical Notes & Clinical Observations</label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Clinical observations, medication details, recommendations..."
                        value={visitForm.medical_notes}
                        onChange={(e) => setVisitForm({ ...visitForm, medical_notes: e.target.value })}
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="btn fw-bold px-4 text-white rounded-3 shadow-sm"
                      style={{ backgroundColor: '#0d9488' }}
                      disabled={visitSubmitting}
                    >
                      {visitSubmitting ? 'Saving...' : 'Complete & Save Visit Record'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Appointments Table */}
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-calendar3 text-teal fs-5"></i>
                  <h5 className="fw-bold mb-0 text-dark">
                    {isDoctor ? 'My Scheduled Appointments' : `${displayHospital} Appointments`}
                  </h5>
                </div>
                <span className="badge bg-secondary rounded-pill">{appointments.length} Records</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Date & Time</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={a.appointment_id}>
                          <td className="ps-4 fw-semibold text-dark">
                            <div>{a.date}</div>
                            <small className="text-muted">{a.time}</small>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{a.patient}</div>
                            <small className="text-muted font-monospace">{a.health_id}</small>
                          </td>
                          <td>{a.doctor}</td>
                          <td>
                            <span
                              className={`badge rounded-pill px-3 py-1.5 ${
                                a.status === 'Completed'
                                  ? 'bg-success'
                                  : a.status === 'Confirmed'
                                  ? 'bg-primary'
                                  : 'bg-warning text-dark'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td className="text-end pe-4">
                            <button
                              className="btn btn-sm btn-outline-teal rounded-pill"
                              onClick={() => handleSelectPatient({ patient_id: a.patient_id, health_id: a.health_id, name: a.patient })}
                            >
                              {isDoctor ? 'Record Visit' : 'View Details'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!appointments.length && (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-4">
                            No appointments scheduled for {displayHospital}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECEPTIONIST APPOINTMENT CONFIRMATION OVERLAY MODAL */}
      {showReceptionistOverlay && selectedPatient && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-warning text-dark rounded-top-4 p-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check fs-4"></i>
                  <h5 className="modal-title fw-bold">Receptionist Patient Confirmation & Appointment Overlay</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReceptionistOverlay(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Complete Registration Details (ONLY for Receptionist) */}
                <div className="p-3 bg-light rounded-3 border mb-4">
                  <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
                    <div>
                      <h4 className="fw-bold text-dark mb-1">{selectedPatient.name}</h4>
                      <span className="badge bg-warning text-dark fs-6 font-monospace">
                        Global Health ID: {selectedPatient.patient_uid || selectedPatient.health_id}
                      </span>
                    </div>
                    <span className="badge bg-secondary fs-6">{selectedPatient.gender || 'Patient'}</span>
                  </div>

                  <div className="row g-3 text-start small">
                    <div className="col-md-4">
                      <span className="text-muted d-block">Phone Number</span>
                      <strong className="text-dark">{selectedPatient.phone || 'N/A'}</strong>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted d-block">Email Address</span>
                      <strong className="text-dark">{selectedPatient.email || 'N/A'}</strong>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted d-block">Date of Birth</span>
                      <strong className="text-dark">{selectedPatient.date_of_birth || 'N/A'}</strong>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted d-block">Blood Group</span>
                      <strong className="text-dark">{selectedPatient.blood_group || 'N/A'}</strong>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted d-block">Emergency Contact</span>
                      <strong className="text-dark">{selectedPatient.emergency_contact || 'N/A'}</strong>
                    </div>
                    <div className="col-md-4">
                      <span className="text-muted d-block">Residential Address</span>
                      <strong className="text-dark">{selectedPatient.address || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* Appointment Booking Form Flow */}
                <h5 className="fw-bold text-dark mb-3">Confirm Appointment Booking Details</h5>

                <form onSubmit={handleConfirmBooking}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-muted">Step 1: Department *</label>
                      <select
                        className="form-select"
                        required
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                      >
                        <option value="">-- Select Department --</option>
                        {bookingDepartments.map(d => (
                          <option key={d.department_id} value={d.department_id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-muted">Step 2: Doctor *</label>
                      <select
                        className="form-select"
                        required
                        value={selectedDocId}
                        onChange={(e) => setSelectedDocId(e.target.value)}
                      >
                        <option value="">-- Select Doctor --</option>
                        {filteredBookingDoctors.map(d => (
                          <option key={d.doctor_id} value={d.doctor_id}>
                            Dr. {d.name} ({d.specialization})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-muted">Step 3: Appointment Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-muted">Step 4: Available Time Slot *</label>
                      <select
                        className="form-select"
                        required
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                      >
                        {availableTimeSlots.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-muted">Reason for Visit</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. General checkup / Consultation"
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                    />
                  </div>

                  <div className="modal-footer border-0 p-0 pt-3">
                    <button
                      type="button"
                      className="btn btn-secondary rounded-3 px-4"
                      onClick={() => setShowReceptionistOverlay(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-warning rounded-3 px-4 fw-bold text-dark"
                      disabled={bookingSubmitting}
                    >
                      {bookingSubmitting ? 'Booking...' : 'Confirm & Book Appointment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE & CHANGE PASSWORD MODAL */}
      {showProfileModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-teal text-white rounded-top-4 p-3 px-4" style={{ backgroundColor: '#0d9488' }}>
                <div className="d-flex align-items-center gap-3">
                  <h5 className="modal-title fw-bold mb-0 fs-5">
                    <i className="bi bi-person-lines-fill me-2"></i>My Staff Profile
                  </h5>
                  <div className="btn-group btn-group-sm bg-white bg-opacity-25 p-0.5 rounded-pill">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 fw-bold ${profileTab === 'security' ? 'btn-white text-teal shadow-sm bg-white' : 'text-white border-0'}`}
                      onClick={() => setProfileTab('security')}
                    >
                      <i className="bi bi-shield-lock me-1"></i> Password & Recovery
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 fw-bold ${profileTab === 'info' ? 'btn-white text-teal shadow-sm bg-white' : 'text-white border-0'}`}
                      onClick={() => setProfileTab('info')}
                    >
                      <i className="bi bi-person-circle me-1"></i> Personal Info
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowProfileModal(false)}
                ></button>
              </div>

              <div className="modal-body p-3 px-4">
                {passwordMsg && (
                  <div className={`alert alert-${passwordMsg.type} py-1.5 px-3 small mb-3`}>
                    {passwordMsg.text}
                  </div>
                )}

                {profileTab === 'info' ? (
                  /* Profile Information Form */
                  <form onSubmit={handleSaveProfile}>
                    <h6 className="fw-bold text-dark mb-2">Update Personal Information</h6>
                    <div className="row g-2 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-muted mb-1">Full Name</label>
                        <input
                          className="form-control form-control-sm"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold text-muted mb-1">Phone Number</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          pattern="[0-9+()\-\s]{10,15}"
                          title="Enter a valid 10-digit phone number"
                          maxLength="15"
                        />
                      </div>
                      {isDoctor && (
                        <div className="col-12">
                          <label className="form-label small fw-semibold text-muted mb-1">Clinical Experience</label>
                          <input
                            className="form-control form-control-sm"
                            placeholder="e.g. 5 Years"
                            value={profileForm.experience}
                            onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <button className="btn btn-outline-teal btn-sm fw-bold w-100 rounded-3">
                      Save Profile Changes
                    </button>
                  </form>
                ) : (
                  /* Change Password & Recovery Form */
                  <form onSubmit={handleChangePassword}>
                    <h6 className="fw-bold text-dark mb-2">Change Password & Security Recovery</h6>
                    <div className="row g-2 mb-2">
                      <div className="col-md-4">
                        <label className="form-label extra-small fw-semibold text-muted mb-1">Current Password *</label>
                        <input
                          type="password"
                          className="form-control form-control-sm"
                          required
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label extra-small fw-semibold text-muted mb-1">New Password (Min 8 chars) *</label>
                        <input
                          type="password"
                          className="form-control form-control-sm"
                          minLength="8"
                          required
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label extra-small fw-semibold text-muted mb-1">Confirm New Password *</label>
                        <input
                          type="password"
                          className="form-control form-control-sm"
                          minLength="8"
                          required
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="border-top pt-2 mt-2">
                      <h6 className="fw-bold text-dark mb-1 small">Account Recovery Setup</h6>
                      <p className="text-muted extra-small mb-2" style={{ fontSize: '0.78rem' }}>
                        Select a security question and answer for self-service password recovery.
                      </p>

                      <div className="row g-2 mb-2">
                        <div className="col-md-6">
                          <label className="form-label extra-small fw-semibold text-muted mb-1">Security Recovery Question *</label>
                          <select
                            className="form-select form-select-sm"
                            value={passwordForm.recovery_question}
                            onChange={(e) => setPasswordForm({ ...passwordForm, recovery_question: e.target.value })}
                            required
                          >
                            {RECOVERY_QUESTIONS.map((q, idx) => (
                              <option key={idx} value={q}>{q}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label extra-small fw-semibold text-muted mb-1">Security Recovery Answer *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Enter your secret answer"
                            required
                            value={passwordForm.recovery_answer}
                            onChange={(e) => setPasswordForm({ ...passwordForm, recovery_answer: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <button className="btn btn-teal text-white btn-sm fw-bold w-100 rounded-3 mt-2" style={{ backgroundColor: '#0d9488' }}>
                      Update Password & Security Settings
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
