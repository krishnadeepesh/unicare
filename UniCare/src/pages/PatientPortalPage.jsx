import React, { useEffect, useState } from 'react';
import DigitalHealthCard from '../components/DigitalHealthCard';

const API = 'http://localhost:8000/api/super-admin';

const RECOVERY_QUESTIONS = [
  "What is the name of your best friend?",
  "What was the official name of the high school or secondary school you attended?",
  "What is the name of your first pet?",
  "What is your mother's name?",
  "What was the make and model of your first car?",
  "What city were you born in?",
];

export default function PatientPortalPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState([]);
  const [prescriptionsList, setPrescriptionsList] = useState([]);
  const [labReportsList, setLabReportsList] = useState([]);
  const [clinicalHistory, setClinicalHistory] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showUploadReportModal, setShowUploadReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [uploadReportForm, setUploadReportForm] = useState({
    report_type: 'Blood Test',
    report_title: '',
    report_file: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    recovery_question: RECOVERY_QUESTIONS[0],
    recovery_answer: ''
  });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [form, setForm] = useState({
    hospital_id: '',
    department_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '09:00'
  });
  const [message, setMessage] = useState(null);

  const loadPatientData = () => {
    fetch(`${API}/profile/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          if (d.profile.recovery_question) {
            setPasswordForm(prev => ({ ...prev, recovery_question: d.profile.recovery_question }));
          }
        }
      })
      .catch((err) => console.error("Error loading patient profile:", err));

    fetch(`${API}/appointments/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments || []))
      .catch((err) => console.error("Error loading appointments:", err));

    fetch(`${API}/prescriptions/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPrescriptionsList(d.prescriptions || []))
      .catch((err) => console.error("Error loading prescriptions:", err));

    fetch(`${API}/lab-reports/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setLabReportsList(d.reports || []))
      .catch((err) => console.error("Error loading lab reports:", err));

    const pUid = user?.health_id || user?.patient_uid || user?.patient_id;
    if (pUid) {
      fetch(`${API}/patient-history/?health_id=${encodeURIComponent(pUid)}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => setClinicalHistory(d.history || []))
        .catch((err) => console.error("Error loading history:", err));
    }

    fetch(`${API}/hospitals/?status=approved`)
      .then((r) => r.json())
      .then((d) => setHospitals(d.hospitals || []))
      .catch((err) => console.error("Error loading hospitals:", err));
  };

  useEffect(() => {
    loadPatientData();
  }, []);

  useEffect(() => {
    if (!form.hospital_id) return;
    fetch(`${API}/appointments/options/?hospital_id=${form.hospital_id}`)
      .then((r) => r.json())
      .then((d) => {
        setDepartments(d.departments || []);
        setDoctors(d.doctors || []);
      })
      .catch((err) => console.error("Error loading hospital booking options:", err));
  }, [form.hospital_id]);

  const book = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const r = await fetch(`${API}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const d = await r.json();
      setMessage({ text: d.message, type: r.ok ? 'success' : 'danger' });
      if (r.ok) {
        setForm({
          hospital_id: '',
          department_id: '',
          doctor_id: '',
          appointment_date: '',
          appointment_time: '09:00'
        });
        const aRes = await fetch(`${API}/appointments/`, { credentials: 'include' });
        const aData = await aRes.json();
        setAppointments(aData.appointments || []);
      }
    } catch (err) {
      setMessage({ text: 'Error booking appointment.', type: 'danger' });
    }
  };

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
        setPasswordForm(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '', recovery_answer: '' }));
        setProfile(prev => prev ? ({ ...prev, must_change_password: false, has_recovery_question: true }) : null);
      } else {
        setPasswordMsg({ text: data.message || 'Could not update password.', type: 'danger' });
      }
    } catch (err) {
      setPasswordMsg({ text: 'Error updating password and recovery question.', type: 'danger' });
    }
  };

  const handleUploadPatientReport = async (e) => {
    e.preventDefault();
    setReportSubmitting(true);
    try {
      const res = await fetch(`${API}/lab-reports/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          report_type: uploadReportForm.report_type,
          report_title: uploadReportForm.report_title,
          report_file: uploadReportForm.report_file,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Report ${data.report?.lab_report_uid || 'LAB001'} uploaded successfully!`, type: 'success' });
        setUploadReportForm({ report_type: 'Blood Test', report_title: '', report_file: '' });
        setShowUploadReportModal(false);
        loadPatientData();
      } else {
        setMessage({ text: data.message || 'Failed to upload report.', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Error uploading report.', type: 'danger' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const patientName = user?.name || user?.user_name || 'Patient';

  return (
    <div className="d-flex min-vh-100 bg-light" style={{ fontFamily: 'var(--font-body)' }}>
      {/* FIXED LEFT SIDEBAR (LIGHT THEME, ROOMY & BEAUTIFULLY ANIMATED) */}
      <aside className="unicare-sidebar">
        {/* Brand Header */}
        <div className="sidebar-brand-box">
          <div className="sidebar-brand-icon">
            <i className="bi bi-shield-plus"></i>
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-slate-800" style={{ fontSize: '1.1rem', letterSpacing: '0.3px' }}>UniCare</h6>
            <small className="text-teal fw-bold extra-small" style={{ fontSize: '0.74rem', letterSpacing: '0.6px' }}>PATIENT ACCESS</small>
          </div>
        </div>

        {/* Patient Health ID Card */}
        <div className="sidebar-context-card">
          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{patientName}</div>
          <div className="text-teal extra-small font-monospace fw-bold mt-1" style={{ color: '#0d9488', fontSize: '0.78rem' }}>
            Health ID: {user?.patient_uid || user?.health_id || 'PTA001'}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="d-flex flex-column mb-auto">
          <div className="sidebar-section-title">
            My Health Hub
          </div>

          {[
            { id: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
            { id: 'appointments', icon: 'bi-calendar-event', label: 'My Appointments', count: appointments.length },
            { id: 'records', icon: 'bi-folder2-open', label: 'Medical Records' },
            { id: 'prescriptions', icon: 'bi-capsule', label: 'Prescriptions' },
            { id: 'reports', icon: 'bi-file-earmark-medical', label: 'Lab Reports' },
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
              🏥 UniCare Healthcare Network
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
                <div className="fw-bold text-dark small">{patientName}</div>
                <small className="text-muted font-monospace extra-small">ID: {user?.patient_uid || user?.health_id || 'PTA001'}</small>
              </div>
              <div className="rounded-circle bg-teal text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}>
                {patientName ? patientName.charAt(0).toUpperCase() : 'P'}
              </div>
              <i className={`bi bi-chevron-${showProfileMenu ? 'up' : 'down'} text-muted extra-small ms-1`}></i>
            </button>

            {showProfileMenu && (
              <div 
                className="dropdown-menu dropdown-menu-end show shadow-lg border-0 rounded-4 p-2 mt-2" 
                style={{ minWidth: '230px', zIndex: 1050, position: 'absolute', right: 0 }}
              >
                <div className="px-3 py-2 border-bottom mb-1 bg-light rounded-3">
                  <div className="fw-bold text-dark small">{patientName}</div>
                  <small className="text-muted extra-small d-block text-truncate">{user?.email || profile?.email || 'patient@unicare.com'}</small>
                  <span className="badge bg-teal-subtle text-teal mt-1 font-monospace extra-small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    {user?.patient_uid || user?.health_id || 'PTA001'}
                  </span>
                </div>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                  onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                >
                  <i className="bi bi-person text-teal fs-6"></i>
                  <span>My Profile</span>
                </button>
                <button 
                  className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                  onClick={() => { setActiveTab('security'); setShowSecurityModal(true); setShowProfileMenu(false); }}
                >
                  <i className="bi bi-shield-lock text-teal fs-6"></i>
                  <span>Security & Recovery</span>
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

        {/* Temporary Password & Security Recovery Warning Banner */}
        {(profile?.must_change_password || user?.must_change_password || !profile?.has_recovery_question) && (
          <div className="alert alert-warning border-warning shadow-sm mb-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3 gap-3">
            <div className="d-flex align-items-center gap-3">
              <i className="bi bi-shield-exclamation fs-2 text-warning"></i>
              <div>
                <strong className="text-dark">Action Required: Temporary Password Detected</strong>
                <div className="small text-secondary">
                  Your account password was temporarily set by the hospital. Please change your password and set up your security recovery question now.
                </div>
              </div>
            </div>
            <button
              className="btn btn-warning btn-sm fw-bold px-3 text-nowrap rounded-pill shadow-sm"
              onClick={() => setShowSecurityModal(true)}
            >
              <i className="bi bi-key me-1"></i> Update Security Now
            </button>
          </div>
        )}

        {/* PAGE VIEWS */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Dashboard Welcome Header */}
            <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div>
                  <span className="badge bg-teal-subtle text-teal px-3 py-1 rounded-pill fw-medium small mb-2 d-inline-block" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    Patient Access Center
                  </span>
                  <h3 className="fw-bold text-dark mb-1">Welcome back, {patientName}!</h3>
                  <p className="text-muted small mb-0">
                    Manage your appointments, view medical profile, and schedule consultations across all partner hospitals.
                  </p>
                </div>

                <div className="d-flex gap-2">
                  <div className="bg-light border rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                    <span className="text-muted extra-small d-block">Total Apps</span>
                    <span className="fw-bold text-dark fs-5">{appointments.length}</span>
                  </div>
                  <div className="bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                    <span className="text-warning-emphasis extra-small d-block">Pending</span>
                    <span className="fw-bold text-warning-emphasis fs-5">{appointments.filter(a => a.status === 'Pending').length}</span>
                  </div>
                  <div className="bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 p-2 px-3 text-center" style={{ minWidth: '95px' }}>
                    <span className="text-success extra-small d-block">Completed</span>
                    <span className="fw-bold text-success fs-5">{appointments.filter(a => a.status === 'Completed').length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <button
                  className="btn btn-white w-100 p-3 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2"
                  onClick={() => setActiveTab('appointments')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}>
                    <i className="bi bi-calendar-plus-fill"></i>
                  </div>
                  <span className="fw-bold text-dark small">Book Consultation</span>
                  <small className="text-muted">Schedule appointment</small>
                </button>
              </div>
              <div className="col-6 col-md-3">
                <button
                  className="btn btn-white w-100 p-3 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2"
                  onClick={() => setActiveTab('records')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center bg-primary" style={{ width: '38px', height: '38px' }}>
                    <i className="bi bi-journal-medical"></i>
                  </div>
                  <span className="fw-bold text-dark small">Medical History</span>
                  <small className="text-muted">Doctor visit records</small>
                </button>
              </div>
              <div className="col-6 col-md-3">
                <button
                  className="btn btn-white w-100 p-3 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2"
                  onClick={() => setActiveTab('prescriptions')}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center bg-warning" style={{ width: '38px', height: '38px' }}>
                    <i className="bi bi-capsule"></i>
                  </div>
                  <span className="fw-bold text-dark small">Prescriptions</span>
                  <small className="text-muted">Medications & dosage</small>
                </button>
              </div>
              <div className="col-6 col-md-3">
                <button
                  className="btn btn-white w-100 p-3 rounded-4 border shadow-sm text-start hover-teal d-flex flex-column gap-2"
                  onClick={() => { setActiveTab('security'); setShowSecurityModal(true); }}
                >
                  <div className="rounded-3 p-2 text-white d-inline-flex align-items-center justify-content-center bg-danger" style={{ width: '38px', height: '38px' }}>
                    <i className="bi bi-shield-lock-fill"></i>
                  </div>
                  <span className="fw-bold text-dark small">Account Security</span>
                  <small className="text-muted">Change password & recovery</small>
                </button>
              </div>
            </div>

            <div className="row g-4">
              {/* LEFT: Health Card */}
              <div className="col-lg-5 col-xl-4">
                <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
                  <DigitalHealthCard
                    patient={{
                      ...user,
                      patientId: user.patient_id || user.id,
                      healthId: user.patient_uid || user.health_id
                    }}
                  />
                </div>
              </div>

              {/* RIGHT: Recent Appointments */}
              <div className="col-lg-7 col-xl-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-calendar2-check text-teal fs-5" style={{ color: '#0d9488' }}></i>
                      <h5 className="fw-bold mb-0 text-dark">Recent Appointments</h5>
                    </div>
                    <button className="btn btn-sm btn-outline-teal rounded-pill px-3" onClick={() => setActiveTab('appointments')}>
                      View All
                    </button>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4">Appt ID</th>
                            <th>Date & Time</th>
                            <th>Hospital</th>
                            <th>Doctor</th>
                            <th>Status</th>
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
                                <div className="fw-bold text-dark">{a.hospital}</div>
                                <small className="text-muted">{a.department}</small>
                              </td>
                              <td>
                                <div className="fw-medium">{a.doctor}</div>
                                <small className="text-muted">{a.reason}</small>
                              </td>
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
                            </tr>
                          ))}
                          {!appointments.length && (
                            <tr>
                              <td colSpan="4" className="text-center text-muted py-5">
                                <i className="bi bi-calendar-x text-secondary d-block fs-2 mb-2"></i>
                                No appointments booked yet. Click <strong>Book Consultation</strong> above to schedule.
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
        )}

        {/* APPOINTMENTS VIEW */}
        {activeTab === 'appointments' && (
          <div className="row g-4">
            {/* BOOKING FORM */}
            <div className="col-lg-5 col-xl-4">
              <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-plus-fill text-teal fs-5" style={{ color: '#0d9488' }}></i>
                  <h5 className="fw-bold mb-0 text-dark">Book Consultation</h5>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={book}>
                    {/* Select Hospital */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary">Hospital *</label>
                      <select
                        className="form-select rounded-2"
                        required
                        value={form.hospital_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            hospital_id: e.target.value,
                            department_id: '',
                            doctor_id: ''
                          })
                        }
                      >
                        <option value="">-- Choose Hospital --</option>
                        {hospitals.map((h) => (
                          <option key={h.hospital_id} value={h.hospital_id}>
                            {h.hospital_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Department */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary">Department *</label>
                      <select
                        className="form-select rounded-2"
                        required
                        disabled={!form.hospital_id}
                        value={form.department_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            department_id: e.target.value,
                            doctor_id: ''
                          })
                        }
                      >
                        <option value="">
                          {!form.hospital_id ? 'Select hospital first' : '-- Choose Department --'}
                        </option>
                        {departments.map((d) => (
                          <option key={d.department_id} value={d.department_id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Doctor */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary">Doctor *</label>
                      <select
                        className="form-select rounded-2"
                        required
                        disabled={!form.hospital_id}
                        value={form.doctor_id}
                        onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                      >
                        <option value="">
                          {!form.hospital_id ? 'Select hospital first' : '-- Choose Doctor --'}
                        </option>
                        {doctors
                          .filter(
                            (d) =>
                              !form.department_id ||
                              String(d.department_id) === String(form.department_id)
                          )
                          .map((d) => (
                            <option key={d.doctor_id} value={d.doctor_id}>
                              {d.name} — {d.specialization}
                            </option>
                          ))}
                      </select>
                    </div>                    {/* Date & Time */}
                    <div className="row g-2 mb-4">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Date *</label>
                        <input
                          type="date"
                          className="form-control rounded-3 py-2"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={form.appointment_date}
                          onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Time *</label>
                        <input
                          type="time"
                          className="form-control rounded-3 py-2"
                          required
                          value={form.appointment_time}
                          onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn w-100 fw-bold py-2.5 rounded-pill text-white shadow-sm mt-2"
                      style={{ backgroundColor: '#0d9488' }}
                    >
                      <i className="bi bi-calendar-check-fill me-1"></i> Confirm & Book Appointment
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* FULL APPOINTMENTS LIST */}
            <div className="col-lg-7 col-xl-8">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-clock-history text-teal fs-5" style={{ color: '#0d9488' }}></i>
                    <h5 className="fw-bold mb-0 text-dark">My Appointments List</h5>
                  </div>
                  <span className="badge bg-secondary rounded-pill">{appointments.length} Total</span>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-4">Appt ID</th>
                          <th>Date & Time</th>
                          <th>Hospital</th>
                          <th>Doctor</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((a) => (
                          <tr key={a.appointment_id}>
                            <td className="ps-4 font-monospace fw-bold text-teal" style={{ color: '#0d9488' }}>
                              {a.appointment_uid || a.apt_uid || `APT${String(a.appointment_id).padStart(3, '0')}`}
                            </td>
                            <td className="fw-semibold text-dark">
                              <div>{a.date}</div>
                              <small className="text-muted">{a.time}</small>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{a.hospital}</div>
                              <small className="text-muted">{a.department}</small>
                            </td>
                            <td>
                              <div className="fw-medium">{a.doctor}</div>
                              <small className="text-muted">{a.reason}</small>
                            </td>
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
                          </tr>
                        ))}
                        {!appointments.length && (
                          <tr>
                            <td colSpan="5" className="text-center text-muted py-5">
                              <i className="bi bi-calendar-x text-secondary d-block fs-2 mb-2"></i>
                              No appointments booked yet.
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
        )}

        {/* MEDICAL RECORDS VIEW */}
        {activeTab === 'records' && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-1">
                  <i className="bi bi-journal-medical text-teal me-2" style={{ color: '#0d9488' }}></i>Unified Medical Records
                </h4>
                <p className="text-muted small mb-0">Your complete cross-hospital consultation history across all UniCare partner facilities.</p>
              </div>
              <span className="badge bg-light text-teal border px-3 py-2 font-monospace" style={{ color: '#0d9488' }}>
                Health ID: {user?.health_id || user?.patient_uid || 'PTA001'}
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Visit ID</th>
                    <th>Date & Time</th>
                    <th>Hospital</th>
                    <th>Doctor</th>
                    <th>Diagnosis / Reason</th>
                    <th>Clinical Notes & Treatment</th>
                  </tr>
                </thead>
                <tbody>
                  {(clinicalHistory.length ? clinicalHistory : appointments.filter(a => a.status === 'Completed')).map((item, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 font-monospace fw-bold text-teal" style={{ color: '#0d9488' }}>
                        {item.visit_uid || item.id || `VIS${String(item.visit_id || item.appointment_id || (idx + 1)).padStart(3, '0')}`}
                      </td>
                      <td className="fw-semibold text-dark">
                        <div>{item.visited_at || item.date}</div>
                        {item.time && <small className="text-muted">{item.time}</small>}
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{item.hospital_name || item.hospital || 'UniCare Medical Center'}</div>
                      </td>
                      <td>
                        <div className="fw-medium">{item.doctor_name || item.doctor || 'Dr. Practitioner'}</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-teal" style={{ color: '#0d9488' }}>{item.diagnosis || item.reason || 'General Health Consultation'}</div>
                      </td>
                      <td>
                        <div className="small text-secondary">{item.medical_notes || 'Consultation completed satisfactorily.'}</div>
                      </td>
                    </tr>
                  ))}
                  {!clinicalHistory.length && !appointments.filter(a => a.status === 'Completed').length && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-5">
                        <i className="bi bi-journal-x d-block fs-2 mb-2 text-secondary"></i>
                        No medical records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRESCRIPTIONS VIEW */}
        {activeTab === 'prescriptions' && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-1">
                  <i className="bi bi-capsule text-teal me-2" style={{ color: '#0d9488' }}></i>My Digital Prescriptions
                </h4>
                <p className="text-muted small mb-0">Active and past medications prescribed by your authorized doctors.</p>
              </div>
              <span className="badge bg-light text-teal border px-3 py-2 font-monospace" style={{ color: '#0d9488' }}>
                {prescriptionsList.length} Prescriptions
              </span>
            </div>

            <div className="row g-4">
              {prescriptionsList.map((p, idx) => (
                <div className="col-12" key={idx}>
                  <div className="card border rounded-4 shadow-sm p-3 bg-white">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3 pb-2 border-bottom">
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-teal text-white font-monospace fs-6 px-2.5 py-1" style={{ backgroundColor: '#0d9488' }}>
                          {p.prescription_uid || p.id || `PRE${String(p.prescription_id || (idx + 1)).padStart(3, '0')}`}
                        </span>
                        <div>
                          <strong className="text-dark d-block">Issued by: {p.doctor_name || 'Dr. Practitioner'}</strong>
                          <small className="text-muted">{p.hospital_name || 'UniCare Partner Facility'} &bull; Date: {p.date}</small>
                        </div>
                      </div>
                      <span className="badge bg-success-subtle text-success rounded-pill px-3 py-1.5 fw-bold">Active Prescription</span>
                    </div>

                    <div className="table-responsive mb-3">
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Medication Name</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                            <th>Special Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.medicines && p.medicines.length ? (
                            p.medicines.map((m, mIdx) => (
                              <tr key={mIdx}>
                                <td className="fw-bold text-dark">{m.medicine_name}</td>
                                <td>{m.dosage || '500mg'}</td>
                                <td><span className="badge bg-light text-dark border">{m.frequency || 'Twice daily'}</span></td>
                                <td>{m.duration || '5 days'}</td>
                                <td className="text-secondary small">{m.instruction || 'Take after meals'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="text-muted">Standard prescribed medication instructions.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {p.remarks && (
                      <div className="p-2.5 bg-light rounded-3 small text-secondary">
                        <strong className="text-dark">Doctor Remarks:</strong> {p.remarks}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {!prescriptionsList.length && (
                <div className="col-12 text-center text-muted py-5">
                  <i className="bi bi-capsule d-block fs-1 mb-2 text-secondary"></i>
                  No digital prescriptions found on record.
                </div>
              )}
            </div>
          </div>
        )}

        {/* DIAGNOSTIC REPORTS VIEW */}
        {activeTab === 'reports' && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold text-dark mb-1">
                  <i className="bi bi-file-earmark-medical text-teal me-2" style={{ color: '#0d9488' }}></i>Diagnostic & Lab Reports
                </h4>
                <p className="text-muted small mb-0">View test results, lab investigations, or upload personal health reports.</p>
              </div>
              <button
                className="btn btn-teal text-white btn-sm rounded-pill fw-bold px-3 shadow-sm"
                style={{ backgroundColor: '#0d9488' }}
                onClick={() => setShowUploadReportModal(true)}
              >
                <i className="bi bi-cloud-arrow-up me-1"></i> Upload Test Report
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Report ID</th>
                    <th>Category</th>
                    <th>Report Title</th>
                    <th>Date Uploaded</th>
                    <th>Diagnostic Lab / Center</th>
                    <th>Observations & Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {labReportsList.map((r, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 font-monospace fw-bold text-teal" style={{ color: '#0d9488' }}>
                        {r.lab_report_uid || r.id || `LAB${String(r.report_id || (idx + 1)).padStart(3, '0')}`}
                      </td>
                      <td><span className="badge bg-light text-primary border">{r.report_type}</span></td>
                      <td className="fw-bold text-dark">{r.report_title}</td>
                      <td className="small text-muted">{r.uploaded_at || 'Recently'}</td>
                      <td>{r.hospital_name || 'UniCare Diagnostic Network'}</td>
                      <td className="small text-secondary">{r.report_file || 'Normal parameters verified.'}</td>
                    </tr>
                  ))}
                  {!labReportsList.length && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-5">
                        <i className="bi bi-file-earmark-x d-block fs-2 mb-2 text-secondary"></i>
                        No diagnostic reports uploaded yet. Click <strong>Upload Test Report</strong> to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white" style={{ maxWidth: '720px' }}>
            <h4 className="fw-bold text-dark mb-1"><i className="bi bi-person-lines-fill text-teal me-2" style={{ color: '#0d9488' }}></i>My Patient Profile</h4>
            <p className="text-muted small mb-4">Your digital health identity information.</p>

            <div className="row g-3">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block mb-1">Full Name</span>
                  <span className="fw-bold text-dark fs-6">{patientName}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block mb-1">Global Health ID</span>
                  <code className="fw-bold text-teal fs-6" style={{ color: '#0d9488' }}>{user?.patient_uid || user?.health_id || 'N/A'}</code>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block mb-1">Phone</span>
                  <span className="fw-semibold text-dark">{user?.phone || user?.user_phone || 'N/A'}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block mb-1">Email</span>
                  <span className="fw-semibold text-dark">{user?.email || user?.user_email || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top d-flex gap-2">
              <button className="btn btn-teal text-white fw-bold rounded-pill px-4" style={{ backgroundColor: '#0d9488' }} onClick={() => setActiveTab('appointments')}>
                Book an Appointment
              </button>
              <button className="btn btn-outline-teal fw-bold rounded-pill px-4" onClick={() => { setActiveTab('security'); setShowSecurityModal(true); }}>
                Security Settings
              </button>
            </div>
          </div>
        )}
        </div>

      {/* SECURITY & CHANGE PASSWORD MODAL */}
      {showSecurityModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header text-white rounded-top-4 p-3 px-4" style={{ backgroundColor: '#0d9488' }}>
                <h5 className="modal-title fw-bold fs-5 mb-0">
                  <i className="bi bi-shield-lock me-2"></i>Security & Account Password
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSecurityModal(false)}
                ></button>
              </div>

              <div className="modal-body p-3 px-4">
                {passwordMsg && (
                  <div className={`alert alert-${passwordMsg.type} py-1.5 px-3 small mb-2.5`}>
                    {passwordMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <h6 className="fw-bold text-dark mb-2">Update Password</h6>
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
                      Select a security question and secret answer. You can use these to reset your password if you ever forget it.
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

                  <button className="btn text-white btn-sm fw-bold w-100 rounded-3 mt-2" style={{ backgroundColor: '#0d9488' }}>
                    Update Security Settings
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DIAGNOSTIC REPORT MODAL */}
      {showUploadReportModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header text-white rounded-top-4 p-3 px-4" style={{ backgroundColor: '#0d9488' }}>
                <h5 className="modal-title fw-bold fs-5 mb-0">
                  <i className="bi bi-cloud-arrow-up me-2"></i>Upload Diagnostic Test Report
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowUploadReportModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleUploadPatientReport}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Report Category *</label>
                    <select
                      className="form-select"
                      value={uploadReportForm.report_type}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, report_type: e.target.value })}
                    >
                      <option value="Blood Test">Blood Test (CBC, Lipid, HbA1c)</option>
                      <option value="Radiology">Radiology (X-Ray, Ultrasound, CT, MRI)</option>
                      <option value="Pathology">Pathology / Biopsy</option>
                      <option value="Urine Analysis">Urine Analysis</option>
                      <option value="Cardiology">Cardiology (ECG, Echo, Stress Test)</option>
                      <option value="General Diagnostics">General Diagnostic Report</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Report / Investigation Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Annual Blood Sugar & Lipid Profile"
                      value={uploadReportForm.report_title}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, report_title: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Report Observations / Notes / Parameter Values *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      required
                      placeholder="Enter the lab findings, test summary, or remarks (e.g. Fasting Glucose 95 mg/dL, Total Cholesterol 180 mg/dL)..."
                      value={uploadReportForm.report_file}
                      onChange={(e) => setUploadReportForm({ ...uploadReportForm, report_file: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowUploadReportModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-teal text-white rounded-pill px-4 fw-bold" style={{ backgroundColor: '#0d9488' }} disabled={reportSubmitting}>
                      {reportSubmitting ? 'Uploading...' : 'Save & Link to Health ID'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
