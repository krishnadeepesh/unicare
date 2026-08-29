import React, { useEffect, useState, useRef } from 'react';

const API = 'http://localhost:8000/api/super-admin';

const RECOVERY_QUESTIONS = [
  "What is the name of your best friend?",
  "What was the official name of the high school or secondary school you attended?",
  "What is the name of your first pet?",
  "What is your mother's name?",
  "What was the make and model of your first car?",
  "What city were you born in?",
];

export default function DoctorDashboardPage({ user, onLogout }) {
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | appointments | search | patients | consultations | records | prescriptions | reports | schedule | profile | password

  // Data State
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
  const searchRef = useRef(null);

  // Selected Patient & Medical History
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);

  // Doctor Visit Entry Form
  const [visitForm, setVisitForm] = useState({ diagnosis: '', medical_notes: '', appointment_id: '' });
  const [visitSubmitting, setVisitSubmitting] = useState(false);

  // Profile & Password Update Forms
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', experience: '' });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    recovery_question: RECOVERY_QUESTIONS[0],
    recovery_answer: ''
  });
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Appointment Filter State
  const [appointmentFilter, setAppointmentFilter] = useState('all');

  // Load Dashboard Data
  const loadData = async () => {
    try {
      const [pRes, aRes, dhRes] = await Promise.all([
        fetch(`${API}/profile/`, { credentials: 'include' }),
        fetch(`${API}/appointments/`, { credentials: 'include' }),
        fetch(`${API}/doctor/hospitals/`, { credentials: 'include' })
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
        if (pData.profile?.recovery_question) {
          setPasswordForm(prev => ({ ...prev, recovery_question: pData.profile.recovery_question }));
        }
      }

      if (aRes.ok) {
        const aData = await aRes.json();
        setAppointments(aData.appointments || []);
      }

      if (dhRes.ok) {
        const dhData = await dhRes.json();
        setDoctorHospitals(dhData.hospitals || []);
      }
    } catch (err) {
      console.error("Error loading doctor portal data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close live suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Patient Search Trigger (Doctor-scoped)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API}/doctor/patient-suggestions/?query=${encodeURIComponent(searchQuery.trim())}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.patients || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Doctor patient suggestion error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Switch Hospital for Doctor
  const handleSwitchHospital = async (targetHid) => {
    if (!targetHid || targetHid === hospitalId) return;
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
        setMessage({ text: 'Hospital context switched successfully.', type: 'success' });
        loadData();
      }
    } catch (err) {
      console.error("Error switching hospital context:", err);
    }
  };

  // Handle Selecting a Patient & Loading Authorized Medical History
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setShowSuggestions(false);
    setLoadingHistory(true);
    setPatientHistory([]);

    try {
      const pUid = patient.patient_uid || patient.health_id || patient.patient_id;
      const res = await fetch(`${API}/patient-history/?health_id=${encodeURIComponent(pUid)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(data.history || []);
        if (data.patient) {
          setSelectedPatient(prev => ({ ...prev, ...data.patient }));
        }
      } else {
        const errData = await res.json();
        setMessage({ text: errData.message || 'Could not load patient history.', type: 'warning' });
      }
    } catch (err) {
      console.error("Error fetching patient history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save Visit Consultation Record (Doctor)
  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setMessage({ text: 'Please select a patient.', type: 'danger' });
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
        setMessage({ text: 'Patient consultation visit record saved successfully!', type: 'success' });
        setVisitForm({ diagnosis: '', medical_notes: '', appointment_id: '' });
        setShowVisitModal(false);
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

  // Save Doctor Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
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

  // Change Password & Recovery Question
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
        setPasswordMsg({ text: 'Password and security recovery settings updated successfully!', type: 'success' });
        setPasswordForm(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: '',
          recovery_answer: ''
        }));
        if (profile) {
          setProfile(prev => ({ ...prev, must_change_password: false, has_recovery_question: true }));
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
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayApps = appointments.filter(a => a.date === todayDateStr || a.status === 'Confirmed');
  const pendingApps = appointments.filter(a => a.status === 'Pending').length;
  const confirmedApps = appointments.filter(a => a.status === 'Confirmed').length;
  const completedApps = appointments.filter(a => a.status === 'Completed').length;

  const doctorName = profile?.name || user?.name || 'Doctor';
  const displayHospital = hospitalName || 'UniCare Network Hospital';

  // Extract distinct patients from doctor's appointments
  const distinctPatients = Array.from(
    new Map(
      appointments.map(a => [
        a.patient_id || a.patient_uid || a.patient,
        {
          patient_id: a.patient_id,
          patient_uid: a.patient_uid || a.health_id || `PT-${a.patient_id}`,
          health_id: a.patient_uid || a.health_id || `PT-${a.patient_id}`,
          name: a.patient,
          phone: a.phone || '',
          gender: a.gender || 'N/A',
          date_of_birth: a.date_of_birth || 'N/A',
          last_appointment: a.date
        }
      ])
    ).values()
  );

  // Filtered Appointments List
  const filteredAppointments = appointments.filter(a => {
    if (appointmentFilter === 'today') return a.date === todayDateStr;
    if (appointmentFilter === 'upcoming') return a.status === 'Confirmed' || a.status === 'Pending';
    if (appointmentFilter === 'completed') return a.status === 'Completed';
    return true;
  });

  return (
    <div className="d-flex min-vh-100 bg-light" style={{ fontFamily: 'var(--font-body)' }}>
      {/* FIXED LEFT SIDEBAR (LIGHT THEME) */}
      <aside className="bg-white border-end d-flex flex-column flex-shrink-0 p-3 shadow-sm" style={{ width: '260px' }}>
        {/* Brand Header */}
        <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3 border-bottom">
          <div className="rounded-3 p-2 text-white d-flex align-items-center justify-content-center shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}>
            <i className="bi bi-heart-pulse-fill fs-5"></i>
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-slate-800" style={{ fontSize: '1rem', letterSpacing: '0.3px', color: '#0f172a' }}>UniCare Clinical</h6>
            <small className="text-teal fw-semibold extra-small" style={{ fontSize: '0.75rem', color: '#0d9488' }}>Doctor Portal</small>
          </div>
        </div>

        {/* Doctor Info Badge */}
        <div className="p-2.5 rounded-3 mb-3 border" style={{ backgroundColor: '#f8fafc' }}>
          <div className="fw-bold text-dark small truncate">Dr. {doctorName}</div>
          <div className="text-teal extra-small font-monospace fw-semibold" style={{ color: '#0d9488', fontSize: '0.75rem' }}>
            {profile?.specialization || 'Medical Specialist'}
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="nav nav-pills flex-column mb-auto gap-1">
          {[
            { id: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
            { id: 'appointments', icon: 'bi-calendar-event', label: 'Appointments', count: todayApps.length },
            { id: 'search', icon: 'bi-search', label: 'Patient Search' },
            { id: 'patients', icon: 'bi-people', label: 'My Patients' },
            { id: 'consultations', icon: 'bi-stethoscope', label: 'Consultations' },
            { id: 'records', icon: 'bi-folder2-open', label: 'Medical Records' },
            { id: 'prescriptions', icon: 'bi-capsule', label: 'Prescriptions' },
            { id: 'reports', icon: 'bi-file-earmark-medical', label: 'Reports' },
            { id: 'schedule', icon: 'bi-clock', label: 'My Schedule' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 rounded-3 border-0 fw-semibold ${
                activeTab === item.id ? 'text-white' : 'text-slate-700 hover-teal'
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
            onClick={() => setActiveTab('profile')}
            className={`nav-link text-start d-flex align-items-center gap-2 py-2 px-3 rounded-3 border-0 fw-semibold ${
              activeTab === 'profile' ? 'text-white' : 'text-slate-700'
            }`}
            style={{
              backgroundColor: activeTab === 'profile' ? '#0d9488' : 'transparent',
              color: activeTab === 'profile' ? '#ffffff' : '#334155'
            }}
          >
            <i className="bi bi-person"></i> Profile
          </button>

          <button
            onClick={() => setActiveTab('password')}
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

        {/* Sidebar Footer Logout */}
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
        {/* TOP NAVBAR */}
        <header className="bg-white border-bottom shadow-sm py-2.5 px-4 sticky-top d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            {/* Hospital Switcher Dropdown */}
            {doctorHospitals.length > 1 ? (
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-hospital text-teal fs-5" style={{ color: '#0d9488' }}></i>
                <select
                  className="form-select form-select-sm fw-bold border-teal text-teal rounded-pill"
                  value={hospitalId || ''}
                  onChange={(e) => handleSwitchHospital(Number(e.target.value))}
                  style={{ minWidth: '220px', color: '#0d9488' }}
                >
                  {doctorHospitals.map(h => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      🏥 {h.hospital_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-teal-subtle text-teal px-3 py-1.5 rounded-pill fw-bold" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                  🏥 {displayHospital}
                </span>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="badge bg-light text-dark border px-3 py-1.5 rounded-pill">
              <i className="bi bi-shield-check text-success me-1"></i> Doctor Account Active
            </span>
            <div className="text-end">
              <div className="fw-bold text-dark small">Dr. {doctorName}</div>
              <small className="text-muted extra-small">{profile?.specialization || 'Clinical Specialist'}</small>
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <div className="container-fluid p-4 flex-grow-1">
          {/* Banner Message */}
          {message && (
            <div className={`alert alert-${message.type} alert-dismissible fade show border-0 shadow-sm rounded-3 mb-4`} role="alert">
              <div className="d-flex align-items-center gap-2">
                <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill fs-5' : 'bi-exclamation-triangle-fill fs-5'}`}></i>
                <div>{message.text}</div>
              </div>
              <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
            </div>
          )}

          {/* Temporary Password & Security Notice Banner */}
          {(profile?.must_change_password || user?.must_change_password || !profile?.has_recovery_question) && (
            <div className="alert alert-warning border-warning shadow-sm mb-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 gap-3">
              <div className="d-flex align-items-center gap-3">
                <i className="bi bi-shield-exclamation fs-2 text-warning"></i>
                <div>
                  <strong className="text-dark">Action Required: Temporary Password Detected</strong>
                  <div className="small text-secondary">
                    Your password was temporarily assigned by your hospital administrator. Please update your password and set a security recovery question now.
                  </div>
                </div>
              </div>
              <button
                className="btn btn-warning btn-sm fw-bold px-3 text-nowrap rounded-pill shadow-sm"
                onClick={() => setActiveTab('password')}
              >
                <i className="bi bi-key me-1"></i> Change Password Now
              </button>
            </div>
          )}

          {/* PAGE VIEW RENDERS */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Welcome Header & Stats */}
              <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                  <div>
                    <h3 className="fw-bold text-dark mb-1">Welcome back, Dr. {doctorName}!</h3>
                    <p className="text-muted small mb-0">
                      Logged in at <strong className="text-dark">{displayHospital}</strong> &bull; {profile?.specialization || 'General Clinical Medicine'}
                    </p>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <div className="bg-light border rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                      <span className="text-muted extra-small d-block">Total Apps</span>
                      <span className="fw-bold text-dark fs-5">{totalApps}</span>
                    </div>
                    <div className="bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                      <span className="text-warning-emphasis extra-small d-block">Pending</span>
                      <span className="fw-bold text-warning-emphasis fs-5">{pendingApps}</span>
                    </div>
                    <div className="bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                      <span className="text-primary extra-small d-block">Confirmed</span>
                      <span className="fw-bold text-primary fs-5">{confirmedApps}</span>
                    </div>
                    <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                      <span className="text-success extra-small d-block">Completed</span>
                      <span className="fw-bold text-success fs-5">{completedApps}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's Appointments Table */}
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-calendar2-check-fill text-teal fs-5" style={{ color: '#0d9488' }}></i>
                    <h5 className="fw-bold mb-0 text-dark">Today's Appointments</h5>
                  </div>
                  <span className="badge bg-teal-subtle text-teal rounded-pill px-3 py-1 fw-bold" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    {todayApps.length} Patients
                  </span>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-4">Patient Name</th>
                          <th>Health ID</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th className="text-end pe-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayApps.map(a => (
                          <tr key={a.appointment_id}>
                            <td className="ps-4 fw-bold text-dark">{a.patient}</td>
                            <td>
                              <span className="badge bg-light text-dark border font-monospace">{a.patient_uid || a.health_id || `PT-${a.patient_id}`}</span>
                            </td>
                            <td className="fw-semibold text-secondary">{a.time}</td>
                            <td>
                              <span className={`badge rounded-pill px-3 py-1 ${a.status === 'Completed' ? 'bg-success' : 'bg-primary'}`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="text-end pe-4">
                              <button
                                className="btn btn-sm btn-teal text-white rounded-pill px-3 fw-bold me-1"
                                style={{ backgroundColor: '#0d9488' }}
                                onClick={() => {
                                  handleSelectPatient({
                                    patient_id: a.patient_id,
                                    patient_uid: a.patient_uid || a.health_id,
                                    name: a.patient
                                  });
                                  setVisitForm(prev => ({ ...prev, appointment_id: a.appointment_id }));
                                  setShowVisitModal(true);
                                }}
                              >
                                <i className="bi bi-stethoscope me-1"></i> Start Visit
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!todayApps.length && (
                          <tr>
                            <td colSpan="5" className="text-center text-muted py-4">
                              <i className="bi bi-calendar-x text-secondary d-block fs-3 mb-1"></i>
                              No appointments scheduled for today.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Info Grid */}
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                    <h5 className="fw-bold text-dark mb-3"><i className="bi bi-lightning-charge-fill text-warning me-2"></i>Quick Actions</h5>
                    <div className="d-grid gap-2">
                      <button className="btn btn-outline-teal text-start py-2.5 rounded-3 fw-semibold" onClick={() => setActiveTab('search')}>
                        <i className="bi bi-search me-2"></i> Search Patient & Load Medical History
                      </button>
                      <button className="btn btn-outline-teal text-start py-2.5 rounded-3 fw-semibold" onClick={() => setActiveTab('appointments')}>
                        <i className="bi bi-calendar-event me-2"></i> View All Appointments List
                      </button>
                      <button className="btn btn-outline-teal text-start py-2.5 rounded-3 fw-semibold" onClick={() => setActiveTab('password')}>
                        <i className="bi bi-shield-lock me-2"></i> Update Security Recovery Settings
                      </button>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                    <h5 className="fw-bold text-dark mb-3"><i className="bi bi-hospital me-2 text-teal" style={{ color: '#0d9488' }}></i>Hospital Context Info</h5>
                    <div className="mb-2">
                      <span className="text-muted small">Current Facility:</span>
                      <div className="fw-bold text-dark">{displayHospital}</div>
                    </div>
                    <div className="mb-2">
                      <span className="text-muted small">Specialization:</span>
                      <div className="fw-semibold text-secondary">{profile?.specialization || 'General Medicine'}</div>
                    </div>
                    <div>
                      <span className="text-muted small">Assigned Doctor License:</span>
                      <div className="font-monospace fw-bold text-teal" style={{ color: '#0d9488' }}>{profile?.license || 'LIC-DOC-VERIFIED'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPOINTMENTS VIEW */}
          {activeTab === 'appointments' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                  <h4 className="fw-bold text-dark mb-1"><i className="bi bi-calendar-event text-teal me-2" style={{ color: '#0d9488' }}></i>Appointments List</h4>
                  <p className="text-muted small mb-0">Review and manage patient appointments for {displayHospital}.</p>
                </div>
                <div className="btn-group btn-group-sm rounded-pill border p-1 bg-light">
                  {['all', 'today', 'upcoming', 'completed'].map(f => (
                    <button
                      key={f}
                      className={`btn btn-sm rounded-pill text-capitalize px-3 fw-semibold ${appointmentFilter === f ? 'btn-teal text-white shadow-sm' : 'text-secondary border-0'}`}
                      style={{ backgroundColor: appointmentFilter === f ? '#0d9488' : 'transparent' }}
                      onClick={() => setAppointmentFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date & Time</th>
                      <th>Patient Name</th>
                      <th>Health ID</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map(a => (
                      <tr key={a.appointment_id}>
                        <td className="fw-bold text-dark">
                          <div>{a.date}</div>
                          <small className="text-muted">{a.time}</small>
                        </td>
                        <td className="fw-semibold">{a.patient}</td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">{a.patient_uid || a.health_id || `PT-${a.patient_id}`}</span>
                        </td>
                        <td className="text-muted">{a.department}</td>
                        <td>
                          <span className={`badge rounded-pill px-3 py-1 ${a.status === 'Completed' ? 'bg-success' : 'bg-primary'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-teal text-white rounded-pill px-3 fw-bold"
                            style={{ backgroundColor: '#0d9488' }}
                            onClick={() => {
                              handleSelectPatient({
                                patient_id: a.patient_id,
                                patient_uid: a.patient_uid || a.health_id,
                                name: a.patient
                              });
                              setVisitForm(prev => ({ ...prev, appointment_id: a.appointment_id }));
                              setShowVisitModal(true);
                            }}
                          >
                            <i className="bi bi-stethoscope me-1"></i> Record Visit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!filteredAppointments.length && (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          <i className="bi bi-calendar-x d-block fs-2 mb-2 text-secondary"></i>
                          No appointments matching the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PATIENT SEARCH VIEW */}
          {activeTab === 'search' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white" ref={searchRef}>
              <h4 className="fw-bold text-dark mb-2"><i className="bi bi-search text-teal me-2" style={{ color: '#0d9488' }}></i>Doctor Patient Search</h4>
              <p className="text-muted small mb-3">
                Search by Patient Name or global Health ID (e.g. PTA001). Suggestions are strictly scoped to patients having appointments with you at <strong>{displayHospital}</strong>.
              </p>

              <div className="position-relative mb-4">
                <div className="input-group input-group-lg">
                  <span className="input-group-text bg-light border-end-0">
                    {isSearching ? <span className="spinner-border spinner-border-sm text-teal" role="status"></span> : <i className="bi bi-search text-muted"></i>}
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 fs-6"
                    placeholder="Type patient name or Health ID e.g. PTA001..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                  />
                </div>

                {/* LIVE SUGGESTIONS DROPDOWN */}
                {showSuggestions && (
                  <div className="position-absolute w-100 bg-white border rounded-3 shadow-lg mt-1 z-3 overflow-hidden">
                    <div className="p-2 bg-light border-bottom text-muted small fw-bold d-flex justify-content-between">
                      <span>MATCHING PATIENTS ({displayHospital})</span>
                      <span>{suggestions.length} Found</span>
                    </div>
                    <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '300px' }}>
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
                            Open Record
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Patient Record View */}
              {selectedPatient && (
                <div className="bg-light p-4 rounded-4 border">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <span className="badge bg-teal text-white rounded-pill px-3 py-1 font-monospace mb-2" style={{ backgroundColor: '#0d9488' }}>
                        {selectedPatient.patient_uid || selectedPatient.health_id}
                      </span>
                      <h4 className="fw-bold text-dark mb-1">{selectedPatient.name}</h4>
                      <p className="text-muted small mb-0">
                        Phone: <strong>{selectedPatient.phone || 'N/A'}</strong> &bull; DOB: {selectedPatient.date_of_birth || 'N/A'} &bull; Gender: {selectedPatient.gender || 'N/A'}
                      </p>
                    </div>
                    <button
                      className="btn btn-teal text-white btn-sm fw-bold rounded-pill px-3"
                      style={{ backgroundColor: '#0d9488' }}
                      onClick={() => setShowVisitModal(true)}
                    >
                      <i className="bi bi-plus-circle me-1"></i> Record New Visit
                    </button>
                  </div>

                  <h6 className="fw-bold text-dark mt-4 mb-2"><i className="bi bi-clock-history me-1 text-teal"></i> Authorized Clinical Visit History</h6>
                  {loadingHistory ? (
                    <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-teal"></span> Loading record history...</div>
                  ) : patientHistory.length ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered bg-white mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Date</th>
                            <th>Doctor</th>
                            <th>Hospital</th>
                            <th>Diagnosis</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientHistory.map((h, i) => (
                            <tr key={i}>
                              <td className="fw-bold text-nowrap">{h.visited_at || h.date}</td>
                              <td>{h.doctor_name}</td>
                              <td>{h.hospital_name}</td>
                              <td className="fw-semibold text-teal" style={{ color: '#0d9488' }}>{h.diagnosis}</td>
                              <td>{h.medical_notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-secondary py-2 small mb-0">No prior visit records logged for this patient.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MY PATIENTS VIEW */}
          {activeTab === 'patients' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-bold text-dark mb-1"><i className="bi bi-people text-teal me-2" style={{ color: '#0d9488' }}></i>My Patients Roster</h4>
              <p className="text-muted small mb-4">List of distinct patients under your care at {displayHospital}.</p>

              <div className="row g-3">
                {distinctPatients.map((p, idx) => (
                  <div className="col-md-6 col-lg-4" key={idx}>
                    <div className="card border rounded-3 p-3 h-100 shadow-sm hover-teal">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="fw-bold text-dark fs-6">{p.name}</div>
                        <span className="badge bg-light text-teal border font-monospace extra-small" style={{ color: '#0d9488' }}>{p.health_id}</span>
                      </div>
                      <div className="small text-muted mb-3">
                        <div><i className="bi bi-telephone me-1"></i>{p.phone || 'No phone'}</div>
                        <div><i className="bi bi-calendar me-1"></i>DOB: {p.date_of_birth} &bull; {p.gender}</div>
                      </div>
                      <button
                        className="btn btn-outline-teal btn-sm fw-bold w-100 rounded-3"
                        onClick={() => {
                          setActiveTab('search');
                          handleSelectPatient(p);
                        }}
                      >
                        View Medical History
                      </button>
                    </div>
                  </div>
                ))}
                {!distinctPatients.length && (
                  <div className="col-12 text-center text-muted py-5">
                    <i className="bi bi-people d-block fs-1 mb-2 text-secondary"></i>
                    No patient records available yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONSULTATIONS & MEDICAL RECORDS & PRESCRIPTIONS & REPORTS */}
          {['consultations', 'records', 'prescriptions', 'reports'].includes(activeTab) && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-bold text-dark text-capitalize mb-1">
                <i className="bi bi-journal-medical text-teal me-2" style={{ color: '#0d9488' }}></i>{activeTab} Management
              </h4>
              <p className="text-muted small mb-4">Review medical records, diagnosis logs, and clinical prescriptions.</p>

              {selectedPatient ? (
                <div>
                  <div className="alert alert-info py-2 small mb-3">
                    Viewing records for selected patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.patient_uid || selectedPatient.health_id})
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Diagnosis</th>
                          <th>Notes & Treatment</th>
                          <th>Doctor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientHistory.map((h, idx) => (
                          <tr key={idx}>
                            <td className="fw-bold">{h.visited_at || h.date}</td>
                            <td className="fw-semibold text-teal" style={{ color: '#0d9488' }}>{h.diagnosis}</td>
                            <td>{h.medical_notes}</td>
                            <td>{h.doctor_name}</td>
                          </tr>
                        ))}
                        {!patientHistory.length && (
                          <tr><td colSpan="4" className="text-center text-muted py-4">No records logged for this patient.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-folder2-open d-block fs-1 mb-2 text-secondary"></i>
                  <p className="mb-3">Select a patient from <strong>Patient Search</strong> to inspect authorized medical records and prescriptions.</p>
                  <button className="btn btn-teal text-white rounded-pill px-4" style={{ backgroundColor: '#0d9488' }} onClick={() => setActiveTab('search')}>
                    Go to Patient Search
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MY SCHEDULE VIEW */}
          {activeTab === 'schedule' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h4 className="fw-bold text-dark mb-1"><i className="bi bi-clock-history text-teal me-2" style={{ color: '#0d9488' }}></i>My Clinical Schedule</h4>
              <p className="text-muted small mb-4">Working hours and time slot availability for Dr. {doctorName}.</p>

              <div className="row g-4">
                <div className="col-md-6">
                  <div className="bg-light p-3 rounded-3 border">
                    <h6 className="fw-bold text-dark mb-2">Hospital Assignment</h6>
                    <div className="fw-semibold text-teal" style={{ color: '#0d9488' }}>{displayHospital}</div>
                    <small className="text-muted d-block mt-1">Specialization: {profile?.specialization || 'General Medicine'}</small>
                    <small className="text-muted d-block">Medical License: {profile?.license || 'LIC-DOC-VERIFIED'}</small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="bg-light p-3 rounded-3 border">
                    <h6 className="fw-bold text-dark mb-2">Available Consultation Time Slots</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(t => (
                        <span key={t} className="badge bg-white text-dark border p-2 font-monospace">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE VIEW */}
          {activeTab === 'profile' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white" style={{ maxWidth: '720px' }}>
              <h4 className="fw-bold text-dark mb-1"><i className="bi bi-person-lines-fill text-teal me-2" style={{ color: '#0d9488' }}></i>Doctor Profile</h4>
              <p className="text-muted small mb-4">Manage your personal details and clinical experience.</p>

              <form onSubmit={handleSaveProfile}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Full Name</label>
                  <input
                    className="form-control"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Clinical Experience</label>
                  <input
                    className="form-control"
                    placeholder="e.g. 5 Years"
                    value={profileForm.experience}
                    onChange={(e) => setProfileForm({ ...profileForm, experience: e.target.value })}
                  />
                </div>
                <button className="btn btn-teal text-white fw-bold rounded-3 px-4" style={{ backgroundColor: '#0d9488' }}>
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* CHANGE PASSWORD VIEW (NO WHITE PAGE ERROR) */}
          {activeTab === 'password' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white" style={{ maxWidth: '720px' }}>
              <h4 className="fw-bold text-dark mb-1"><i className="bi bi-shield-lock text-teal me-2" style={{ color: '#0d9488' }}></i>Change Password & Security Recovery</h4>
              <p className="text-muted small mb-4">Update your password and security recovery question to keep your account safe.</p>

              {passwordMsg && (
                <div className={`alert alert-${passwordMsg.type} py-2 px-3 small mb-3`}>
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Current Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">New Password (Min 8 chars) *</label>
                    <input
                      type="password"
                      className="form-control"
                      minLength="8"
                      required
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold text-muted">Confirm New Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      minLength="8"
                      required
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    />
                  </div>
                </div>

                <hr className="my-3" />
                <h6 className="fw-bold text-dark mb-2">Account Security Recovery Setup</h6>
                <p className="text-muted extra-small mb-3" style={{ fontSize: '0.825rem' }}>
                  Select a security question and answer for self-service password recovery.
                </p>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Security Recovery Question *</label>
                  <select
                    className="form-select"
                    value={passwordForm.recovery_question}
                    onChange={(e) => setPasswordForm({ ...passwordForm, recovery_question: e.target.value })}
                    required
                  >
                    {RECOVERY_QUESTIONS.map((q, idx) => (
                      <option key={idx} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold text-muted">Security Recovery Answer *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter your secret answer"
                    required
                    value={passwordForm.recovery_answer}
                    onChange={(e) => setPasswordForm({ ...passwordForm, recovery_answer: e.target.value })}
                  />
                </div>

                <button className="btn btn-teal text-white fw-bold rounded-3 px-4 mt-2" style={{ backgroundColor: '#0d9488' }}>
                  Update Password & Security Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* RECORD VISIT MODAL */}
      {showVisitModal && selectedPatient && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header text-white rounded-top-4 p-3 px-4" style={{ backgroundColor: '#0d9488' }}>
                <h5 className="modal-title fw-bold fs-5 mb-0">
                  <i className="bi bi-stethoscope me-2"></i>Record Clinical Consultation
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowVisitModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-light border py-2 px-3 small mb-3">
                  Patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.patient_uid || selectedPatient.health_id})
                </div>
                <form onSubmit={handleSaveVisit}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Diagnosis / Clinical Finding *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Acute Bronchitis / Hypertension follow-up"
                      value={visitForm.diagnosis}
                      onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Clinical Notes & Prescribed Treatment *</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      required
                      placeholder="Enter prescription details, doctor notes, and medical advice..."
                      value={visitForm.medical_notes}
                      onChange={(e) => setVisitForm({ ...visitForm, medical_notes: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowVisitModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-teal text-white rounded-pill px-4 fw-bold" style={{ backgroundColor: '#0d9488' }} disabled={visitSubmitting}>
                      {visitSubmitting ? 'Saving...' : 'Save Visit Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
