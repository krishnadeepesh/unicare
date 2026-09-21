import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000/api/super-admin';

export default function NurseDashboardPage({ user, onLogout, onNavigateHome }) {
  const hospitalName = user?.hospital_name || user?.hospital?.hospital_name || 'Partner Hospital';
  const nurseName = user?.name || user?.user_name || 'Nurse';

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'recorded'
  const [message, setMessage] = useState(null);

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
    let badgeClass = 'text-success';
    if (bmi < 18.5) { category = 'Underweight'; badgeClass = 'text-warning'; }
    else if (bmi >= 25 && bmi < 30) { category = 'Overweight'; badgeClass = 'text-warning'; }
    else if (bmi >= 30) { category = 'Obesity'; badgeClass = 'text-danger'; }
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
        showToast(`Pre-consultation vitals recorded successfully for ${selectedVisit.patient_name}!`);
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

  // Filtered visits
  const filteredVisits = visits.filter(v => {
    const q = searchTerm.toLowerCase();
    const matchQuery = !q ||
      (v.patient_name && v.patient_name.toLowerCase().includes(q)) ||
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
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Top Clinical Header */}
      <header className="bg-teal text-white py-3 px-4 shadow-sm d-flex flex-wrap align-items-center justify-content-between gap-3" style={{ backgroundColor: '#0d9488' }}>
        <div className="d-flex align-items-center gap-3">
          <div className="bg-white text-teal rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '44px', height: '44px', color: '#0d9488' }}>
            <i className="bi bi-heart-pulse-fill fs-4"></i>
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="fw-bold mb-0 text-white">{nurseName}</h5>
              <span className="badge bg-white bg-opacity-25 rounded-pill px-2.5 py-0.5 text-white extra-small fw-semibold">
                Nurse / Clinical Staff
              </span>
            </div>
            <small className="text-white-50 d-block mt-0.5">
              <i className="bi bi-hospital me-1"></i> {hospitalName} — Pre-Consultation Vitals Desk
            </small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => onNavigateHome && onNavigateHome()}
            className="btn btn-outline-light btn-sm rounded-pill px-3 py-1.5 fw-semibold"
            title="Return to Home"
          >
            <i className="bi bi-house-door me-1"></i> Home
          </button>
          <button
            onClick={onLogout}
            className="btn btn-light text-danger btn-sm rounded-pill px-3 py-1.5 fw-semibold border shadow-sm"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Sign Out
          </button>
        </div>
      </header>

      {/* Main Clinical Body */}
      <main className="container-fluid py-4 px-md-5 flex-grow-1" style={{ maxWidth: '1440px' }}>
        {/* Toast Alert */}
        {message && (
          <div className={`alert alert-${message.type} alert-dismissible fade show rounded-3 shadow-sm mb-4`} role="alert">
            <i className={`bi bi-${message.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2`}></i>
            {message.text}
            <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {/* Clinical Summary Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="card border-0 rounded-4 shadow-sm bg-white p-3.5 h-100 border-start border-4 border-primary">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Today's Patient Visits</span>
                  <h2 className="display-6 fw-bold mb-0 mt-1 text-dark">{totalVisits}</h2>
                </div>
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
                  <i className="bi bi-people-fill fs-3"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border-0 rounded-4 shadow-sm bg-white p-3.5 h-100 border-start border-4 border-warning">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Awaiting Pre-Consult Vitals</span>
                  <h2 className="display-6 fw-bold mb-0 mt-1 text-warning">{pendingCount}</h2>
                </div>
                <div className="bg-warning bg-opacity-10 text-warning rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
                  <i className="bi bi-hourglass-split fs-3"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border-0 rounded-4 shadow-sm bg-white p-3.5 h-100 border-start border-4" style={{ borderLeftColor: '#0d9488' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Vitals Recorded & Verified</span>
                  <h2 className="display-6 fw-bold mb-0 mt-1" style={{ color: '#0d9488' }}>{recordedCount}</h2>
                </div>
                <div className="rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                  <i className="bi bi-check2-circle fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Queue Section */}
        <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
          <div className="card-header bg-white border-bottom p-3.5 px-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div>
              <h5 className="fw-bold mb-0 text-dark">
                <i className="bi bi-clipboard2-pulse me-2" style={{ color: '#0d9488' }}></i>
                Pre-Consultation Patient Visits Queue
              </h5>
              <small className="text-muted">
                Record vital signs (Height, Weight, BP) for today's arriving patients prior to doctor consultation.
              </small>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {/* Search Bar */}
              <div className="input-group input-group-sm" style={{ minWidth: '260px' }}>
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Search patient name, Health ID, doctor..."
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
                  className={`btn ${filterStatus === 'all' ? 'btn-teal text-white fw-semibold' : 'btn-outline-secondary'}`}
                  style={filterStatus === 'all' ? { backgroundColor: '#0d9488' } : {}}
                  onClick={() => setFilterStatus('all')}
                >
                  All ({totalVisits})
                </button>
                <button
                  type="button"
                  className={`btn ${filterStatus === 'pending' ? 'btn-warning text-dark fw-semibold' : 'btn-outline-secondary'}`}
                  onClick={() => setFilterStatus('pending')}
                >
                  Awaiting Vitals ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`btn ${filterStatus === 'recorded' ? 'btn-success text-white fw-semibold' : 'btn-outline-secondary'}`}
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
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>

          {/* Visits Table */}
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Time & Slot</th>
                  <th>Patient Details</th>
                  <th>Health ID</th>
                  <th>Assigned Doctor</th>
                  <th>Clinical Reason</th>
                  <th>Vitals Status</th>
                  <th className="pe-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-teal" role="status" style={{ color: '#0d9488' }}></div>
                      <p className="text-muted small mt-2 mb-0">Loading patient visit queue...</p>
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
                      <tr key={visit.appointment_id || visit.id} className={hasVitals ? '' : 'table-warning bg-opacity-25'}>
                        <td className="ps-4">
                          <div className="fw-bold text-dark">{visit.time || 'Walk-in'}</div>
                          <small className="text-muted">{visit.date || 'Today'}</small>
                        </td>

                        <td>
                          <div className="fw-bold text-dark">{visit.patient_name || visit.patient}</div>
                          <small className="text-muted">
                            {visit.gender || 'N/A'} {visit.date_of_birth ? `• DOB: ${visit.date_of_birth}` : ''} {visit.blood_group ? `• ${visit.blood_group}` : ''}
                          </small>
                        </td>

                        <td>
                          <span className="badge bg-light text-primary border font-monospace px-2.5 py-1 rounded-pill">
                            {visit.health_id || visit.patient_uid || 'N/A'}
                          </span>
                        </td>

                        <td>
                          <div className="fw-semibold text-dark">{visit.doctor_name || visit.doctor || 'Dr. Assigned'}</div>
                          <small className="text-muted">{visit.department_name || visit.department || 'General Medicine'}</small>
                        </td>

                        <td>
                          <span className="small text-muted text-truncate d-inline-block" style={{ maxWidth: '200px' }} title={visit.reason}>
                            {visit.reason || 'General Consultation'}
                          </span>
                        </td>

                        <td>
                          {hasVitals ? (
                            <div>
                              <span className="badge bg-success-subtle text-success px-2.5 py-1 rounded-pill fw-semibold">
                                <i className="bi bi-check-circle-fill me-1"></i> Vitals Recorded
                              </span>
                              <div className="extra-small text-muted mt-1 font-monospace">
                                {visit.height ? `H: ${visit.height} ` : ''}
                                {visit.weight ? `W: ${visit.weight} ` : ''}
                                {visit.blood_pressure ? `BP: ${visit.blood_pressure}` : ''}
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
                              className={`btn btn-sm rounded-pill fw-semibold px-3 ${hasVitals ? 'btn-outline-teal' : 'btn-teal text-white shadow-sm'}`}
                              style={!hasVitals ? { backgroundColor: '#0d9488' } : {}}
                              onClick={() => handleOpenRecordVitals(visit)}
                            >
                              <i className={`bi bi-${hasVitals ? 'pencil-square' : 'plus-circle'} me-1`}></i>
                              {hasVitals ? 'Edit Vitals' : 'Record Vitals'}
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
        </div>
      </main>

      {/* RECORD VITALS MODAL */}
      {showVitalsModal && selectedVisit && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '580px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header text-white p-3.5 px-4" style={{ backgroundColor: '#0d9488' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-heart-pulse-fill fs-5"></i>
                  <h5 className="modal-title fw-bold">Pre-Consultation Vitals Recording</h5>
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
                    <div className="alert alert-danger py-2 px-3 small mb-3">
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
                      <div className="form-text extra-small">Standard standing height</div>
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
                      <div className="form-text extra-small">Weight recorded on clinical scale</div>
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
                        <div className={`extra-small fw-semibold ${bmiPreview.badgeClass}`}>{bmiPreview.category}</div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-2.5 rounded-3 bg-teal bg-opacity-10 text-teal small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    <i className="bi bi-info-circle-fill me-1.5"></i>
                    Vitals recorded here are saved specifically for this patient's visit. The consulting doctor will view these vitals directly without needing to re-enter them.
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
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header bg-primary text-white p-3.5 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history fs-5"></i>
                  <h5 className="modal-title fw-bold">Historical Patient Vitals Records</h5>
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
                    <div className="spinner-border text-primary" role="status"></div>
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
                      <thead className="table-light text-muted small text-uppercase">
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
                            <td className="fw-semibold text-dark">{h.recorded_at ? h.recorded_at.substring(0, 10) : 'N/A'}</td>
                            <td><span className="badge bg-light text-dark border font-monospace">{h.height || '—'}</span></td>
                            <td><span className="badge bg-light text-dark border font-monospace">{h.weight || '—'}</span></td>
                            <td><span className="badge bg-danger-subtle text-danger font-monospace">{h.blood_pressure || '—'}</span></td>
                            <td>
                              <div className="small fw-semibold">{h.doctor_name}</div>
                              <small className="text-muted">{h.hospital_name}</small>
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
