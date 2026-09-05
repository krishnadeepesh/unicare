import React, { useEffect, useState, useRef } from 'react';

const API = 'http://localhost:8000/api/super-admin';

export default function StaffDashboardPage({ user, onLogout, onNavigateHome }) {
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [apptFilter, setApptFilter] = useState('all');
  const [apptDateFilter, setApptDateFilter] = useState('all');
  const [apptSearch, setApptSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  // Date Range (Today to 20 Days in Advance)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const maxBookingDate = new Date();
  maxBookingDate.setDate(maxBookingDate.getDate() + 20);
  const maxBookingDateStr = maxBookingDate.toISOString().split('T')[0];

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

  // Clear notification messages on page/tab navigation
  useEffect(() => {
    setMessage(null);
    setPasswordMsg(null);
  }, [activeTab]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
      const payload = {
        ...patientForm,
        password: patientForm.password || 'Patient@123'
      };
      const res = await fetch(`${API}/patients/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        const p = data.patient;
        setRegisterResult(p);
        setMessage({
          text: data.existing ? `Existing patient record found and linked (${p.patient_uid || p.health_id})!` : `New patient registered successfully! Assigned Health ID: ${p.patient_uid || p.health_id}`,
          type: 'success'
        });
        setPatientForm({
          name: '', email: '', phone: '', password: '', date_of_birth: '',
          gender: 'Male', blood_group: 'A+', address: '', emergency_contact: ''
        });
        loadData();
      } else {
        setMessage({ text: data.message || 'Failed to register patient.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Failed to connect to registration service. Please check your session.', type: 'danger' });
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
        setWarningDismissed(true);
        setPasswordForm(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: '',
          recovery_answer: ''
        }));
        if (profile) {
          setProfile({ ...profile, must_change_password: 0, has_recovery_question: true });
        }
        if (user) {
          user.must_change_password = 0;
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
            <small className="text-teal fw-bold extra-small" style={{ fontSize: '0.74rem', letterSpacing: '0.6px' }}>RECEPTION DESK</small>
          </div>
        </div>

        {/* Staff & Hospital Card */}
        <div className="sidebar-context-card">
          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{displayName}</div>
          <small className="text-muted d-block text-truncate mb-2" style={{ fontSize: '0.8rem' }}>Desk Admin & Registrar</small>
          <div className="badge bg-white text-teal border px-2.5 py-1.5 rounded-2 font-monospace w-100 text-truncate text-start" style={{ color: '#0d9488', fontSize: '0.75rem' }}>
            🏥 {displayHospital}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="d-flex flex-column mb-auto">
          <div className="sidebar-section-title">
            Front Desk Operations
          </div>

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
              className={`sidebar-nav-link ${activeTab === item.id ? 'active' : ''}`}
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
              🏥 {displayHospital}
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
                <div className="fw-bold text-dark small">{displayName}</div>
                <small className="text-muted extra-small">Desk Admin & Registrar</small>
              </div>
              <div className="rounded-circle bg-teal text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}>
                {displayName ? displayName.charAt(0).toUpperCase() : 'R'}
              </div>
              <i className={`bi bi-chevron-${showProfileMenu ? 'up' : 'down'} text-muted extra-small ms-1`}></i>
            </button>

            {showProfileMenu && (
              <div 
                className="dropdown-menu dropdown-menu-end show shadow-lg border-0 rounded-4 p-2 mt-2" 
                style={{ minWidth: '230px', zIndex: 1050, position: 'absolute', right: 0 }}
              >
                <div className="px-3 py-2 border-bottom mb-1 bg-light rounded-3">
                  <div className="fw-bold text-dark small">{displayName}</div>
                  <small className="text-muted extra-small d-block text-truncate">{user?.email || profile?.email || 'receptionist@unicare.com'}</small>
                  <span className="badge bg-teal-subtle text-teal mt-1 font-monospace extra-small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    REC001
                  </span>
                </div>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                  onClick={() => { setActiveTab('profile'); setShowProfileModal(true); setProfileTab('info'); setShowProfileMenu(false); }}
                >
                  <i className="bi bi-person text-teal fs-6"></i>
                  <span>Staff Profile</span>
                </button>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                  onClick={() => { setActiveTab('password'); setShowProfileModal(true); setProfileTab('security'); setShowProfileMenu(false); }}
                >
                  <i className="bi bi-shield-lock text-teal fs-6"></i>
                  <span>Security & Password</span>
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
        {!warningDismissed && (profile?.must_change_password || user?.must_change_password || (!profile?.has_recovery_question && profile !== null)) && (
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
              className="btn btn-teal text-white btn-sm fw-bold px-3 text-nowrap rounded-pill shadow-sm"
              style={{ backgroundColor: '#0d9488' }}
              onClick={() => { setShowProfileModal(true); setProfileTab('security'); }}
            >
              <i className="bi bi-key me-1"></i> Change Password & Recovery
            </button>
          </div>
        )}

        {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Dashboard Header Bar */}
            <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div>
                  <span className="badge bg-teal-subtle text-teal px-3 py-1 rounded-pill fw-medium small mb-2 d-inline-block" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    <i className="bi bi-geo-alt me-1"></i> {displayHospital}
                  </span>
                  <h3 className="fw-bold text-dark mb-1">
                    Front Desk Reception Overview
                  </h3>
                  <p className="text-muted small mb-0">
                    Welcome back, <strong className="text-dark">{displayName}</strong> &bull; Active Desk Registrar at <strong>{displayHospital}</strong>
                  </p>
                </div>

                {/* Quick Stat Cards (CLICKABLE) */}
                <div className="d-flex flex-wrap gap-2">
                  <div 
                    className="bg-light border rounded-3 p-2 px-3 text-center cursor-pointer hover-teal" 
                    style={{ minWidth: '95px', cursor: 'pointer' }}
                    onClick={() => setActiveTab('appointments')}
                    title="Click to view all appointments"
                  >
                    <span className="text-muted small d-block" style={{ fontSize: '0.72rem' }}>Total Visits</span>
                    <span className="fw-bold text-dark fs-5">{totalApps}</span>
                  </div>
                  <div 
                    className="bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 p-2 px-3 text-center cursor-pointer hover-teal" 
                    style={{ minWidth: '95px', cursor: 'pointer' }}
                    onClick={() => setActiveTab('queue')}
                    title="Click to view live queue"
                  >
                    <span className="text-warning-emphasis small d-block" style={{ fontSize: '0.72rem' }}>In Queue</span>
                    <span className="fw-bold text-warning-emphasis fs-5">{pendingApps}</span>
                  </div>
                  <div 
                    className="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 p-2 px-3 text-center cursor-pointer hover-teal" 
                    style={{ minWidth: '95px', cursor: 'pointer' }}
                    onClick={() => { setActiveTab('appointments'); setApptFilter('Confirmed'); }}
                    title="Click to view confirmed appointments"
                  >
                    <span className="text-primary small d-block" style={{ fontSize: '0.72rem' }}>Confirmed</span>
                    <span className="fw-bold text-primary fs-5">{confirmedApps}</span>
                  </div>
                  <div 
                    className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-2 px-3 text-center cursor-pointer hover-teal" 
                    style={{ minWidth: '95px', cursor: 'pointer' }}
                    onClick={() => { setActiveTab('appointments'); setApptFilter('Completed'); }}
                    title="Click to view completed visits"
                  >
                    <span className="text-success small d-block" style={{ fontSize: '0.72rem' }}>Completed</span>
                    <span className="fw-bold text-success fs-5">{completedApps}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Operations Launchpad Grid */}
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-grid-fill text-teal"></i>
              <span>Front Desk Operations</span>
            </h6>

            <div className="row g-3 mb-4">
              <div className="col-12 col-sm-6 col-lg-3">
                <button
                  className="btn btn-white w-100 p-3.5 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2 h-100 bg-white"
                  onClick={() => setActiveTab('registration')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', backgroundColor: '#0d9488' }}>
                    <i className="bi bi-person-plus-fill fs-5"></i>
                  </div>
                  <div>
                    <span className="fw-bold text-dark d-block">Register Patient</span>
                    <small className="text-muted">Issue Global Health ID (PTA001)</small>
                  </div>
                </button>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <button
                  className="btn btn-white w-100 p-3.5 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2 h-100 bg-white"
                  onClick={() => setActiveTab('appointments')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center bg-primary" style={{ width: '42px', height: '42px' }}>
                    <i className="bi bi-calendar2-check-fill fs-5"></i>
                  </div>
                  <div>
                    <span className="fw-bold text-dark d-block">Appointments</span>
                    <small className="text-muted">Book & manage scheduled visits</small>
                  </div>
                </button>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <button
                  className="btn btn-white w-100 p-3.5 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2 h-100 bg-white"
                  onClick={() => setActiveTab('queue')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center bg-warning text-dark" style={{ width: '42px', height: '42px' }}>
                    <i className="bi bi-clock-history fs-5"></i>
                  </div>
                  <div>
                    <span className="fw-bold text-dark d-block">Hospital Queue</span>
                    <small className="text-muted">Live patient waitlist & check-in</small>
                  </div>
                </button>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <button
                  className="btn btn-white w-100 p-3.5 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2 h-100 bg-white"
                  onClick={() => setActiveTab('patients')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center bg-teal text-white" style={{ width: '42px', height: '42px', backgroundColor: '#0284c7' }}>
                    <i className="bi bi-people-fill fs-5"></i>
                  </div>
                  <div>
                    <span className="fw-bold text-dark d-block">Patients Directory</span>
                    <small className="text-muted">Find registered patients & records</small>
                  </div>
                </button>
              </div>
            </div>

            {/* QUICK SEARCH BAR WITH LIVE SUGGESTIONS */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-4" ref={searchContainerRef}>
              <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                <i className="bi bi-search text-teal"></i>
                <span>Fast Patient Lookup & Instant Booking</span>
              </h6>
              <p className="text-muted small mb-3">
                Search by Patient Name, Health ID (e.g. PTA001), or Phone number for quick lookup or appointment booking.
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
                    placeholder="Type patient name, Health ID (e.g. PTA001), or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                  />
                </div>

                {/* LIVE SUGGESTIONS DROPDOWN */}
                {showSuggestions && (
                  <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 z-3 overflow-hidden">
                    <div className="p-2 bg-light border-bottom text-muted small fw-bold d-flex justify-content-between">
                      <span>MATCHING REGISTERED PATIENTS</span>
                      <span>{suggestions.length} Found</span>
                    </div>
                    <div className="list-group list-group-flush max-h-60 overflow-auto" style={{ maxHeight: '280px' }}>
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
                            Confirm & Book
                          </span>
                        </button>
                      ))}
                      {!suggestions.length && (
                        <div className="p-4 text-center text-muted small">
                          No matching patients found. Click <strong className="text-teal cursor-pointer" onClick={() => setActiveTab('registration')}>Register Patient</strong> to add them.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TODAY'S RECENT APPOINTMENTS FEED */}
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-3.5 border-bottom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-check text-teal fs-5"></i>
                  <h6 className="fw-bold mb-0 text-dark">Recent Front Desk Activity & Today's Schedule</h6>
                </div>
                <button
                  className="btn btn-sm btn-outline-teal rounded-pill px-3"
                  onClick={() => setActiveTab('appointments')}
                >
                  View All Appointments <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Appt UID</th>
                        <th>Date & Time</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 5).map((a) => (
                        <tr key={a.appointment_id}>
                          <td className="ps-4 font-monospace fw-bold text-teal" style={{ color: '#0d9488' }}>
                            {a.appointment_uid || a.apt_uid || `APT${String(a.appointment_id).padStart(3, '0')}`}
                          </td>
                          <td className="fw-semibold text-dark">
                            <div>{a.date}</div>
                            <small className="text-muted">{a.time}</small>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{a.patient}</div>
                            <small className="text-muted font-monospace">{a.patient_uid || a.health_id || `PTA${String(a.patient_id).padStart(3, '0')}`}</small>
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
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!appointments.length && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            No appointments found for this facility.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. DEDICATED PATIENT REGISTRATION TAB */}
        {activeTab === 'registration' && (
          <div className="row justify-content-center">
            <div className="col-xl-9 col-lg-10">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-teal text-white p-3.5 border-0 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0d9488' }}>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-person-plus-fill fs-5"></i>
                    <h5 className="fw-bold mb-0 text-white">Patient Registration Form</h5>
                  </div>
                  <span className="badge bg-white text-teal font-monospace px-3 py-1 rounded-pill" style={{ color: '#0d9488' }}>
                    Auto Global UID (PTA001)
                  </span>
                </div>
                <div className="card-body p-4 p-md-5">
                  <p className="text-muted small mb-4">
                    Register a patient into UniCare. A permanent <strong>Global Patient Health ID (PTA001)</strong> will be automatically generated. If the patient already exists by Phone or Email, their global record will be seamlessly linked.
                  </p>

                  <form onSubmit={handleRegisterPatient}>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Full Legal Name *</label>
                        <input
                          type="text"
                          className="form-control rounded-3 py-2"
                          placeholder="e.g. Jane Doe"
                          required
                          value={patientForm.name}
                          onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          className="form-control rounded-3 py-2"
                          placeholder="10-digit mobile number"
                          required
                          pattern="[0-9+()\-\s]{10,15}"
                          title="Enter a valid 10-digit phone number"
                          maxLength="15"
                          value={patientForm.phone}
                          onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small text-secondary mb-1">Email Address</label>
                        <input
                          type="email"
                          className="form-control rounded-3 py-2"
                          placeholder="e.g. patient@example.com"
                          value={patientForm.email}
                          onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small text-secondary mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          className="form-control rounded-3 py-2"
                          required
                          max={todayStr}
                          value={patientForm.date_of_birth}
                          onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold small text-secondary mb-1">Gender *</label>
                        <select
                          className="form-select rounded-3 py-2"
                          value={patientForm.gender}
                          onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Blood Group</label>
                        <select
                          className="form-select rounded-3 py-2"
                          value={patientForm.blood_group}
                          onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                        >
                          <option value="A+">A+</option><option value="A-">A-</option>
                          <option value="B+">B+</option><option value="B-">B-</option>
                          <option value="AB+">AB+</option><option value="AB-">AB-</option>
                          <option value="O+">O+</option><option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-secondary mb-1">Emergency Contact Number</label>
                        <input
                          type="tel"
                          className="form-control rounded-3 py-2"
                          placeholder="10-digit emergency phone"
                          value={patientForm.emergency_contact}
                          onChange={(e) => setPatientForm({ ...patientForm, emergency_contact: e.target.value })}
                          pattern="[0-9+()\-\s]{10,15}"
                          title="Enter a valid 10-digit phone number"
                          maxLength="15"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary mb-1">Residential Address</label>
                      <textarea
                        rows="2"
                        className="form-control rounded-3"
                        placeholder="Street, City, Postal Code"
                        value={patientForm.address}
                        onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold small text-secondary mb-1">Patient Portal Temporary Password (Optional)</label>
                      <input
                        type="password"
                        className="form-control rounded-3 py-2"
                        placeholder="Leave blank to auto-assign default (Patient@123)"
                        value={patientForm.password}
                        onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                      />
                      <small className="text-muted">Defaults to <code>Patient@123</code> if left empty. Patient will be prompted to change it upon first login.</small>
                    </div>

                    <div className="d-flex gap-3">
                      <button
                        type="submit"
                        className="btn fw-bold px-4 py-2.5 rounded-3 text-white shadow-sm flex-grow-1"
                        style={{ backgroundColor: '#0d9488' }}
                      >
                        <i className="bi bi-person-check-fill me-2"></i> Register Patient & Generate Health ID
                      </button>
                      <button
                        type="button"
                        className="btn btn-light border px-4 py-2.5 rounded-3"
                        onClick={() => setActiveTab('dashboard')}
                      >
                        Back to Overview
                      </button>
                    </div>
                  </form>

                  {registerResult && (
                    <div className="mt-4 p-4 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-4 text-center">
                      <i className="bi bi-check-circle-fill text-success fs-2 mb-2 d-block"></i>
                      <h5 className="fw-bold text-dark mb-1">Patient Registered & Linked!</h5>
                      <div className="mb-3">
                        <span className="fs-3 fw-bold font-monospace text-teal bg-white px-4 py-1.5 rounded-3 border shadow-sm d-inline-block" style={{ color: '#0d9488' }}>
                          {registerResult.patient_uid || registerResult.health_id}
                        </span>
                      </div>
                      <p className="text-muted small mb-3">
                        Patient <strong>{registerResult.name}</strong> is now registered across the UniCare healthcare network.
                      </p>
                      <button
                        className="btn btn-teal text-white rounded-pill px-4 fw-bold shadow-sm"
                        style={{ backgroundColor: '#0d9488' }}
                        onClick={() => handleSelectPatient(registerResult)}
                      >
                        <i className="bi bi-calendar-plus me-1"></i> Book Appointment for this Patient
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. DEDICATED APPOINTMENTS TAB */}
        {activeTab === 'appointments' && (
          <div>
            <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div>
                  <h4 className="fw-bold text-dark mb-1">Appointments Management</h4>
                  <p className="text-muted small mb-0">
                    Schedule, confirm, and track patient consultations across departments at <strong>{displayHospital}</strong>
                  </p>
                </div>
                <button
                  className="btn btn-teal text-white rounded-pill px-4 fw-bold shadow-sm"
                  style={{ backgroundColor: '#0d9488' }}
                  onClick={() => {
                    loadBookingOptions();
                    if (distinctPatients?.length) setSelectedPatient(distinctPatients[0]);
                    setShowReceptionistOverlay(true);
                  }}
                >
                  <i className="bi bi-calendar-plus me-1"></i> Book New Appointment
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="row g-3 mt-2 pt-2 border-top">
                <div className="col-md-4">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Filter by Patient, Health ID, Doctor..."
                      value={apptSearch}
                      onChange={(e) => setApptSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="btn-group w-100" role="group">
                    {['all', 'Pending', 'Confirmed', 'Completed'].map(st => (
                      <button
                        key={st}
                        type="button"
                        className={`btn btn-sm ${apptFilter === st ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                        style={apptFilter === st ? { backgroundColor: '#0d9488' } : {}}
                        onClick={() => setApptFilter(st)}
                      >
                        {st === 'all' ? 'All Status' : st}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={apptDateFilter}
                    onChange={(e) => setApptDateFilter(e.target.value)}
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today's Visits ({todayStr})</option>
                    <option value="upcoming">Next 20 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Appt UID</th>
                        <th>Date & Time</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments
                        .filter(a => {
                          if (apptFilter !== 'all' && a.status !== apptFilter) return false;
                          if (apptDateFilter === 'today' && a.date !== todayStr) return false;
                          if (apptDateFilter === 'upcoming' && (a.date < todayStr || a.date > maxBookingDateStr)) return false;
                          if (apptSearch.trim()) {
                            const q = apptSearch.toLowerCase();
                            const match = (a.patient || '').toLowerCase().includes(q) ||
                                          (a.patient_uid || a.health_id || '').toLowerCase().includes(q) ||
                                          (a.doctor || '').toLowerCase().includes(q) ||
                                          (a.appointment_uid || a.apt_uid || '').toLowerCase().includes(q);
                            if (!match) return false;
                          }
                          return true;
                        })
                        .map((a) => (
                          <tr key={a.appointment_id}>
                            <td className="ps-4 font-monospace fw-bold text-teal" style={{ color: '#0d9488' }}>
                              {a.appointment_uid || a.apt_uid || `APT${String(a.appointment_id).padStart(3, '0')}`}
                            </td>
                            <td className="fw-semibold text-dark">
                              <div>{a.date}</div>
                              <small className="text-muted">{a.time}</small>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{a.patient}</div>
                              <small className="text-muted font-monospace">{a.patient_uid || a.health_id || `PTA${String(a.patient_id).padStart(3, '0')}`}</small>
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
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      {!appointments.length && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-5">
                            No appointments found matching your filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. DEDICATED QUEUE TAB */}
        {activeTab === 'queue' && (
          <div>
            <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="fw-bold text-dark mb-1">Front Desk Live Waitlist & Hospital Queue</h4>
                  <p className="text-muted small mb-0">
                    Real-time front desk queue management for patients awaiting consultation at <strong>{displayHospital}</strong>
                  </p>
                </div>
                <span className="badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill">
                  {appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length} Patients in Line
                </span>
              </div>
            </div>

            <div className="row g-4">
              {appointments
                .filter(a => a.status === 'Pending' || a.status === 'Confirmed')
                .map((a, idx) => (
                  <div key={a.appointment_id} className="col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-body p-4 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <span className="badge bg-light text-dark border font-monospace px-2.5 py-1">
                              TOKEN #{idx + 1}
                            </span>
                            <span className={`badge rounded-pill px-3 py-1 ${a.status === 'Confirmed' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                              {a.status}
                            </span>
                          </div>
                          <h5 className="fw-bold text-dark mb-1">{a.patient}</h5>
                          <span className="badge bg-teal-subtle text-teal font-monospace mb-2" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                            {a.patient_uid || a.health_id || `PTA${String(a.patient_id).padStart(3, '0')}`}
                          </span>
                          <div className="small text-muted mb-3">
                            <div><i className="bi bi-person-badge me-1"></i>Doctor: {a.doctor}</div>
                            <div><i className="bi bi-clock me-1"></i>Slot: {a.date} at {a.time}</div>
                          </div>
                        </div>
                        <button
                          className="btn btn-outline-teal btn-sm w-100 rounded-pill"
                          onClick={() => handleSelectPatient({ patient_id: a.patient_id, health_id: a.health_id, name: a.patient })}
                        >
                          Check In / Update
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {!appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed').length && (
                <div className="col-12">
                  <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted">
                    <i className="bi bi-check2-circle text-success fs-1 mb-2"></i>
                    <h5 className="fw-bold text-dark">Queue is Currently Clear</h5>
                    <p className="small mb-0">No patients are currently waiting in the queue.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. DEDICATED PATIENTS DIRECTORY TAB */}
        {activeTab === 'patients' && (
          <div>
            <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div>
                  <h4 className="fw-bold text-dark mb-1">Global Patients Directory</h4>
                  <p className="text-muted small mb-0">
                    Lookup patient records and book consultations across all participating hospitals.
                  </p>
                </div>
                <button
                  className="btn btn-teal text-white rounded-pill px-4 fw-bold shadow-sm"
                  style={{ backgroundColor: '#0d9488' }}
                  onClick={() => setActiveTab('registration')}
                >
                  <i className="bi bi-person-plus me-1"></i> Register New Patient
                </button>
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  className="form-control form-control-lg rounded-3 fs-6"
                  placeholder="Filter directory by patient name, Global Health ID (e.g. PTA001), phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="row g-3">
              {suggestions.length > 0 ? (
                suggestions.map((p) => (
                  <div key={p.patient_id} className="col-md-6 col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 p-3.5 h-100 d-flex flex-column justify-content-between bg-white">
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-bold text-dark mb-0">{p.name}</h6>
                          <span className="badge bg-teal-subtle text-teal font-monospace" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                            {p.patient_uid || p.health_id}
                          </span>
                        </div>
                        <div className="small text-muted mb-3">
                          <div><i className="bi bi-telephone me-1"></i>{p.phone || 'No phone'}</div>
                          <div><i className="bi bi-calendar me-1"></i>DOB: {p.date_of_birth || 'N/A'} &bull; Gender: {p.gender || 'N/A'}</div>
                          {p.blood_group && <div><i className="bi bi-droplet me-1"></i>Blood Group: {p.blood_group}</div>}
                        </div>
                      </div>
                      <button
                        className="btn btn-outline-teal btn-sm rounded-pill w-100"
                        onClick={() => handleSelectPatient(p)}
                      >
                        <i className="bi bi-calendar-plus me-1"></i> Book Consultation
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-12">
                  <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted">
                    <i className="bi bi-people fs-1 text-secondary mb-2"></i>
                    <h6 className="fw-bold text-dark">Use the Search Bar or Register a Patient</h6>
                    <p className="small mb-0">Type in the search box above to instantly find registered patients by Name, Phone, or Global Health ID.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. DEDICATED REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
              <h4 className="fw-bold text-dark mb-1">Front Desk Reports & Statistics</h4>
              <p className="text-muted small mb-0">
                Operational metrics and appointment statistics for <strong>{displayHospital}</strong>
              </p>
            </div>

            <div className="row g-4">
              <div className="col-md-3">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white">
                  <span className="text-muted small fw-bold">TOTAL APPOINTMENTS</span>
                  <span className="fs-2 fw-bold text-dark my-2">{totalApps}</span>
                  <small className="text-muted">Lifetime hospital consultations</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white">
                  <span className="text-warning-emphasis small fw-bold">WAITING IN QUEUE</span>
                  <span className="fs-2 fw-bold text-warning-emphasis my-2">{pendingApps}</span>
                  <small className="text-muted">Pending front desk check-in</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white">
                  <span className="text-primary small fw-bold">CONFIRMED VISITS</span>
                  <span className="fs-2 fw-bold text-primary my-2">{confirmedApps}</span>
                  <small className="text-muted">Ready for doctor consultation</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white">
                  <span className="text-success small fw-bold">COMPLETED VISITS</span>
                  <span className="fs-2 fw-bold text-success my-2">{completedApps}</span>
                  <small className="text-muted">Clinical records finalized</small>
                </div>
              </div>
            </div>
          </div>
        )}
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

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-muted">Step 3: Appointment Date *</label>
                      <input
                        type="date"
                        className="form-control py-2"
                        required
                        min={todayStr}
                        max={maxBookingDateStr}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small text-muted">Step 4: Available Time Slot *</label>
                      <select
                        className="form-select py-2"
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

                  <div className="modal-footer border-0 p-0 pt-3">
                    <button
                      type="button"
                      className="btn btn-secondary rounded-pill px-4"
                      onClick={() => setShowReceptionistOverlay(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-teal text-white rounded-pill px-4 fw-bold shadow-sm"
                      style={{ backgroundColor: '#0d9488' }}
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
