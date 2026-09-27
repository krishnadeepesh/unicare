import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000/api/super-admin';

const RECOVERY_QUESTIONS = [
  "What is the name of your best friend?",
  "What was the official name of the high school or secondary school you attended?",
  "What is the name of your first pet?",
  "What is your mother's name?",
  "What was the make and model of your first car?",
  "What city were you born in?",
];

export default function NurseDashboardPage({ user, onLogout, onNavigateHome }) {
  const hospitalName = user?.hospital_name || user?.hospital?.hospital_name || 'Partner Hospital';
  const nurseName = user?.name || user?.user_name || 'Nurse Sarah Kurian';

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'recorded'
  const [message, setMessage] = useState(null);

  // Profile & Password State
  const [profile, setProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const profileMenuRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    recovery_question: RECOVERY_QUESTIONS[0],
    recovery_answer: ''
  });
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Vitals Recording Modal State
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    height: '',
    weight: '',
    blood_pressure: '',
  });
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState('');

  // Vitals History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPatient, setHistoryPatient] = useState(null);
  const [vitalsHistoryList, setVitalsHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch Nurse Profile
  const loadProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        if (data.profile.recovery_question) {
          setPasswordForm(prev => ({ ...prev, recovery_question: data.profile.recovery_question }));
        }
      }
    } catch (err) {
      console.error('Error loading nurse profile:', err);
    }
  };

  // Load Today's Visits Queue
  const loadVisitsQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/nurse/visits/`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setVisits(data.visits || []);
      } else {
        // Fallback to appointments endpoint
        const appRes = await fetch(`${API}/appointments/`, { credentials: 'include' });
        const appData = await appRes.json();
        if (appRes.ok && appData.appointments) {
          setVisits(appData.appointments);
        }
      }
    } catch (err) {
      console.error('Error fetching nurse visits:', err);
      setMessage({ text: 'Unable to connect to clinical server. Please check backend connection.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitsQueue();
    loadProfile();
  }, []);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Open Vitals Modal
  const handleOpenRecordVitals = (visit) => {
    setSelectedVisit(visit);
    setVitalsForm({
      height: visit.height || '',
      weight: visit.weight || '',
      blood_pressure: visit.blood_pressure || '',
    });
    setVitalsError('');
    setShowVitalsModal(true);
  };

  // Calculate BMI preview helper
  const calculateBMI = (h, w) => {
    const heightM = parseFloat(h) / 100;
    const weightKg = parseFloat(w);
    if (!heightM || !weightKg || heightM <= 0 || weightKg <= 0) return null;
    const bmi = (weightKg / (heightM * heightM)).toFixed(1);
    let category = 'Normal weight';
    let badgeClass = 'text-success bg-success-subtle';
    if (bmi < 18.5) { category = 'Underweight'; badgeClass = 'text-warning bg-warning-subtle'; }
    else if (bmi >= 25 && bmi < 30) { category = 'Overweight'; badgeClass = 'text-warning bg-warning-subtle'; }
    else if (bmi >= 30) { category = 'Obesity'; badgeClass = 'text-danger bg-danger-subtle'; }
    return { value: bmi, category, badgeClass };
  };

  // Submit Vitals Recording
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    setVitalsError('');

    const h = vitalsForm.height.trim();
    const w = vitalsForm.weight.trim();
    const bp = vitalsForm.blood_pressure.trim();

    if (!h && !w && !bp) {
      setVitalsError('Please enter at least one clinical vital (Height, Weight, or Blood Pressure).');
      return;
    }

    if (bp && !/^\d{2,3}\/\d{2,3}(\s*mmHg)?$/i.test(bp)) {
      setVitalsError('Blood pressure must be in standard SYS/DIA format (e.g., 120/80 or 120/80 mmHg).');
      return;
    }

    setSavingVitals(true);
    try {
      const res = await fetch(`${API}/vitals/record/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          appointment_id: selectedVisit.appointment_id,
          height: h ? (h.endsWith('cm') ? h : `${h} cm`) : '',
          weight: w ? (w.endsWith('kg') ? w : `${w} kg`) : '',
          blood_pressure: bp ? (bp.toLowerCase().includes('mmhg') ? bp : `${bp} mmHg`) : '',
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        showToast(`Pre-consultation vitals recorded successfully for ${selectedVisit.patient_name || selectedVisit.patient}!`);
        setShowVitalsModal(false);
        loadVisitsQueue();
      } else {
        setVitalsError(data.message || 'Failed to record vitals.');
      }
    } catch (err) {
      setVitalsError('Error communicating with clinical server.');
    } finally {
      setSavingVitals(false);
    }
  };

  // Open Vitals History Modal
  const handleOpenHistory = async (visit) => {
    setHistoryPatient(visit);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setVitalsHistoryList([]);
    try {
      const res = await fetch(`${API}/vitals/history/?patient_id=${encodeURIComponent(visit.patient_id || visit.health_id)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setVitalsHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching vitals history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Change Password & Security Question
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'danger' });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordMsg({ text: 'New password must be at least 8 characters long.', type: 'danger' });
      return;
    }
    if (!passwordForm.recovery_question || !passwordForm.recovery_answer.trim()) {
      setPasswordMsg({ text: 'Please select a security recovery question and enter your answer.', type: 'danger' });
      return;
    }

    setPasswordSubmitting(true);
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
        setWarningDismissed(true);
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
        if (user) {
          user.must_change_password = 0;
        }
        setTimeout(() => {
          setShowSecurityModal(false);
          setPasswordMsg(null);
        }, 1500);
      } else {
        setPasswordMsg({ text: data.message || 'Could not change password.', type: 'danger' });
      }
    } catch (err) {
      setPasswordMsg({ text: 'Error updating password and recovery question.', type: 'danger' });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Filtered visits
  const filteredVisits = visits.filter(v => {
    const q = searchTerm.toLowerCase();
    const matchQuery = !q ||
      (v.patient_name && v.patient_name.toLowerCase().includes(q)) ||
      (v.patient && v.patient.toLowerCase().includes(q)) ||
      (v.health_id && v.health_id.toLowerCase().includes(q)) ||
      (v.patient_uid && v.patient_uid.toLowerCase().includes(q)) ||
      (v.doctor_name && v.doctor_name.toLowerCase().includes(q)) ||
      (v.doctor && v.doctor.toLowerCase().includes(q));

    const isRecorded = Boolean(v.has_vitals || (v.height && v.height.trim()) || (v.weight && v.weight.trim()) || (v.blood_pressure && v.blood_pressure.trim()));

    if (filterStatus === 'pending') return matchQuery && !isRecorded;
    if (filterStatus === 'recorded') return matchQuery && isRecorded;
    return matchQuery;
  });

  const totalVisits = visits.length;
  const recordedCount = visits.filter(v => Boolean(v.has_vitals || v.height || v.weight || v.blood_pressure)).length;
  const pendingCount = totalVisits - recordedCount;

  const bmiPreview = calculateBMI(vitalsForm.height.replace(/[^0-9.]/g, ''), vitalsForm.weight.replace(/[^0-9.]/g, ''));

  return (
    <div className="min-vh-100 bg-slate-50 d-flex flex-column" style={{ backgroundColor: '#f8fafc' }}>
      {/* Modern Top Clinical Header */}
      <header className="sticky-top shadow-sm border-bottom bg-white py-2.5 px-3 px-md-4">
        <div className="d-flex align-items-center justify-content-between gap-3">
          {/* Left Brand & Station Info */}
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 p-2.5 d-flex align-items-center justify-content-center shadow-sm text-white flex-shrink-0"
              style={{ backgroundColor: '#0d9488', width: '42px', height: '42px' }}
            >
              <i className="bi bi-heart-pulse-fill fs-5"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold text-dark fs-6 mb-0">UniCare Clinical Station</span>
                <span className="badge rounded-pill px-2.5 py-0.5 extra-small fw-semibold text-teal" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                  Nurse Workstation
                </span>
              </div>
              <small className="text-muted d-block extra-small">
                <i className="bi bi-hospital me-1 text-teal" style={{ color: '#0d9488' }}></i>
                <strong>{hospitalName}</strong> &bull; Pre-Consultation Vitals Desk
              </small>
            </div>
          </div>

          {/* Right Action Controls & Profile Menu */}
          <div className="d-flex align-items-center gap-2">
            <button
              onClick={() => onNavigateHome && onNavigateHome()}
              className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1.5 fw-medium d-none d-sm-inline-flex align-items-center gap-1.5"
              title="Return to Public Homepage"
            >
              <i className="bi bi-house-door"></i> Home
            </button>

            {/* Profile Dropdown */}
            <div className="position-relative" ref={profileMenuRef}>
              <button
                type="button"
                className="btn btn-sm rounded-pill p-1.5 pe-3 d-flex align-items-center gap-2 border bg-light shadow-sm"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div
                  className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center"
                  style={{ width: '30px', height: '30px', backgroundColor: '#0d9488', fontSize: '13px' }}
                >
                  {nurseName ? nurseName.charAt(0).toUpperCase() : 'N'}
                </div>
                <div className="text-start d-none d-md-block" style={{ lineHeight: 1.2 }}>
                  <div className="fw-bold text-dark extra-small text-truncate" style={{ maxWidth: '140px' }}>{nurseName}</div>
                  <div className="text-muted extra-small" style={{ fontSize: '11px' }}>Clinical Nurse</div>
                </div>
                <i className="bi bi-chevron-down text-muted ms-1" style={{ fontSize: '11px' }}></i>
              </button>

              {showProfileMenu && (
                <div className="position-absolute end-0 mt-2 bg-white rounded-4 shadow-lg border p-2 z-3" style={{ minWidth: '240px' }}>
                  <div className="p-2 border-bottom mb-1">
                    <div className="fw-bold text-dark">{nurseName}</div>
                    <small className="text-muted d-block text-truncate">{profile?.email || user?.email || 'nurse@unicare.com'}</small>
                    <span className="badge bg-light text-teal border mt-1.5 extra-small" style={{ color: '#0d9488' }}>
                      {hospitalName}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="dropdown-item rounded-3 py-2 px-3 small d-flex align-items-center gap-2 text-dark"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowSecurityModal(true);
                    }}
                  >
                    <i className="bi bi-shield-lock text-teal" style={{ color: '#0d9488' }}></i>
                    Change Password & Security
                  </button>

                  <button
                    type="button"
                    className="dropdown-item rounded-3 py-2 px-3 small d-flex align-items-center gap-2 text-secondary d-sm-none"
                    onClick={() => onNavigateHome && onNavigateHome()}
                  >
                    <i className="bi bi-house"></i>
                    Return to Home
                  </button>

                  <div className="dropdown-divider my-1"></div>

                  <button
                    type="button"
                    className="dropdown-item rounded-3 py-2 px-3 small d-flex align-items-center gap-2 text-danger fw-semibold"
                    onClick={onLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mandatory Password Change Alert Banner */}
      {!warningDismissed && (profile?.must_change_password || user?.must_change_password) && (
        <div className="bg-warning text-dark py-2.5 px-4 d-flex align-items-center justify-content-between shadow-sm">
          <div className="d-flex align-items-center gap-2 small">
            <i className="bi bi-shield-exclamation fs-5 flex-shrink-0"></i>
            <div>
              <strong>Security Action Required:</strong> Your nurse account is currently using temporary credentials. Please update your password and security recovery question.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-pill px-3 py-1 fw-bold extra-small text-nowrap ms-3"
            onClick={() => setShowSecurityModal(true)}
          >
            Update Now
          </button>
        </div>
      )}

      {/* Main Clinical Body */}
      <main className="container-fluid py-4 px-3 px-md-5 flex-grow-1" style={{ maxWidth: '1440px' }}>
        {/* Toast Alert */}
        {message && (
          <div className={`alert alert-${message.type} alert-dismissible fade show rounded-4 shadow-sm mb-4 border-0 d-flex align-items-center`} role="alert">
            <i className={`bi bi-${message.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} fs-5 me-2.5 ${message.type === 'success' ? 'text-success' : 'text-danger'}`}></i>
            <div className="fw-medium">{message.text}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {/* Clinical Metric Overview Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-4">
            <div
              className={`card border-0 rounded-4 shadow-sm p-3.5 h-100 bg-white transition-all cursor-pointer ${filterStatus === 'all' ? 'ring-2 border-teal' : ''}`}
              style={filterStatus === 'all' ? { border: '2px solid #0d9488' } : { border: '1px solid #e2e8f0' }}
              onClick={() => setFilterStatus('all')}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted extra-small fw-bold text-uppercase tracking-wider">Today's Visits Queue</span>
                  <h2 className="display-6 fw-bold mb-0 mt-1 text-dark">{totalVisits}</h2>
                  <small className="text-muted extra-small">Total queued consultations</small>
                </div>
                <div
                  className="rounded-circle p-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '54px', height: '54px', backgroundColor: '#e0f2fe', color: '#0284c7' }}
                >
                  <i className="bi bi-people-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <div
              className={`card border-0 rounded-4 shadow-sm p-3.5 h-100 bg-white transition-all cursor-pointer`}
              style={filterStatus === 'pending' ? { border: '2px solid #f59e0b' } : { border: '1px solid #e2e8f0' }}
              onClick={() => setFilterStatus('pending')}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted extra-small fw-bold text-uppercase tracking-wider">Awaiting Pre-Consult Vitals</span>
                  <div className="d-flex align-items-baseline gap-2 mt-1">
                    <h2 className="display-6 fw-bold mb-0 text-warning">{pendingCount}</h2>
                    {pendingCount > 0 && <span className="badge bg-warning-subtle text-warning extra-small rounded-pill">Needs Intake</span>}
                  </div>
                  <small className="text-muted extra-small">Patients waiting for nurse screening</small>
                </div>
                <div
                  className="rounded-circle p-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '54px', height: '54px', backgroundColor: '#fef3c7', color: '#d97706' }}
                >
                  <i className="bi bi-hourglass-split fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-12 col-lg-4">
            <div
              className={`card border-0 rounded-4 shadow-sm p-3.5 h-100 bg-white transition-all cursor-pointer`}
              style={filterStatus === 'recorded' ? { border: '2px solid #0d9488' } : { border: '1px solid #e2e8f0' }}
              onClick={() => setFilterStatus('recorded')}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted extra-small fw-bold text-uppercase tracking-wider">Vitals Recorded & Verified</span>
                  <h2 className="display-6 fw-bold mb-0 mt-1" style={{ color: '#0d9488' }}>{recordedCount}</h2>
                  <small className="text-muted extra-small">Ready for doctor consultation</small>
                </div>
                <div
                  className="rounded-circle p-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '54px', height: '54px', backgroundColor: '#e6f4f1', color: '#0d9488' }}
                >
                  <i className="bi bi-check2-circle fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Queue Section */}
        <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          <div className="card-header bg-white border-bottom p-3.5 px-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-clipboard2-pulse fs-5" style={{ color: '#0d9488' }}></i>
                <h5 className="fw-bold mb-0 text-dark">Pre-Consultation Patient Intake Queue</h5>
              </div>
              <small className="text-muted">
                Record height, weight, and blood pressure before doctor examination.
              </small>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search Bar */}
              <div className="input-group input-group-sm" style={{ minWidth: '240px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Search patient, ID, doctor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="btn btn-light border-start-0" onClick={() => setSearchTerm('')}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${filterStatus === 'all' ? 'text-white fw-bold shadow-sm' : 'btn-outline-secondary'}`}
                  style={filterStatus === 'all' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                  onClick={() => setFilterStatus('all')}
                >
                  All ({totalVisits})
                </button>
                <button
                  type="button"
                  className={`btn ${filterStatus === 'pending' ? 'btn-warning text-dark fw-bold shadow-sm' : 'btn-outline-secondary'}`}
                  onClick={() => setFilterStatus('pending')}
                >
                  Awaiting ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`btn ${filterStatus === 'recorded' ? 'btn-success text-white fw-bold shadow-sm' : 'btn-outline-secondary'}`}
                  onClick={() => setFilterStatus('recorded')}
                >
                  Recorded ({recordedCount})
                </button>
              </div>

              <button
                className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                onClick={loadVisitsQueue}
                title="Refresh Queue"
              >
                <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Responsive Visits Table for Desktop */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted extra-small text-uppercase">
                <tr>
                  <th className="ps-4">Time Slot</th>
                  <th>Patient Details</th>
                  <th>Health ID</th>
                  <th>Assigned Doctor</th>
                  <th>Clinical Reason</th>
                  <th>Vitals Status</th>
                  <th className="pe-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-teal" role="status" style={{ color: '#0d9488' }}></div>
                      <p className="text-muted small mt-2 mb-0">Loading patient intake queue...</p>
                    </td>
                  </tr>
                ) : filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="text-muted mb-2"><i className="bi bi-inbox fs-1"></i></div>
                      <h6 className="fw-semibold text-dark">No patient visits found</h6>
                      <p className="text-muted small mb-0">
                        {searchTerm ? 'No visits match your search criteria.' : 'No patients currently queued for consultation.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((visit) => {
                    const hasVitals = Boolean(visit.has_vitals || (visit.height && visit.height.trim()) || (visit.weight && visit.weight.trim()) || (visit.blood_pressure && visit.blood_pressure.trim()));
                    return (
                      <tr key={visit.appointment_id || visit.id} className={hasVitals ? '' : 'table-warning bg-opacity-10'}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark font-monospace">{visit.time || 'Walk-in'}</div>
                          <small className="text-muted extra-small">{visit.date || 'Today'}</small>
                        </td>

                        <td>
                          <div className="fw-bold text-dark">{visit.patient_name || visit.patient}</div>
                          <small className="text-muted extra-small">
                            {visit.gender || 'N/A'} {visit.date_of_birth ? `• DOB: ${visit.date_of_birth}` : ''} {visit.blood_group ? `• ${visit.blood_group}` : ''}
                          </small>
                        </td>

                        <td>
                          <span className="badge bg-light text-primary border font-monospace px-2.5 py-1 rounded-pill">
                            {visit.health_id || visit.patient_uid || 'N/A'}
                          </span>
                        </td>

                        <td>
                          <div className="fw-semibold text-dark small">{visit.doctor_name || visit.doctor || 'Dr. Assigned'}</div>
                          <small className="text-muted extra-small">{visit.department_name || visit.department || 'General Medicine'}</small>
                        </td>

                        <td>
                          <span className="extra-small text-muted text-truncate d-inline-block" style={{ maxWidth: '180px' }} title={visit.reason}>
                            {visit.reason || 'General Consultation'}
                          </span>
                        </td>

                        <td>
                          {hasVitals ? (
                            <div>
                              <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill fw-semibold">
                                <i className="bi bi-check-circle-fill me-1"></i> Recorded
                              </span>
                              <div className="extra-small text-muted mt-1 font-monospace">
                                {visit.height ? `H:${visit.height} ` : ''}
                                {visit.weight ? `W:${visit.weight} ` : ''}
                                {visit.blood_pressure ? `BP:${visit.blood_pressure}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning-emphasis px-2.5 py-1 rounded-pill fw-semibold">
                              <i className="bi bi-clock-history me-1"></i> Awaiting Vitals
                            </span>
                          )}
                        </td>

                        <td className="pe-4 text-end">
                          <div className="d-flex justify-content-end gap-1.5">
                            <button
                              type="button"
                              className={`btn btn-sm rounded-pill fw-semibold px-3 ${hasVitals ? 'btn-outline-secondary' : 'btn-teal text-white shadow-sm'}`}
                              style={!hasVitals ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                              onClick={() => handleOpenRecordVitals(visit)}
                            >
                              <i className={`bi bi-${hasVitals ? 'pencil-square' : 'plus-circle'} me-1`}></i>
                              {hasVitals ? 'Edit' : 'Record'}
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm rounded-circle p-1.5"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => handleOpenHistory(visit)}
                              title="View Patient Vitals History"
                            >
                              <i className="bi bi-clock-history"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Responsive Cards for Mobile View (< 768px) */}
          <div className="d-md-none p-3 d-flex flex-column gap-3">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-teal" role="status" style={{ color: '#0d9488' }}></div>
                <p className="text-muted small mt-2 mb-0">Loading patient queue...</p>
              </div>
            ) : filteredVisits.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-2 mb-2 d-block"></i>
                No queued patient visits found.
              </div>
            ) : (
              filteredVisits.map((visit) => {
                const hasVitals = Boolean(visit.has_vitals || (visit.height && visit.height.trim()) || (visit.weight && visit.weight.trim()) || (visit.blood_pressure && visit.blood_pressure.trim()));
                return (
                  <div key={visit.appointment_id || visit.id} className="card border rounded-3 p-3 shadow-sm bg-white">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="fw-bold mb-0 text-dark">{visit.patient_name || visit.patient}</h6>
                        <span className="badge bg-light text-primary border font-monospace mt-1">
                          {visit.health_id || visit.patient_uid || 'N/A'}
                        </span>
                      </div>
                      <span className="badge bg-light text-dark border font-monospace">
                        {visit.time || 'Walk-in'}
                      </span>
                    </div>

                    <div className="small text-muted mb-2">
                      <div><i className="bi bi-person-badge me-1"></i> Doctor: <strong>{visit.doctor_name || visit.doctor}</strong></div>
                      <div><i className="bi bi-chat-left-text me-1"></i> Reason: {visit.reason || 'General Visit'}</div>
                    </div>

                    <div className="p-2 bg-light rounded-2 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="fw-bold text-muted extra-small text-uppercase">Vitals Status</small>
                        {hasVitals ? (
                          <span className="badge bg-success-subtle text-success extra-small rounded-pill">Recorded</span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning extra-small rounded-pill">Awaiting</span>
                        )}
                      </div>
                      {hasVitals ? (
                        <div className="font-monospace extra-small text-dark">
                          {visit.height ? `H:${visit.height} ` : ''}
                          {visit.weight ? `W:${visit.weight} ` : ''}
                          {visit.blood_pressure ? `BP:${visit.blood_pressure}` : ''}
                        </div>
                      ) : (
                        <small className="text-muted extra-small">No vital signs logged yet</small>
                      )}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-teal text-white flex-grow-1 rounded-pill fw-bold"
                        style={{ backgroundColor: '#0d9488' }}
                        onClick={() => handleOpenRecordVitals(visit)}
                      >
                        <i className={`bi bi-${hasVitals ? 'pencil-square' : 'plus-circle'} me-1`}></i>
                        {hasVitals ? 'Edit Vitals' : 'Record Vitals'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                        onClick={() => handleOpenHistory(visit)}
                        title="History"
                      >
                        <i className="bi bi-clock-history"></i>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* CHANGE PASSWORD & SECURITY MODAL FOR NURSE */}
      {showSecurityModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header text-white p-3.5 px-4" style={{ backgroundColor: '#0d9488' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-lock-fill fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Change Password & Security</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSecurityModal(false)}
                ></button>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="modal-body p-4">
                  <p className="text-muted small mb-3">
                    Update your nurse login credentials and configure your security recovery question for account protection.
                  </p>

                  {passwordMsg && (
                    <div className={`alert alert-${passwordMsg.type} py-2 px-3 small rounded-3 mb-3`}>
                      <i className={`bi bi-${passwordMsg.type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'} me-1.5`}></i>
                      {passwordMsg.text}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary mb-1">Current Password *</label>
                    <input
                      type="password"
                      className="form-control rounded-3 py-2"
                      placeholder="Enter current password"
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label small fw-bold text-secondary mb-1">New Password *</label>
                      <input
                        type="password"
                        className="form-control rounded-3 py-2"
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-bold text-secondary mb-1">Confirm New Password *</label>
                      <input
                        type="password"
                        className="form-control rounded-3 py-2"
                        placeholder="Re-type new password"
                        required
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary mb-1">Security Recovery Question *</label>
                    <select
                      className="form-select rounded-3 py-2"
                      required
                      value={passwordForm.recovery_question}
                      onChange={(e) => setPasswordForm({ ...passwordForm, recovery_question: e.target.value })}
                    >
                      {RECOVERY_QUESTIONS.map((q, idx) => (
                        <option key={idx} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold text-secondary mb-1">Security Answer *</label>
                    <input
                      type="text"
                      className="form-control rounded-3 py-2"
                      placeholder="Your secret answer (used for password reset)"
                      required
                      value={passwordForm.recovery_answer}
                      onChange={(e) => setPasswordForm({ ...passwordForm, recovery_answer: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer bg-light p-3 px-4 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-3"
                    onClick={() => setShowSecurityModal(false)}
                    disabled={passwordSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-teal text-white rounded-pill px-4 fw-bold shadow-sm"
                    style={{ backgroundColor: '#0d9488' }}
                    disabled={passwordSubmitting}
                  >
                    {passwordSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-check me-1.5"></i>
                        Update Password & Security
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RECORD VITALS MODAL */}
      {showVitalsModal && selectedVisit && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '580px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header text-white p-3.5 px-4" style={{ backgroundColor: '#0d9488' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-heart-pulse-fill fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Pre-Consultation Vitals Intake</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowVitalsModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSaveVitals}>
                <div className="modal-body p-4">
                  {/* Patient Info Card */}
                  <div className="bg-light rounded-3 p-3 mb-3.5 border">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="fw-bold text-dark mb-0">{selectedVisit.patient_name || selectedVisit.patient}</h6>
                      <span className="badge bg-primary-subtle text-primary font-monospace px-2 py-0.5 rounded-pill">
                        {selectedVisit.health_id || selectedVisit.patient_uid}
                      </span>
                    </div>
                    <div className="small text-muted d-flex flex-wrap gap-3">
                      <span><strong>Gender:</strong> {selectedVisit.gender || 'N/A'}</span>
                      {selectedVisit.date_of_birth && <span><strong>DOB:</strong> {selectedVisit.date_of_birth}</span>}
                      {selectedVisit.blood_group && <span><strong>Blood:</strong> {selectedVisit.blood_group}</span>}
                      <span><strong>Doctor:</strong> {selectedVisit.doctor_name || selectedVisit.doctor}</span>
                    </div>
                  </div>

                  {vitalsError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3 rounded-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i> {vitalsError}
                    </div>
                  )}

                  {/* 3 Core Vitals Inputs */}
                  <div className="row g-3">
                    {/* Height */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold mb-1">
                        <i className="bi bi-rulers me-1 text-teal" style={{ color: '#0d9488' }}></i>
                        Height (cm)
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          step="0.1"
                          min="30"
                          max="250"
                          className="form-control"
                          placeholder="e.g. 175"
                          value={vitalsForm.height.replace(/[^0-9.]/g, '')}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value })}
                        />
                        <span className="input-group-text bg-light text-muted small">cm</span>
                      </div>
                      <div className="form-text extra-small">Standing height</div>
                    </div>

                    {/* Weight */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold mb-1">
                        <i className="bi bi-speedometer2 me-1 text-teal" style={{ color: '#0d9488' }}></i>
                        Weight (kg)
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="300"
                          className="form-control"
                          placeholder="e.g. 70"
                          value={vitalsForm.weight.replace(/[^0-9.]/g, '')}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                        />
                        <span className="input-group-text bg-light text-muted small">kg</span>
                      </div>
                      <div className="form-text extra-small">Body weight</div>
                    </div>

                    {/* Blood Pressure */}
                    <div className="col-12">
                      <label className="form-label small fw-bold mb-1">
                        <i className="bi bi-activity me-1 text-danger"></i>
                        Blood Pressure (BP)
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control font-monospace"
                          placeholder="e.g. 120/80"
                          value={vitalsForm.blood_pressure.replace(/mmHg/i, '').trim()}
                          onChange={(e) => setVitalsForm({ ...vitalsForm, blood_pressure: e.target.value })}
                        />
                        <span className="input-group-text bg-light text-muted small">mmHg</span>
                      </div>
                      <div className="form-text extra-small">Format: Systolic / Diastolic (e.g. 120/80)</div>
                    </div>
                  </div>

                  {/* Calculated BMI Preview */}
                  {bmiPreview && (
                    <div className="mt-3.5 p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-calculator text-muted fs-5"></i>
                        <div>
                          <div className="small fw-bold text-dark">Calculated BMI Preview</div>
                          <div className="extra-small text-muted">Body Mass Index for this visit</div>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="fs-5 fw-bold font-monospace text-dark">{bmiPreview.value}</span>{' '}
                        <small className="text-muted">kg/m²</small>
                        <div className={`badge rounded-pill extra-small px-2 py-0.5 mt-0.5 ${bmiPreview.badgeClass}`}>{bmiPreview.category}</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-2.5 rounded-3 small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    <i className="bi bi-info-circle-fill me-1.5"></i>
                    Vitals recorded here are saved directly into the patient's visit file and instantly visible to the examining doctor.
                  </div>
                </div>

                <div className="modal-footer bg-light p-3 px-4 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-3"
                    onClick={() => setShowVitalsModal(false)}
                    disabled={savingVitals}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-teal text-white rounded-pill px-4 fw-bold shadow-sm"
                    style={{ backgroundColor: '#0d9488' }}
                    disabled={savingVitals}
                  >
                    {savingVitals ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1.5" role="status"></span>
                        Saving Vitals...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1.5"></i>
                        Save Vitals for Visit
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VITALS HISTORY MODAL */}
      {showHistoryModal && historyPatient && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-teal text-white p-3.5 px-4" style={{ backgroundColor: '#0d9488' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history fs-5"></i>
                  <h5 className="modal-title fw-bold mb-0">Historical Patient Vitals Records</h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowHistoryModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">{historyPatient.patient_name || historyPatient.patient}</h6>
                    <small className="text-muted">Global Health ID: <code>{historyPatient.health_id || historyPatient.patient_uid}</code></small>
                  </div>
                  <span className="badge bg-secondary-subtle text-secondary px-3 py-1.5 rounded-pill">
                    {vitalsHistoryList.length} Historical Records
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-teal" role="status" style={{ color: '#0d9488' }}></div>
                    <p className="text-muted small mt-2">Loading previous clinical vitals...</p>
                  </div>
                ) : vitalsHistoryList.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-file-earmark-medical text-muted fs-1 mb-2 d-block"></i>
                    <h6 className="fw-semibold text-dark">No previous vitals found</h6>
                    <p className="text-muted small mb-0">No historical vitals have been recorded for this patient yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle">
                      <thead className="table-light text-muted extra-small text-uppercase">
                        <tr>
                          <th>Visit Date</th>
                          <th>Height</th>
                          <th>Weight</th>
                          <th>Blood Pressure</th>
                          <th>Doctor / Hospital</th>
                          <th>Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vitalsHistoryList.map((h, idx) => (
                          <tr key={idx}>
                            <td className="fw-semibold text-dark font-monospace">{h.recorded_at ? h.recorded_at.substring(0, 10) : 'N/A'}</td>
                            <td><span className="badge bg-light text-dark border font-monospace">{h.height || '—'}</span></td>
                            <td><span className="badge bg-light text-dark border font-monospace">{h.weight || '—'}</span></td>
                            <td><span className="badge bg-danger-subtle text-danger font-monospace">{h.blood_pressure || '—'}</span></td>
                            <td>
                              <div className="small fw-semibold text-dark">{h.doctor_name}</div>
                              <small className="text-muted extra-small">{h.hospital_name}</small>
                            </td>
                            <td className="small text-muted">{h.recorded_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light p-3">
                <button
                  type="button"
                  className="btn btn-secondary rounded-pill px-4"
                  onClick={() => setShowHistoryModal(false)}
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
