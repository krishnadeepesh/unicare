import React, { useEffect, useState } from 'react';

const API = 'http://localhost:8000/api/super-admin';

export default function StaffDashboardPage({ user, onLogout }) {
  const isDoctor = user.role === 'doctor' || user.role === 'Doctor';
  const roleName = isDoctor ? 'Doctor' : 'Receptionist';

  // Profile & Hospital state
  const [profile, setProfile] = useState(null);
  const [hospitalName, setHospitalName] = useState(user.hospital_name || user.hospital || '');
  const [appointments, setAppointments] = useState([]);
  const [healthId, setHealthId] = useState('');
  const [patient, setPatient] = useState(null);
  const [message, setMessage] = useState(null);

  // Forms
  const [visit, setVisit] = useState({ diagnosis: '', medical_notes: '', appointment_id: '' });
  const [appointmentForm, setAppointmentForm] = useState({
    doctor_id: '',
    department_id: '',
    appointment_date: '',
    appointment_time: '09:00',
    reason: ''
  });

  // Patient Registration Form with all tbl_patient fields
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
  const [registeredPatientUid, setRegisteredPatientUid] = useState(null);

  const loadData = async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`${API}/profile/`, { credentials: 'include' }),
        fetch(`${API}/appointments/`, { credentials: 'include' })
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(pData.profile);
        if (pData.profile?.hospital_name) {
          setHospitalName(pData.profile.hospital_name);
        }
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAppointments(aData.appointments || []);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const findPatient = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const r = await fetch(`${API}/patients/lookup/?health_id=${encodeURIComponent(healthId)}`, { credentials: 'include' });
      const d = await r.json();
      if (r.ok) {
        setPatient(d.patient);
      } else {
        setPatient(null);
        setMessage({ text: d.message || 'Patient not found', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Error searching patient', type: 'danger' });
    }
  };

  const registerPatient = async (e) => {
    e.preventDefault();
    setMessage(null);
    setRegisteredPatientUid(null);

    try {
      const r = await fetch(`${API}/patients/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patientForm)
      });
      const d = await r.json();
      if (r.ok) {
        const createdUid = d.patient?.patient_uid || d.patient?.health_id;
        setRegisteredPatientUid(createdUid);
        setMessage({
          text: `Patient registered successfully! Patient UID / Health ID: ${createdUid}`,
          type: 'success'
        });
        setPatientForm({
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
        if (d.patient) {
          setPatient(d.patient);
        }
      } else {
        setMessage({ text: d.message || 'Failed to register patient', type: 'danger' });
      }
    } catch (err) {
      setMessage({ text: 'Network error registering patient', type: 'danger' });
    }
  };

  const saveVisit = async (e) => {
    e.preventDefault();
    if (!patient) return;
    try {
      const r = await fetch(`${API}/visits/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...visit, patient_id: patient.patient_id })
      });
      const d = await r.json();
      setMessage({ text: d.message, type: r.ok ? 'success' : 'danger' });
      if (r.ok) {
        setVisit({ diagnosis: '', medical_notes: '', appointment_id: '' });
        loadData();
      }
    } catch (err) {
      setMessage({ text: 'Error saving visit', type: 'danger' });
    }
  };

  const bookForPatient = async (e) => {
    e.preventDefault();
    if (!patient) return;
    try {
      const r = await fetch(`${API}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...appointmentForm, patient_id: patient.patient_id })
      });
      const d = await r.json();
      setMessage({ text: d.message, type: r.ok ? 'success' : 'danger' });
      if (r.ok) {
        setAppointmentForm({ doctor_id: '', department_id: '', appointment_date: '', appointment_time: '09:00', reason: '' });
        loadData();
      }
    } catch (err) {
      setMessage({ text: 'Error booking appointment', type: 'danger' });
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const r = await fetch(`${API}/profile/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile)
      });
      const d = await r.json();
      setMessage({ text: d.message, type: r.ok ? 'success' : 'danger' });
    } catch (err) {
      setMessage({ text: 'Error updating profile', type: 'danger' });
    }
  };

  const displayName = profile?.name || user.name || 'User';
  const displayHospital = hospitalName || user.hospital_name || user.hospital || 'Hospital Network';

  return (
    <div className="min-vh-100 bg-light d-flex flex-column" style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR WITH HOSPITAL NAME & USER ROLE */}
      <nav className="navbar navbar-expand-lg sticky-top bg-white border-bottom shadow-sm py-2 px-3">
        <div className="container-fluid max-w-7xl">
          {/* Brand & Hospital */}
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-3 p-2 text-white d-flex align-items-center justify-content-center shadow-sm ${
                isDoctor ? 'bg-teal' : 'bg-warning text-dark'
              }`}
              style={{ width: '42px', height: '42px', backgroundColor: isDoctor ? '#0d9488' : '#f59e0b' }}
            >
              <i className={`bi ${isDoctor ? 'bi-stethoscope fs-4' : 'bi-person-badge fs-4'}`}></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="navbar-brand fw-bold text-dark mb-0 py-0" style={{ fontSize: '1.15rem' }}>
                  {displayHospital}
                </span>
                <span
                  className="badge rounded-pill fw-medium px-2 py-1"
                  style={{
                    backgroundColor: isDoctor ? 'rgba(13, 148, 136, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                    color: isDoctor ? '#0d9488' : '#b45309',
                    fontSize: '0.75rem'
                  }}
                >
                  <i className={`bi ${isDoctor ? 'bi-hospital me-1' : 'bi-building me-1'}`}></i>
                  {roleName} Portal
                </span>
              </div>
              <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                UniCare Healthcare System
              </small>
            </div>
          </div>

          {/* User Profile Info & Logout */}
          <div className="d-flex align-items-center gap-3 ms-auto mt-2 mt-lg-0">
            <div className="text-end d-none d-md-block">
              <div className="fw-semibold text-dark small d-flex align-items-center gap-1 justify-content-end">
                <i className="bi bi-person-circle text-teal"></i>
                {displayName}
              </div>
              <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                Role: <span className="fw-medium text-secondary">{roleName}</span>
              </small>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1"
              style={{ fontSize: '0.85rem' }}
            >
              <i className="bi bi-box-arrow-right"></i> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* DASHBOARD CONTAINER */}
      <div className="container-fluid max-w-7xl py-4 flex-grow-1">
        {/* Toast / Banner Messages */}
        {message && (
          <div className={`alert alert-${message.type} alert-dismissible fade show border-0 shadow-sm rounded-3 mb-4`} role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill fs-5' : 'bi-exclamation-triangle-fill fs-5'}`}></i>
              <div>{message.text}</div>
            </div>
            <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
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

            {/* Quick Stat Pills */}
            <div className="d-flex gap-3">
              <div className="bg-light border rounded-3 p-2 px-3 text-center">
                <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Appointments</span>
                <span className="fw-bold text-dark fs-5">{appointments.length}</span>
              </div>
              {!isDoctor && (
                <div className="bg-light border rounded-3 p-2 px-3 text-center">
                  <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Role</span>
                  <span className="fw-bold text-warning fs-6">{roleName}</span>
                </div>
              )}
              {isDoctor && (
                <div className="bg-light border rounded-3 p-2 px-3 text-center">
                  <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Specialization</span>
                  <span className="fw-bold text-teal fs-6">{profile?.specialization || 'Clinical'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="row g-4">
          {/* LEFT SIDEBAR (Patient Reg for Receptionist, Profile for Doctor) */}
          <div className="col-lg-5 col-xl-4">
            {/* Receptionist: Full Patient Registration Form */}
            {!isDoctor && (
              <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                <div className="card-header bg-teal text-white p-3 border-0 d-flex align-items-center gap-2" style={{ backgroundColor: '#0d9488' }}>
                  <i className="bi bi-person-plus-fill fs-5"></i>
                  <h5 className="fw-bold mb-0 text-white">Patient Registration</h5>
                </div>
                <div className="card-body p-4">
                  <p className="text-muted small mb-3">
                    Register a new patient into <strong className="text-dark">{displayHospital}</strong>. System generates a unique Patient UID automatically.
                  </p>

                  <form onSubmit={registerPatient}>
                    {/* Patient Name */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary">Full Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-2"
                        placeholder="e.g. John Doe"
                        required
                        value={patientForm.name}
                        onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                      />
                    </div>

                    {/* Email & Phone */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Email</label>
                        <input
                          type="email"
                          className="form-control form-control-sm rounded-2"
                          placeholder="email@domain.com"
                          value={patientForm.email}
                          onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Phone *</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm rounded-2"
                          placeholder="10-digit number"
                          value={patientForm.phone}
                          onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* DOB & Gender */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Date of Birth *</label>
                        <input
                          type="date"
                          className="form-control form-control-sm rounded-2"
                          required
                          value={patientForm.date_of_birth}
                          onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Gender *</label>
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

                    {/* Blood Group & Emergency Contact */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Blood Group</label>
                        <select
                          className="form-select form-select-sm rounded-2"
                          value={patientForm.blood_group}
                          onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-semibold small text-secondary">Emergency Contact</label>
                        <input
                          type="tel"
                          className="form-control form-control-sm rounded-2"
                          placeholder="Emergency Phone"
                          value={patientForm.emergency_contact}
                          onChange={(e) => setPatientForm({ ...patientForm, emergency_contact: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary">Address</label>
                      <textarea
                        rows="2"
                        className="form-control form-control-sm rounded-2"
                        placeholder="Residential address"
                        value={patientForm.address}
                        onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                      ></textarea>
                    </div>

                    {/* Password */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-secondary">Portal Access Password *</label>
                      <input
                        type="password"
                        className="form-control form-control-sm rounded-2"
                        placeholder="Min 8 characters"
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

                  {/* Display Generated Patient UID badge */}
                  {registeredPatientUid && (
                    <div className="mt-3 p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded-3 text-center">
                      <small className="text-success fw-bold d-block mb-1">Generated Patient UID</small>
                      <span className="fs-4 fw-bold font-monospace text-dark bg-white px-3 py-1 rounded border shadow-sm d-inline-block">
                        {registeredPatientUid}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profile Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                <i className="bi bi-person-lines-fill text-teal fs-5"></i>
                <h5 className="fw-bold mb-0 text-dark">Staff Profile</h5>
              </div>
              <div className="card-body p-4">
                {profile ? (
                  <form onSubmit={updateProfile}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Full Name</label>
                      <input
                        className="form-control form-control-sm"
                        value={profile.name || ''}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Phone Number</label>
                      <input
                        className="form-control form-control-sm"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="Phone"
                      />
                    </div>
                    {isDoctor && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold small text-muted">Experience</label>
                        <input
                          className="form-control form-control-sm"
                          value={profile.experience || ''}
                          onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                          placeholder="e.g. 5 Years"
                        />
                      </div>
                    )}
                    <button className="btn btn-outline-primary btn-sm rounded-2 w-100">
                      Save Profile Changes
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-3 text-muted">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <span className="ms-2 small">Loading profile...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT MAIN PANEL (Patient Lookup, Visits/Appointments) */}
          <div className="col-lg-7 col-xl-8">
            {/* Patient Lookup Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                <i className="bi bi-search text-teal fs-5"></i>
                <h5 className="fw-bold mb-0 text-dark">Patient Lookup</h5>
              </div>
              <div className="card-body p-4">
                <form className="row g-2 align-items-center" onSubmit={findPatient}>
                  <div className="col">
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-credit-card-2-front text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Enter Patient UID / Health ID (e.g. PTA001 or HC-2026...)"
                        value={healthId}
                        onChange={(e) => setHealthId(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-auto">
                    <button type="submit" className="btn btn-primary px-4 fw-bold">
                      <i className="bi bi-search me-1"></i> Find Patient
                    </button>
                  </div>
                </form>

                {patient && (
                  <div className="mt-3 p-3 bg-light border border-teal-subtle rounded-3 d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                        <span>{patient.name}</span>
                        <span className="badge bg-primary rounded-pill small font-monospace">
                          {patient.patient_uid || patient.health_id}
                        </span>
                      </h6>
                      <div className="small text-muted">
                        <i className="bi bi-envelope me-1"></i> {patient.email || 'No email'} &bull;
                        <i className="bi bi-telephone me-1 ms-2"></i> {patient.phone || 'No phone'}
                      </div>
                    </div>
                    <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
                      Found
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor View: Create Visit for Found Patient */}
            {isDoctor && patient && (
              <div className="card border-0 shadow-sm rounded-4 mb-4 border-top border-primary border-4">
                <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                  <i className="bi bi-journal-medical text-primary fs-5"></i>
                  <h5 className="fw-bold mb-0 text-dark">Create Patient Visit Record</h5>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={saveVisit}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Select Patient Appointment</label>
                      <select
                        className="form-select"
                        value={visit.appointment_id}
                        onChange={(e) => setVisit({ ...visit, appointment_id: e.target.value })}
                        required
                      >
                        <option value="">-- Choose Appointment --</option>
                        {appointments
                          .filter((a) => (a.health_id === patient.health_id || a.health_id === patient.patient_uid) && a.status !== 'Completed')
                          .map((a) => (
                            <option key={a.appointment_id} value={a.appointment_id}>
                              {a.date} {a.time} — {a.reason}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Diagnosis</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Acute Bronchitis"
                        value={visit.diagnosis}
                        onChange={(e) => setVisit({ ...visit, diagnosis: e.target.value })}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold small text-muted">Medical Notes & Clinical Observations</label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Prescriptions, observations, follow-up instructions..."
                        value={visit.medical_notes}
                        onChange={(e) => setVisit({ ...visit, medical_notes: e.target.value })}
                      ></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary fw-bold px-4">
                      <i className="bi bi-save me-1"></i> Save Visit Record
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Receptionist View: Book Appointment for Found Patient */}
            {!isDoctor && patient && (
              <div className="card border-0 shadow-sm rounded-4 mb-4 border-top border-warning border-4">
                <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                  <i className="bi bi-calendar-plus text-warning fs-5"></i>
                  <h5 className="fw-bold mb-0 text-dark">Book Appointment for {patient.name}</h5>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={bookForPatient}>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-muted">Doctor ID *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Doctor ID (e.g. 1)"
                          required
                          value={appointmentForm.doctor_id}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor_id: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-muted">Appointment Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          required
                          value={appointmentForm.appointment_date}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-muted">Time *</label>
                        <input
                          type="time"
                          className="form-control"
                          required
                          value={appointmentForm.appointment_time}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_time: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small text-muted">Reason for Visit *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Routine Consultation"
                          required
                          value={appointmentForm.reason}
                          onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-warning fw-bold px-4">
                      <i className="bi bi-calendar-check me-1"></i> Book Appointment
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
                        </tr>
                      ))}
                      {!appointments.length && (
                        <tr>
                          <td colSpan="4" className="text-center text-muted py-4">
                            No appointments found for {displayHospital}.
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
    </div>
  );
}
