import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL as API } from '../apiConfig';

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

  // Tab & Lab Reports State
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'op_records' | 'ip_records' | 'history' | 'reports'
  const [labReportsList, setLabReportsList] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [labReportSearch, setLabReportSearch] = useState('');
  const [showLabReportModal, setShowLabReportModal] = useState(false);
  const [labReportSubmitting, setLabReportSubmitting] = useState(false);
  const [labReportForm, setLabReportForm] = useState({
    patient_id: '',
    patient_name: '',
    patient_uid: '',
    report_type: 'Blood Test',
    report_title: '',
    report_file: '',
    is_shared: false,
  });

  // Outpatient & Inpatient Records State
  const [opRecordsList, setOpRecordsList] = useState([]);
  const [ipRecordsList, setIpRecordsList] = useState([]);
  const [loadingOpRecords, setLoadingOpRecords] = useState(false);
  const [loadingIpRecords, setLoadingIpRecords] = useState(false);

  // Filtering states for Clinical Records
  const [recordsDateFilter, setRecordsDateFilter] = useState('');
  const [recordsDoctorFilter, setRecordsDoctorFilter] = useState('');
  const [recordsSearchTerm, setRecordsSearchTerm] = useState('');
  const [ipStatusFilter, setIpStatusFilter] = useState('all'); // 'all' | 'Admitted' | 'Discharged'

  // Patient History State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySelectedPatient, setHistorySelectedPatient] = useState(null);
  const [patientHistoryTimeline, setPatientHistoryTimeline] = useState([]);
  const [loadingPatientHistory, setLoadingPatientHistory] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // 'all' | 'OP' | 'IP'

  // Clinical Record / Admission Inspection Modal
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionData, setInspectionData] = useState(null);
  const [inspectionType, setInspectionType] = useState('visit'); // 'visit' | 'admission'
  const [loadingInspection, setLoadingInspection] = useState(false);

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

  // Load Hospital Lab Reports
  const loadLabReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${API}/lab-reports/`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setLabReportsList(data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching lab reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // Load Outpatient Records (Date sorted, newest first)
  const loadOpRecords = async () => {
    setLoadingOpRecords(true);
    try {
      const q = new URLSearchParams();
      q.append('type', 'OP');
      if (recordsDateFilter) q.append('date', recordsDateFilter);
      if (recordsDoctorFilter) q.append('doctor_id', recordsDoctorFilter);
      if (recordsSearchTerm) q.append('search', recordsSearchTerm);
      const res = await fetch(`${API}/clinical-records/?${q.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setOpRecordsList(data.op_records || []);
      }
    } catch (err) {
      console.error('Error fetching OP records:', err);
    } finally {
      setLoadingOpRecords(false);
    }
  };

  // Load Inpatient Records (Date sorted, active vs discharged)
  const loadIpRecords = async () => {
    setLoadingIpRecords(true);
    try {
      const q = new URLSearchParams();
      q.append('type', 'IP');
      if (recordsDateFilter) q.append('date', recordsDateFilter);
      if (recordsDoctorFilter) q.append('doctor_id', recordsDoctorFilter);
      if (recordsSearchTerm) q.append('search', recordsSearchTerm);
      if (ipStatusFilter && ipStatusFilter !== 'all') q.append('status', ipStatusFilter);
      const res = await fetch(`${API}/clinical-records/?${q.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setIpRecordsList(data.ip_records || []);
      }
    } catch (err) {
      console.error('Error fetching IP records:', err);
    } finally {
      setLoadingIpRecords(false);
    }
  };

  // Search & Load Patient History (Chronological timeline of OP & IP visits)
  const handleSearchPatientHistory = async (targetUid) => {
    const term = (targetUid || historySearchTerm).trim();
    if (!term) return;
    setLoadingPatientHistory(true);
    try {
      const res = await fetch(`${API}/patient-history/?health_id=${encodeURIComponent(term)}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setHistorySelectedPatient(data.patient || { name: term, health_id: term });
        setPatientHistoryTimeline(data.timeline || data.history || []);
      } else {
        showToast(data.message || 'Patient record not found.', 'danger');
        setHistorySelectedPatient(null);
        setPatientHistoryTimeline([]);
      }
    } catch (err) {
      showToast('Error retrieving patient clinical history.', 'danger');
    } finally {
      setLoadingPatientHistory(false);
    }
  };

  // Open Record or Admission Inspection Modal
  const handleOpenInspection = async (item, type = 'visit') => {
    setInspectionType(type);
    setShowInspectionModal(true);
    if (type === 'admission') {
      setLoadingInspection(true);
      try {
        const res = await fetch(`${API}/admissions/detail/?admission_id=${item.admission_id}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          setInspectionData(data);
        } else {
          setInspectionData({ admission: item, visits: [], prescriptions: [], lab_reports: [] });
        }
      } catch (err) {
        setInspectionData({ admission: item, visits: [], prescriptions: [], lab_reports: [] });
      } finally {
        setLoadingInspection(false);
      }
    } else {
      setInspectionData(item);
      setLoadingInspection(false);
    }
  };

  useEffect(() => {
    loadVisitsQueue();
    loadProfile();
    loadLabReports();
    loadOpRecords();
    loadIpRecords();
  }, []);

  const showToast = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Open Lab Report Modal for patient
  const handleOpenLabReportModal = (visit = null) => {
    if (visit) {
      setLabReportForm({
        patient_id: visit.patient_id || visit.health_id,
        patient_name: visit.patient_name || visit.patient || '',
        patient_uid: visit.health_id || visit.patient_uid || '',
        report_type: 'Blood Test',
        report_title: '',
        report_file: '',
        is_shared: false,
      });
    } else {
      const defaultPatient = visits[0];
      setLabReportForm({
        patient_id: defaultPatient?.patient_id || defaultPatient?.health_id || '',
        patient_name: defaultPatient?.patient_name || defaultPatient?.patient || '',
        patient_uid: defaultPatient?.health_id || defaultPatient?.patient_uid || '',
        report_type: 'Blood Test',
        report_title: '',
        report_file: '',
        is_shared: false,
      });
    }
    setShowLabReportModal(true);
  };

  // Save Diagnostic Lab Report (Nurse)
  const handleSaveLabReport = async (e) => {
    e.preventDefault();
    if (!labReportForm.patient_id) {
      showToast('Please select or enter a Patient ID / Health ID.', 'danger');
      return;
    }
    setLabReportSubmitting(true);
    try {
      const res = await fetch(`${API}/lab-reports/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          patient_id: labReportForm.patient_id,
          report_type: labReportForm.report_type,
          report_title: labReportForm.report_title,
          report_file: labReportForm.report_file,
          is_shared: labReportForm.is_shared !== undefined ? labReportForm.is_shared : false,
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Diagnostic Report ${data.report?.lab_report_uid || 'LAB001'} uploaded successfully!`, 'success');
        setShowLabReportModal(false);
        setLabReportForm({
          patient_id: '',
          patient_name: '',
          patient_uid: '',
          report_type: 'Blood Test',
          report_title: '',
          report_file: '',
          is_shared: false,
        });
        loadLabReports();
      } else {
        showToast(data.message || 'Failed to upload diagnostic report.', 'danger');
      }
    } catch (err) {
      showToast('Error uploading diagnostic report.', 'danger');
    } finally {
      setLabReportSubmitting(false);
    }
  };

  // Toggle Sharing of Lab Report Across Network vs Local to Facility
  const handleToggleLabReportShare = async (reportId, currentShared) => {
    try {
      const res = await fetch(`${API}/lab-reports/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          report_id: reportId,
          is_shared: !currentShared
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLabReportsList(prev => prev.map(r => r.report_id === reportId ? { ...r, is_shared: !currentShared, report_share_flag: !currentShared ? 1 : 0 } : r));
        showToast(data.message || 'Report sharing status updated.', 'success');
      } else {
        showToast(data.message || 'Failed to update sharing.', 'danger');
      }
    } catch (err) {
      showToast('Error updating report sharing.', 'danger');
    }
  };

  // Delete Diagnostic Lab Report (Nurse)
  const handleDeleteLabReport = async (reportId, reportUid) => {
    if (!window.confirm(`Are you sure you want to delete report ${reportUid}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API}/lab-reports/?report_id=${reportId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setLabReportsList(prev => prev.filter(r => r.report_id !== reportId));
        showToast(`Report ${reportUid} deleted successfully.`, 'success');
      } else {
        showToast(data.message || 'Failed to delete report.', 'danger');
      }
    } catch (err) {
      showToast('Error communicating with server while deleting report.', 'danger');
    }
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
    <div className="d-flex min-vh-100 bg-light" style={{ fontFamily: 'var(--font-body)' }}>
      {/* FIXED LEFT SIDEBAR (Standard UniCare clinical sidebar like Doctor & Staff) */}
      <aside className="unicare-sidebar">
        {/* Brand Header */}
        <div 
          className="sidebar-brand-box" 
          onClick={() => onNavigateHome && onNavigateHome()} 
          title="Return to UniCare Homepage"
          style={{ cursor: 'pointer' }}
        >
          <div className="sidebar-brand-icon">
            <i className="bi bi-heart-pulse"></i>
          </div>
          <div>
            <h6 className="fw-bold mb-0 text-slate-800" style={{ fontSize: '1.1rem', letterSpacing: '0.3px' }}>UniCare</h6>
            <small className="text-teal fw-bold extra-small" style={{ fontSize: '0.74rem', letterSpacing: '0.6px' }}>CLINICAL STATION</small>
          </div>
        </div>

        {/* Nurse & Hospital Context Card */}
        <div className="sidebar-context-card position-relative" ref={profileMenuRef}>
          <button
            type="button"
            className="btn btn-link p-0 text-start text-decoration-none w-100 border-0"
            aria-label="nurse menu"
            onClick={() => setShowProfileMenu(prev => !prev)}
            title="Account & Security Settings"
          >
            <div className="d-flex align-items-center justify-content-between">
              <div className="overflow-hidden me-2">
                <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.95rem' }}>{nurseName}</div>
                <small className="text-muted d-block text-truncate" style={{ fontSize: '0.8rem' }}>Clinical Ward Nurse</small>
              </div>
              <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-xs" style={{ width: '32px', height: '32px', backgroundColor: '#0d9488', fontSize: '0.85rem' }}>
                  {nurseName ? nurseName.charAt(0).toUpperCase() : 'N'}
                </div>
                <i className={`bi bi-chevron-${showProfileMenu ? 'up' : 'down'} text-muted extra-small`}></i>
              </div>
            </div>
          </button>

          <div className="badge bg-white text-teal border px-2.5 py-1.5 rounded-2 font-monospace w-100 text-truncate text-start mt-2" style={{ color: '#0d9488', fontSize: '0.75rem' }}>
            🏥 {hospitalName}
          </div>

          {showProfileMenu && (
            <div className="bg-white rounded-3 shadow border p-2 mt-2 position-absolute start-0 end-0 z-3" style={{ top: '100%' }}>
              <div className="p-2 border-bottom mb-1 bg-light rounded-2">
                <div className="fw-bold text-dark small text-truncate">{nurseName}</div>
                <small className="text-muted extra-small d-block text-truncate">{profile?.email || user?.email || 'nurse@unicare.com'}</small>
              </div>
              <button
                type="button"
                className="dropdown-item rounded-2 py-1.5 px-2.5 small d-flex align-items-center gap-2 text-dark"
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowSecurityModal(true);
                }}
              >
                <i className="bi bi-shield-lock text-teal" style={{ color: '#0d9488' }}></i>
                Change Password & Security Settings
              </button>
              {onNavigateHome && (
                <button
                  type="button"
                  className="dropdown-item rounded-2 py-1.5 px-2.5 small d-flex align-items-center gap-2 text-secondary"
                  onClick={() => onNavigateHome()}
                >
                  <i className="bi bi-house"></i>
                  Return to Homepage
                </button>
              )}
              <div className="dropdown-divider my-1"></div>
              <button
                type="button"
                className="dropdown-item rounded-2 py-1.5 px-2.5 small d-flex align-items-center gap-2 text-danger fw-semibold"
                onClick={onLogout}
              >
                <i className="bi bi-box-arrow-right"></i>
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation List */}
        <nav className="d-flex flex-column mb-auto">
          <div className="sidebar-section-title">
            Clinical Care & Ward
          </div>

          {[
            { id: 'queue', icon: 'bi-clipboard2-pulse', label: 'Pre-Consult Intake Queue', count: pendingCount, onClick: () => setActiveTab('queue') },
            { id: 'op_records', icon: 'bi-journal-medical', label: 'Outpatient Records (OP)', count: opRecordsList.length, onClick: () => { setActiveTab('op_records'); loadOpRecords(); } },
            { id: 'ip_records', icon: 'bi-hospital', label: 'Inpatient Records (IP)', count: ipRecordsList.length, onClick: () => { setActiveTab('ip_records'); loadIpRecords(); } },
            { id: 'history', icon: 'bi-clock-history', label: 'Patient Clinical History', onClick: () => setActiveTab('history') },
            { id: 'reports', icon: 'bi-file-earmark-medical', label: 'Diagnostic & Lab Reports', count: labReportsList.length, onClick: () => { setActiveTab('reports'); loadLabReports(); } },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.onClick}
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

        {/* Sidebar Footer Sign Out */}
        <button
          type="button"
          onClick={onLogout}
          className="sidebar-logout-btn"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Sign Out</span>
        </button>
      </aside>

      {/* MAIN CONTENT AREA (Single Left Sidebar layout) */}
      <main className="flex-grow-1 overflow-auto bg-light p-3 p-md-4 min-vh-100">
        <div className="container-fluid p-0 flex-grow-1" style={{ maxWidth: '1440px' }}>
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
                type="button"
                className="btn btn-teal text-white btn-sm fw-bold px-3 text-nowrap rounded-pill shadow-sm"
                style={{ backgroundColor: '#0d9488' }}
                onClick={() => setShowSecurityModal(true)}
              >
                <i className="bi bi-key me-1"></i> Change Password & Recovery
              </button>
            </div>
          )}
        {/* Toast Alert */}
        {message && (
          <div className={`alert alert-${message.type} alert-dismissible fade show rounded-4 shadow-sm mb-4 border-0 d-flex align-items-center`} role="alert">
            <i className={`bi bi-${message.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} fs-5 me-2.5 ${message.type === 'success' ? 'text-success' : 'text-danger'}`}></i>
            <div className="fw-medium">{message.text}</div>
            <button type="button" className="btn-close ms-auto" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {/* Clinical Metric Overview Cards (Clean & Professional Sizing) */}
        <div className="row g-3 mb-3.5">
          <div className="col-6 col-lg-3">
            <div
              className={`card rounded-3 p-3 h-100 bg-white transition-all cursor-pointer ${filterStatus === 'all' ? 'shadow-sm' : 'border-light-subtle shadow-xs'}`}
              style={{
                border: '1.5px solid ' + (filterStatus === 'all' ? '#0d9488' : '#e2e8f0'),
                boxShadow: filterStatus === 'all' ? '0 0 0 1px #0d9488, 0 2px 4px rgba(13,148,136,0.1)' : undefined,
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => setFilterStatus('all')}
              title="Click to view all queued visits"
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted extra-small fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Today's Visits Queue
                </span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: '#e0f2fe', color: '#0284c7' }}
                >
                  <i className="bi bi-people-fill fs-5"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="fw-bold mb-0 text-dark fs-3">{totalVisits}</h3>
                <span className="badge bg-light text-muted border rounded-pill extra-small">Queue</span>
              </div>
              <small className="text-muted extra-small d-block mt-1">Total queued consultations</small>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div
              className={`card rounded-3 p-3 h-100 bg-white transition-all cursor-pointer ${filterStatus === 'pending' ? 'shadow-sm' : 'border-light-subtle shadow-xs'}`}
              style={{
                border: '1.5px solid ' + (filterStatus === 'pending' ? '#f59e0b' : '#e2e8f0'),
                boxShadow: filterStatus === 'pending' ? '0 0 0 1px #f59e0b, 0 2px 4px rgba(245,158,11,0.1)' : undefined,
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => setFilterStatus('pending')}
              title="Click to view visits needing vitals screening"
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted extra-small fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Awaiting Vitals
                </span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: '#fef3c7', color: '#d97706' }}
                >
                  <i className="bi bi-hourglass-split fs-5"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="fw-bold mb-0 text-warning fs-3">{pendingCount}</h3>
                {pendingCount > 0 && (
                  <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill extra-small">
                    Needs Intake
                  </span>
                )}
              </div>
              <small className="text-muted extra-small d-block mt-1">Patients waiting for screening</small>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div
              className={`card rounded-3 p-3 h-100 bg-white transition-all cursor-pointer ${filterStatus === 'recorded' ? 'shadow-sm' : 'border-light-subtle shadow-xs'}`}
              style={{
                border: '1.5px solid ' + (filterStatus === 'recorded' ? '#0d9488' : '#e2e8f0'),
                boxShadow: filterStatus === 'recorded' ? '0 0 0 1px #0d9488, 0 2px 4px rgba(13,148,136,0.1)' : undefined,
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => setFilterStatus('recorded')}
              title="Click to view visits with recorded vitals"
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted extra-small fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Vitals Recorded
                </span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: '#e6f4f1', color: '#0d9488' }}
                >
                  <i className="bi bi-check2-circle fs-5"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="fw-bold mb-0 fs-3" style={{ color: '#0d9488' }}>{recordedCount}</h3>
                <span className="badge bg-teal-subtle text-teal border border-teal-subtle rounded-pill extra-small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                  Ready
                </span>
              </div>
              <small className="text-muted extra-small d-block mt-1">Verified for doctor review</small>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div
              className={`card rounded-3 p-3 h-100 bg-white transition-all cursor-pointer ${activeTab === 'ip_records' ? 'shadow-sm' : 'border-light-subtle shadow-xs'}`}
              style={{
                border: '1.5px solid ' + (activeTab === 'ip_records' ? '#3b82f6' : '#e2e8f0'),
                boxShadow: activeTab === 'ip_records' ? '0 0 0 1px #3b82f6, 0 2px 4px rgba(59,130,246,0.1)' : undefined,
                transition: 'all 0.2s ease-in-out'
              }}
              onClick={() => {
                setActiveTab('ip_records');
                loadIpRecords();
              }}
              title="Click to view inpatient ward records"
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted extra-small fw-bold text-uppercase tracking-wider" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                  Ward Inpatients
                </span>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '38px', height: '38px', backgroundColor: '#eff6ff', color: '#3b82f6' }}
                >
                  <i className="bi bi-hospital fs-5"></i>
                </div>
              </div>
              <div className="d-flex align-items-baseline gap-2">
                <h3 className="fw-bold mb-0 text-primary fs-3">{ipRecordsList.filter(a => a.admission_status === 'Admitted').length}</h3>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill extra-small">
                  Admitted
                </span>
              </div>
              <small className="text-muted extra-small d-block mt-1">Active ward bed stays</small>
            </div>
          </div>
        </div>


        {/* Clinical Queue Section */}
        {activeTab === 'queue' && (
        <div className="card rounded-3 shadow-xs bg-white overflow-hidden border border-light-subtle">
          <div className="card-header bg-white border-bottom p-3 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
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
                              className="btn btn-outline-teal btn-sm rounded-pill px-2.5 d-flex align-items-center gap-1 extra-small fw-semibold"
                              style={{ color: '#0d9488', borderColor: '#0d9488' }}
                              onClick={() => handleOpenLabReportModal(visit)}
                              title="Upload or log diagnostic lab report"
                            >
                              <i className="bi bi-file-earmark-medical"></i>
                              <span>+ Report</span>
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
                  <div key={visit.appointment_id || visit.id} className="card rounded-3 p-3 shadow-xs bg-white border border-light-subtle">
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
                        className="btn btn-sm btn-outline-teal rounded-pill px-2.5 fw-semibold extra-small"
                        style={{ color: '#0d9488', borderColor: '#0d9488' }}
                        onClick={() => handleOpenLabReportModal(visit)}
                        title="Upload Diagnostic Report"
                      >
                        <i className="bi bi-file-earmark-medical me-1"></i>Report
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
        )}

        {/* Diagnostic & Lab Reports Section */}
        {activeTab === 'reports' && (
          <div className="card rounded-3 shadow-xs bg-white overflow-hidden border border-light-subtle">
            <div className="card-header bg-white border-bottom p-3 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-medical fs-5" style={{ color: '#0d9488' }}></i>
                  <h5 className="fw-bold mb-0 text-dark">Diagnostic & Laboratory Reports</h5>
                </div>
                <small className="text-muted">
                  Log clinical lab findings or review patient investigation reports for {hospitalName}.
                </small>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Search Bar */}
                <div className="input-group input-group-sm" style={{ minWidth: '240px' }}>
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search report, patient, category..."
                    value={labReportSearch}
                    onChange={(e) => setLabReportSearch(e.target.value)}
                  />
                  {labReportSearch && (
                    <button className="btn btn-light border-start-0" onClick={() => setLabReportSearch('')}>
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>

                <button
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                  onClick={loadLabReports}
                  title="Refresh Reports"
                >
                  <i className={`bi bi-arrow-clockwise ${loadingReports ? 'spin' : ''}`}></i>
                </button>

                <button
                  className="btn btn-teal text-white btn-sm rounded-pill px-3 fw-bold shadow-sm"
                  style={{ backgroundColor: '#0d9488' }}
                  onClick={() => handleOpenLabReportModal()}
                >
                  <i className="bi bi-cloud-arrow-up me-1"></i> Upload Test Report
                </button>
              </div>
            </div>

            {/* Desktop Reports Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted extra-small text-uppercase">
                  <tr>
                    <th className="ps-4">Report ID</th>
                    <th>Category</th>
                    <th>Report Title</th>
                    <th>Patient Name / Health ID</th>
                    <th>Date Uploaded</th>
                    <th>Lab Findings / Summary</th>
                    <th>Interoperability</th>
                    <th className="pe-4 text-end">Sharing Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReports ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="spinner-border text-teal" role="status" style={{ color: '#0d9488' }}></div>
                        <p className="text-muted small mt-2 mb-0">Loading diagnostic reports...</p>
                      </td>
                    </tr>
                  ) : labReportsList.filter(r => {
                      const q = labReportSearch.toLowerCase();
                      return !q ||
                        (r.report_title && r.report_title.toLowerCase().includes(q)) ||
                        (r.report_type && r.report_type.toLowerCase().includes(q)) ||
                        (r.patient_name && r.patient_name.toLowerCase().includes(q)) ||
                        (r.patient_uid && r.patient_uid.toLowerCase().includes(q)) ||
                        (r.health_id && r.health_id.toLowerCase().includes(q)) ||
                        (r.lab_report_uid && r.lab_report_uid.toLowerCase().includes(q));
                    }).length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="text-muted mb-2"><i className="bi bi-file-earmark-medical fs-1"></i></div>
                        <h6 className="fw-semibold text-dark">No diagnostic reports found</h6>
                        <p className="text-muted small mb-0">
                          {labReportSearch ? 'No reports match your search query.' : 'Click "Upload Test Report" to log patient lab results.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    labReportsList.filter(r => {
                      const q = labReportSearch.toLowerCase();
                      return !q ||
                        (r.report_title && r.report_title.toLowerCase().includes(q)) ||
                        (r.report_type && r.report_type.toLowerCase().includes(q)) ||
                        (r.patient_name && r.patient_name.toLowerCase().includes(q)) ||
                        (r.patient_uid && r.patient_uid.toLowerCase().includes(q)) ||
                        (r.health_id && r.health_id.toLowerCase().includes(q)) ||
                        (r.lab_report_uid && r.lab_report_uid.toLowerCase().includes(q));
                    }).map((r, idx) => (
                      <tr key={r.report_id || idx}>
                        <td className="ps-4 font-monospace fw-bold" style={{ color: '#0d9488' }}>
                          {r.lab_report_uid || r.id || `LAB${String(r.report_id || (idx + 1)).padStart(3, '0')}`}
                        </td>
                        <td>
                          <span className="badge bg-light text-primary border">{r.report_type}</span>
                        </td>
                        <td className="fw-bold text-dark">{r.report_title}</td>
                        <td>
                          <div className="fw-semibold text-dark small">{r.patient_name || 'Patient'}</div>
                          <small className="badge bg-light text-secondary border font-monospace extra-small">
                            {r.patient_uid || r.health_id || `PTA${r.patient_id}`}
                          </small>
                        </td>
                        <td className="small text-muted">{r.uploaded_at || 'Today'}</td>
                        <td className="small text-secondary" style={{ maxWidth: '240px' }}>
                          <span className="text-truncate d-block" title={r.report_file}>
                            {r.report_file || 'Normal parameters verified.'}
                          </span>
                        </td>
                        <td>
                          {r.is_shared ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 rounded-pill">
                              <i className="bi bi-globe me-1"></i>Shared Across Network
                            </span>
                          ) : (
                            <span className="badge bg-secondary-subtle text-secondary border px-2.5 py-1 rounded-pill">
                              <i className="bi bi-lock-fill me-1"></i>Local to Facility
                            </span>
                          )}
                        </td>
                        <td className="pe-4 text-end">
                          <div className="d-flex justify-content-end align-items-center gap-1.5">
                            <button
                              type="button"
                              className={`btn btn-sm rounded-pill px-3 fw-semibold ${r.is_shared ? 'btn-outline-secondary' : 'btn-outline-teal'}`}
                              style={!r.is_shared ? { color: '#0d9488', borderColor: '#0d9488' } : {}}
                              onClick={() => handleToggleLabReportShare(r.report_id, r.is_shared)}
                              title={r.is_shared ? 'Restrict this report to this hospital only' : 'Share report across partner network & patient portal'}
                            >
                              <i className={`bi ${r.is_shared ? 'bi-lock me-1' : 'bi-share me-1'}`}></i>
                              {r.is_shared ? 'Keep Local' : 'Share'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm rounded-circle p-1"
                              style={{ width: '30px', height: '30px' }}
                              onClick={() => handleDeleteLabReport(r.report_id, r.lab_report_uid || `LAB${r.report_id}`)}
                              title="Delete report"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outpatient Records (OP) Section */}
        {activeTab === 'op_records' && (
          <div className="card rounded-3 shadow-xs bg-white overflow-hidden border border-light-subtle">
            <div className="card-header bg-white border-bottom p-3 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-calendar2-check fs-5" style={{ color: '#0d9488' }}></i>
                  <h5 className="fw-bold mb-0 text-dark">Outpatient Clinical Records (OP)</h5>
                </div>
                <small className="text-muted">
                  Chronological records of outpatient consultations, screened vitals, doctor diagnoses, and prescriptions.
                </small>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Search Bar */}
                <div className="input-group input-group-sm" style={{ minWidth: '220px' }}>
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search patient, UPID..."
                    value={recordsSearchTerm}
                    onChange={(e) => setRecordsSearchTerm(e.target.value)}
                  />
                  {recordsSearchTerm && (
                    <button className="btn btn-light border-start-0" onClick={() => setRecordsSearchTerm('')}>
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>

                {/* Date Filter */}
                <input
                  type="date"
                  className="form-control form-control-sm bg-light"
                  style={{ width: '150px' }}
                  value={recordsDateFilter}
                  onChange={(e) => setRecordsDateFilter(e.target.value)}
                  title="Filter by visit date"
                />

                <button
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                  onClick={loadOpRecords}
                  title="Apply Filter & Refresh"
                >
                  <i className={`bi bi-arrow-clockwise ${loadingOpRecords ? 'spin' : ''}`}></i>
                </button>
              </div>
            </div>

            {/* Desktop Outpatient Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted extra-small text-uppercase">
                  <tr>
                    <th className="ps-4">Visit ID</th>
                    <th>Date & Time</th>
                    <th>Patient Name & Health ID</th>
                    <th>Consulting Doctor & Dept</th>
                    <th>Screened Vitals</th>
                    <th>Diagnosis / Clinical Finding</th>
                    <th>Prescriptions & Reports</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOpRecords ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-teal mb-2" role="status"></div>
                        <p className="text-muted small mb-0">Loading outpatient records...</p>
                      </td>
                    </tr>
                  ) : opRecordsList.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <i className="bi bi-folder2-open display-6 text-muted d-block mb-2"></i>
                        <h6 className="fw-bold text-dark mb-1">No Outpatient Records Found</h6>
                        <p className="text-muted small mb-0">No outpatient visits match your current search and date filters.</p>
                      </td>
                    </tr>
                  ) : (
                    opRecordsList.map((op) => (
                      <tr key={op.visit_id}>
                        <td className="ps-4">
                          <span className="badge bg-teal-subtle text-teal font-monospace px-2.5 py-1 rounded-pill" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                            {op.visit_uid || `VIS${String(op.visit_id).padStart(3, '0')}`}
                          </span>
                        </td>
                        <td>
                          <div className="small fw-semibold text-dark">{op.visit_date}</div>
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{op.patient_name}</div>
                          <div className="extra-small text-muted font-monospace">{op.health_id || op.patient_uid}</div>
                        </td>
                        <td>
                          <div className="small fw-semibold text-dark">{op.doctor_name}</div>
                          <div className="extra-small text-muted">{op.department_name}</div>
                        </td>
                        <td>
                          {op.vitals && (op.vitals.blood_pressure || op.vitals.weight || op.vitals.height) ? (
                            <div className="small">
                              {op.vitals.blood_pressure && <span className="badge bg-light text-dark border me-1">BP: {op.vitals.blood_pressure}</span>}
                              {op.vitals.weight && <span className="badge bg-light text-dark border me-1">{op.vitals.weight} kg</span>}
                              {op.vitals.bmi && <span className="badge bg-teal-subtle text-teal border extra-small">BMI: {op.vitals.bmi}</span>}
                            </div>
                          ) : (
                            <span className="text-muted extra-small">No vitals screened</span>
                          )}
                        </td>
                        <td>
                          <div className="small fw-bold text-teal" style={{ color: '#0d9488' }}>{op.diagnosis}</div>
                          {op.medical_notes && (
                            <div className="extra-small text-muted text-truncate" style={{ maxWidth: '220px' }}>
                              {op.medical_notes}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1.5 flex-wrap">
                            <span className="badge bg-light text-secondary border extra-small">
                              <i className="bi bi-capsule me-1"></i>{op.prescriptions_count} Rx
                            </span>
                            <span className="badge bg-light text-secondary border extra-small">
                              <i className="bi bi-file-earmark-medical me-1"></i>{op.lab_reports_count} Labs
                            </span>
                          </div>
                        </td>
                        <td className="text-end pe-4">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-teal rounded-pill px-3 fw-semibold"
                            style={{ borderColor: '#0d9488', color: '#0d9488' }}
                            onClick={() => handleOpenInspection(op, 'visit')}
                          >
                            <i className="bi bi-eye me-1"></i> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inpatient Records (IP) Section */}
        {activeTab === 'ip_records' && (
          <div className="card rounded-3 shadow-xs bg-white overflow-hidden border border-light-subtle">
            <div className="card-header bg-white border-bottom p-3 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-hospital fs-5" style={{ color: '#0d9488' }}></i>
                  <h5 className="fw-bold mb-0 text-dark">Inpatient Admission Records (IP)</h5>
                </div>
                <small className="text-muted">
                  Active inpatient stays, ward & bed assignments, clinical care rounds, and discharge summaries.
                </small>
              </div>

              <div className="d-flex flex-wrap align-items-center gap-2">
                {/* Status Filter */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${ipStatusFilter === 'all' ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                    style={ipStatusFilter === 'all' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                    onClick={() => { setIpStatusFilter('all'); }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`btn ${ipStatusFilter === 'Admitted' ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                    style={ipStatusFilter === 'Admitted' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                    onClick={() => { setIpStatusFilter('Admitted'); }}
                  >
                    Active Stays
                  </button>
                  <button
                    type="button"
                    className={`btn ${ipStatusFilter === 'Discharged' ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                    style={ipStatusFilter === 'Discharged' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                    onClick={() => { setIpStatusFilter('Discharged'); }}
                  >
                    Discharged
                  </button>
                </div>

                {/* Search Bar */}
                <div className="input-group input-group-sm" style={{ minWidth: '200px' }}>
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search patient, ward..."
                    value={recordsSearchTerm}
                    onChange={(e) => setRecordsSearchTerm(e.target.value)}
                  />
                  {recordsSearchTerm && (
                    <button className="btn btn-light border-start-0" onClick={() => setRecordsSearchTerm('')}>
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>

                {/* Date Filter */}
                <input
                  type="date"
                  className="form-control form-control-sm bg-light"
                  style={{ width: '150px' }}
                  value={recordsDateFilter}
                  onChange={(e) => setRecordsDateFilter(e.target.value)}
                  title="Filter by admission date"
                />

                <button
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                  onClick={loadIpRecords}
                  title="Refresh Inpatient Records"
                >
                  <i className={`bi bi-arrow-clockwise ${loadingIpRecords ? 'spin' : ''}`}></i>
                </button>
              </div>
            </div>

            {/* Desktop Inpatient Table */}
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light text-muted extra-small text-uppercase">
                  <tr>
                    <th className="ps-4">Admission ID</th>
                    <th>Status</th>
                    <th>Patient Name & Health ID</th>
                    <th>Attending Doctor & Dept</th>
                    <th>Ward / Bed Allocation</th>
                    <th>Admission & Discharge Dates</th>
                    <th>Clinical Care Summary</th>
                    <th>Admission Reason</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingIpRecords ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-teal mb-2" role="status"></div>
                        <p className="text-muted small mb-0">Loading inpatient admission files...</p>
                      </td>
                    </tr>
                  ) : ipRecordsList.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5">
                        <i className="bi bi-hospital display-6 text-muted d-block mb-2"></i>
                        <h6 className="fw-bold text-dark mb-1">No Inpatient Records Found</h6>
                        <p className="text-muted small mb-0">No inpatient stays match the selected status and date filters.</p>
                      </td>
                    </tr>
                  ) : (
                    ipRecordsList.map((ip) => (
                      <tr key={ip.admission_id}>
                        <td className="ps-4">
                          <span className="badge bg-primary-subtle text-primary font-monospace px-2.5 py-1 rounded-pill">
                            {ip.admission_uid || `ADM${String(ip.admission_id).padStart(3, '0')}`}
                          </span>
                        </td>
                        <td>
                          {ip.admission_status === 'Admitted' ? (
                            <span className="badge bg-success text-white px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 shadow-sm">
                              <span className="spinner-grow spinner-grow-sm" style={{ width: '7px', height: '7px' }}></span>
                              Active Stay
                            </span>
                          ) : (
                            <span className="badge bg-light text-secondary border px-2.5 py-1 rounded-pill">
                              Discharged
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="fw-bold text-dark">{ip.patient_name}</div>
                          <div className="extra-small text-muted font-monospace">{ip.health_id || ip.patient_uid}</div>
                        </td>
                        <td>
                          <div className="small fw-semibold text-dark">{ip.doctor_name}</div>
                          <div className="extra-small text-muted">{ip.department_name}</div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border fw-semibold">
                            <i className="bi bi-door-closed me-1"></i>{ip.ward_bed || 'General Ward'}
                          </span>
                        </td>
                        <td>
                          <div className="small fw-semibold text-dark">Admitted: {ip.admission_date}</div>
                          {ip.discharge_date && (
                            <div className="extra-small text-muted">Discharged: {ip.discharge_date}</div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex gap-1.5 flex-wrap">
                            <span className="badge bg-light text-dark border extra-small">
                              <i className="bi bi-activity me-1 text-teal"></i>{ip.visits_count} Rounds
                            </span>
                            <span className="badge bg-light text-dark border extra-small">
                              <i className="bi bi-capsule me-1"></i>{ip.prescriptions_count} Rx
                            </span>
                            <span className="badge bg-light text-dark border extra-small">
                              <i className="bi bi-file-earmark-medical me-1"></i>{ip.lab_reports_count} Labs
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }} title={ip.admission_reason}>
                            {ip.admission_reason || 'Inpatient Observation'}
                          </div>
                        </td>
                        <td className="text-end pe-4">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-teal rounded-pill px-3 fw-semibold"
                            style={{ borderColor: '#0d9488', color: '#0d9488' }}
                            onClick={() => handleOpenInspection(ip, 'admission')}
                          >
                            <i className="bi bi-folder2-open me-1"></i> View Chart
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Patient History Section (Chronological OP & IP Timeline) */}
        {activeTab === 'history' && (
          <div className="card rounded-3 shadow-xs bg-white overflow-hidden border border-light-subtle">
            <div className="card-header bg-white border-bottom p-3 px-3.5 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history fs-5" style={{ color: '#0d9488' }}></i>
                  <h5 className="fw-bold mb-0 text-dark">Comprehensive Patient Clinical History</h5>
                </div>
                <small className="text-muted">
                  Look up complete patient EHR timeline sorted chronologically with inpatient stays and outpatient consultations.
                </small>
              </div>

              {/* Search Patient Bar */}
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <div className="input-group input-group-sm" style={{ minWidth: '280px' }}>
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-person-search text-muted"></i></span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Enter Patient UPID e.g. PTA001 or Name..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchPatientHistory(); }}
                  />
                  <button
                    className="btn btn-teal text-white btn-sm px-3 fw-bold"
                    style={{ backgroundColor: '#0d9488' }}
                    onClick={() => handleSearchPatientHistory()}
                  >
                    Lookup
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 px-3.5">
              {historySelectedPatient ? (
                <div>
                  {/* Patient Demographics Banner */}
                  <div className="card rounded-3 p-3 bg-light-subtle mb-3 border border-light-subtle">
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h5 className="fw-bold text-dark mb-0">{historySelectedPatient.name}</h5>
                          <span className="badge bg-teal-subtle text-teal font-monospace px-2.5 py-1 rounded-pill" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                            {historySelectedPatient.patient_uid || historySelectedPatient.health_id}
                          </span>
                          {historySelectedPatient.allergies ? (
                            <span className="badge bg-danger text-white py-1 px-2.5 rounded-pill shadow-sm">
                              <i className="bi bi-exclamation-octagon-fill me-1"></i>Allergies: {historySelectedPatient.allergies}
                            </span>
                          ) : (
                            <span className="badge bg-light text-secondary border py-1 px-2 rounded-pill">
                              No Allergies Logged
                            </span>
                          )}
                        </div>
                        <div className="small text-muted d-flex flex-wrap gap-3 mt-1.5">
                          {historySelectedPatient.gender && <span><strong>Gender:</strong> {historySelectedPatient.gender}</span>}
                          {historySelectedPatient.date_of_birth && <span><strong>DOB:</strong> {historySelectedPatient.date_of_birth}</span>}
                          {historySelectedPatient.blood_group && <span><strong>Blood Group:</strong> {historySelectedPatient.blood_group}</span>}
                          {historySelectedPatient.phone && <span><strong>Phone:</strong> {historySelectedPatient.phone}</span>}
                        </div>
                      </div>

                      {/* Filter by OP / IP */}
                      <div className="btn-group btn-group-sm" role="group">
                        <button
                          type="button"
                          className={`btn ${historyTypeFilter === 'all' ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                          style={historyTypeFilter === 'all' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                          onClick={() => setHistoryTypeFilter('all')}
                        >
                          All Records ({patientHistoryTimeline.length})
                        </button>
                        <button
                          type="button"
                          className={`btn ${historyTypeFilter === 'OP' ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                          style={historyTypeFilter === 'OP' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                          onClick={() => setHistoryTypeFilter('OP')}
                        >
                          Outpatient (OP)
                        </button>
                        <button
                          type="button"
                          className={`btn ${historyTypeFilter === 'IP' ? 'btn-teal text-white' : 'btn-outline-secondary'}`}
                          style={historyTypeFilter === 'IP' ? { backgroundColor: '#0d9488', borderColor: '#0d9488' } : {}}
                          onClick={() => setHistoryTypeFilter('IP')}
                        >
                          Inpatient (IP)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Timeline */}
                  {loadingPatientHistory ? (
                    <div className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-teal mb-2" role="status"></div>
                      <p className="text-muted small mb-0">Loading patient history timeline...</p>
                    </div>
                  ) : patientHistoryTimeline.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="bi bi-clock-history fs-1 d-block mb-2 text-secondary"></i>
                      <p className="mb-0">No clinical visits or inpatient records found for this patient.</p>
                    </div>
                  ) : (
                    <div className="timeline-container">
                      {patientHistoryTimeline
                        .filter(item => {
                          if (historyTypeFilter === 'OP') return item.record_type === 'OP' || item.visit_type === 'OP' || (!item.admission_id && !item.ward_bed);
                          if (historyTypeFilter === 'IP') return item.record_type === 'IP' || item.visit_type === 'IP' || item.admission_id || item.ward_bed;
                          return true;
                        })
                        .map((rec, idx) => {
                          const isIP = rec.record_type === 'IP' || rec.visit_type === 'IP' || rec.admission_id || rec.ward_bed;
                          return (
                            <div key={idx} className="card rounded-3 shadow-xs mb-2.5 bg-white border border-light-subtle" style={{ borderLeft: isIP ? '4px solid #3b82f6' : '4px solid #0d9488' }}>
                              <div className="card-body p-3">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className={`badge ${isIP ? 'bg-primary-subtle text-primary' : 'bg-teal-subtle text-teal'} px-2.5 py-1 rounded-pill fw-bold`} style={!isIP ? { backgroundColor: '#e6f4f1', color: '#0d9488' } : {}}>
                                      <i className={`bi ${isIP ? 'bi-hospital' : 'bi-calendar2-check'} me-1`}></i>
                                      {isIP ? 'Inpatient Stay' : 'Outpatient Visit'}
                                    </span>
                                    <span className="font-monospace fw-bold text-dark">
                                      {rec.admission_uid || rec.vis_uid || rec.visit_uid || `REC${idx + 1}`}
                                    </span>
                                    {rec.admission_status && (
                                      <span className={`badge ${rec.admission_status === 'Admitted' ? 'bg-success text-white' : 'bg-light text-secondary border'} rounded-pill`}>
                                        {rec.admission_status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted small fw-semibold">
                                    <i className="bi bi-clock me-1"></i>{rec.visited_at || rec.admission_date || rec.date}
                                  </div>
                                </div>

                                <div className="row g-3 mt-1">
                                  <div className="col-md-4">
                                    <small className="text-muted extra-small d-block text-uppercase fw-bold">Consulting / Attending Doctor</small>
                                    <div className="fw-semibold text-dark small">{rec.doctor_name || 'Dr. Practitioner'}</div>
                                    <small className="text-muted">{rec.hospital_name || hospitalName}</small>
                                  </div>
                                  <div className="col-md-5">
                                    <small className="text-muted extra-small d-block text-uppercase fw-bold">Clinical Diagnosis / Reason</small>
                                    <div className="fw-bold small text-teal" style={{ color: '#0d9488' }}>
                                      {rec.diagnosis || rec.admission_reason || 'General Clinical Review'}
                                    </div>
                                    {rec.medical_notes && (
                                      <div className="text-muted extra-small text-truncate mt-0.5">{rec.medical_notes}</div>
                                    )}
                                  </div>
                                  <div className="col-md-3 text-md-end">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-teal rounded-pill px-3 fw-bold"
                                      style={{ borderColor: '#0d9488', color: '#0d9488' }}
                                      onClick={() => handleOpenInspection(rec, isIP ? 'admission' : 'visit')}
                                    >
                                      <i className="bi bi-folder2-open me-1"></i> Inspect Details
                                    </button>
                                  </div>
                                </div>

                                {/* Vitals snippet if available */}
                                {(rec.blood_pressure || rec.weight || rec.height || (rec.vitals && rec.vitals.blood_pressure)) && (
                                  <div className="mt-2.5 pt-2 border-top d-flex gap-2 flex-wrap extra-small text-muted align-items-center">
                                    <span className="fw-bold text-dark"><i className="bi bi-heart-pulse text-danger me-1"></i>Vitals:</span>
                                    {(rec.blood_pressure || rec.vitals?.blood_pressure) && (
                                      <span className="badge bg-light text-dark border">BP: {rec.blood_pressure || rec.vitals?.blood_pressure}</span>
                                    )}
                                    {(rec.weight || rec.vitals?.weight) && (
                                      <span className="badge bg-light text-dark border">{rec.weight || rec.vitals?.weight} kg</span>
                                    )}
                                    {(rec.height || rec.vitals?.height) && (
                                      <span className="badge bg-light text-dark border">{rec.height || rec.vitals?.height} cm</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-person-badge fs-1 d-block mb-3 text-secondary"></i>
                  <h6 className="fw-bold text-dark">Lookup Patient Clinical History</h6>
                  <p className="text-muted small mb-3">
                    Enter a patient's UPID or Health ID above to view chronological outpatient visits and inpatient admissions.
                  </p>
                  {visits.length > 0 && (
                    <div>
                      <small className="text-muted extra-small d-block mb-2 fw-bold text-uppercase">Or select from today's active patients:</small>
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        {Array.from(new Set(visits.map(v => v.patient_uid || v.health_id))).slice(0, 6).map((uid, i) => (
                          <button
                            key={i}
                            type="button"
                            className="btn btn-outline-secondary btn-sm rounded-pill font-monospace"
                            onClick={() => handleSearchPatientHistory(uid)}
                          >
                            {uid}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </main>

      {/* RECORD / ADMISSION INSPECTION MODAL */}
      {showInspectionModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg overflow-hidden">
              <div className="modal-header text-white p-3.5 px-4" style={{ backgroundColor: '#0d9488' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${inspectionType === 'admission' ? 'bi-hospital' : 'bi-calendar2-check'} fs-5`}></i>
                  <h5 className="modal-title fw-bold mb-0">
                    {inspectionType === 'admission'
                      ? `Inpatient Admission Chart: ${inspectionData?.admission?.admission_uid || inspectionData?.admission_uid || 'Inpatient Stay'}`
                      : `Outpatient Visit File: ${inspectionData?.visit_uid || 'Visit Consultation'}`}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowInspectionModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                {loadingInspection ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-teal mb-2" role="status"></div>
                    <p className="text-muted small mb-0">Loading full clinical record details...</p>
                  </div>
                ) : inspectionType === 'admission' ? (
                  <div>
                    {/* Admission Summary Header Card */}
                    <div className="bg-light rounded-3 p-3.5 mb-3.5 border">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                        <div>
                          <h6 className="fw-bold text-dark mb-0.5">
                            {inspectionData?.admission?.patient_name || inspectionData?.patient_name}
                          </h6>
                          <div className="extra-small text-muted font-monospace">
                            Global Health ID: {inspectionData?.admission?.health_id || inspectionData?.admission?.patient_uid || inspectionData?.health_id}
                          </div>
                        </div>
                        <span className={`badge ${(inspectionData?.admission?.admission_status || inspectionData?.admission_status) === 'Admitted' ? 'bg-success text-white' : 'bg-secondary text-white'} px-3 py-1.5 rounded-pill`}>
                          {(inspectionData?.admission?.admission_status || inspectionData?.admission_status) === 'Admitted' ? 'Active Inpatient' : 'Discharged'}
                        </span>
                      </div>
                      <div className="row g-2 text-muted small mt-1">
                        <div className="col-sm-6">
                          <strong>Ward & Bed:</strong> {inspectionData?.admission?.ward_bed || inspectionData?.ward_bed || 'General Ward'}
                        </div>
                        <div className="col-sm-6">
                          <strong>Attending Doctor:</strong> {inspectionData?.admission?.doctor_name || inspectionData?.doctor_name}
                        </div>
                        <div className="col-sm-6">
                          <strong>Admission Date:</strong> {inspectionData?.admission?.admission_date || inspectionData?.admission_date}
                        </div>
                        <div className="col-sm-6">
                          <strong>Discharge Date:</strong> {inspectionData?.admission?.discharge_date || inspectionData?.discharge_date || 'Ongoing'}
                        </div>
                      </div>
                      {(inspectionData?.admission?.admission_reason || inspectionData?.admission_reason) && (
                        <div className="mt-2 pt-2 border-top small text-muted">
                          <strong>Reason for Admission:</strong> {inspectionData?.admission?.admission_reason || inspectionData?.admission_reason}
                        </div>
                      )}
                    </div>

                    {/* Discharge Summary if Discharged */}
                    {(inspectionData?.admission?.discharge_summary || inspectionData?.discharge_summary) && (
                      <div className="alert alert-warning py-2.5 px-3 small rounded-3 mb-3.5">
                        <div className="fw-bold text-dark mb-1"><i className="bi bi-box-arrow-right me-1"></i>Discharge Summary & Instructions:</div>
                        <p className="mb-0 text-dark">{inspectionData?.admission?.discharge_summary || inspectionData?.discharge_summary}</p>
                      </div>
                    )}

                    {/* Section 1: Clinical Rounds / Consultations */}
                    <div className="mb-3.5">
                      <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
                        <i className="bi bi-activity text-teal" style={{ color: '#0d9488' }}></i>
                        Inpatient Rounds & Daily Consultations ({inspectionData?.visits?.length || 0})
                      </h6>
                      {!inspectionData?.visits || inspectionData.visits.length === 0 ? (
                        <p className="text-muted small bg-light p-3 rounded-3 border mb-0">No daily rounds recorded yet for this stay.</p>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {inspectionData.visits.map((v, i) => (
                            <div key={i} className="card border-light-subtle rounded-3 p-2.5 bg-white shadow-xs">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-bold text-dark small">{v.diagnosis}</span>
                                <span className="extra-small text-muted">{v.visited_at}</span>
                              </div>
                              {v.medical_notes && <p className="small text-muted mb-1">{v.medical_notes}</p>}
                              {(v.blood_pressure || v.weight || v.height) && (
                                <div className="extra-small text-muted d-flex gap-2 flex-wrap mt-1">
                                  {v.blood_pressure && <span className="badge bg-light text-dark border">BP: {v.blood_pressure}</span>}
                                  {v.weight && <span className="badge bg-light text-dark border">W: {v.weight} kg</span>}
                                  {v.height && <span className="badge bg-light text-dark border">H: {v.height} cm</span>}
                                  {v.bmi && <span className="badge bg-teal-subtle text-teal border">BMI: {v.bmi}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Inpatient Prescriptions */}
                    <div className="mb-3.5">
                      <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
                        <i className="bi bi-capsule text-teal" style={{ color: '#0d9488' }}></i>
                        Prescriptions & Administered Medications ({inspectionData?.prescriptions?.length || 0})
                      </h6>
                      {!inspectionData?.prescriptions || inspectionData.prescriptions.length === 0 ? (
                        <p className="text-muted small bg-light p-3 rounded-3 border mb-0">No prescriptions issued during this admission.</p>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {inspectionData.prescriptions.map((pr, i) => (
                            <div key={i} className="card border-light-subtle rounded-3 p-2.5 bg-white shadow-xs">
                              <div className="d-flex justify-content-between align-items-center mb-1.5">
                                <span className="fw-bold text-dark font-monospace small">{pr.prescription_uid || `PRE${pr.prescription_id}`}</span>
                                <span className="extra-small text-muted">{pr.date} &bull; {pr.doctor_name}</span>
                              </div>
                              <ul className="mb-1 ps-3 small text-dark">
                                {pr.medicines?.map((m, mi) => (
                                  <li key={mi}>
                                    <strong>{m.medicine_name}</strong> - {m.dosage} | {m.frequency} | {m.duration} {m.instruction && <em>({m.instruction})</em>}
                                  </li>
                                ))}
                              </ul>
                              {pr.remarks && <small className="text-muted extra-small">Notes: {pr.remarks}</small>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 3: Diagnostic Lab Reports */}
                    <div>
                      <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-1.5">
                        <i className="bi bi-file-earmark-medical text-teal" style={{ color: '#0d9488' }}></i>
                        Inpatient Diagnostic Reports ({inspectionData?.lab_reports?.length || 0})
                      </h6>
                      {!inspectionData?.lab_reports || inspectionData.lab_reports.length === 0 ? (
                        <p className="text-muted small bg-light p-3 rounded-3 border mb-0">No diagnostic investigations recorded for this admission.</p>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {inspectionData.lab_reports.map((lr, i) => (
                            <div key={i} className="card border-light-subtle rounded-3 p-2.5 bg-white shadow-xs d-flex justify-content-between align-items-center flex-row">
                              <div>
                                <span className="fw-bold text-dark small">{lr.report_title}</span>
                                <div className="extra-small text-muted">{lr.report_type} &bull; {lr.uploaded_at}</div>
                              </div>
                              <span className="badge bg-light text-secondary border">Uploaded</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Outpatient Visit File */}
                    <div className="bg-light rounded-3 p-3.5 mb-3.5 border">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                        <div>
                          <h6 className="fw-bold text-dark mb-0.5">{inspectionData?.patient_name}</h6>
                          <div className="extra-small text-muted font-monospace">Health ID: {inspectionData?.health_id || inspectionData?.patient_uid}</div>
                        </div>
                        <span className="badge bg-secondary text-white px-3 py-1.5 rounded-pill">Outpatient Visit</span>
                      </div>
                      <div className="row g-2 text-muted small mt-1">
                        <div className="col-sm-6"><strong>Visit ID:</strong> {inspectionData?.visit_uid || `VIS${inspectionData?.visit_id}`}</div>
                        <div className="col-sm-6"><strong>Visit Date:</strong> {inspectionData?.visit_date}</div>
                        <div className="col-sm-6"><strong>Doctor:</strong> {inspectionData?.doctor_name}</div>
                        <div className="col-sm-6"><strong>Department:</strong> {inspectionData?.department_name}</div>
                      </div>
                    </div>

                    <div className="card border-light-subtle rounded-3 p-3 mb-3 bg-white shadow-xs">
                      <h6 className="fw-bold text-dark small mb-1"><i className="bi bi-stethoscope text-teal me-1.5" style={{ color: '#0d9488' }}></i>Diagnosis & Clinical Finding</h6>
                      <div className="fw-semibold text-teal mb-2" style={{ color: '#0d9488' }}>{inspectionData?.diagnosis}</div>
                      {inspectionData?.medical_notes && (
                        <div>
                          <small className="text-muted extra-small fw-bold text-uppercase d-block mb-1">Clinical Notes & Prescribed Treatment:</small>
                          <p className="small text-dark mb-0 bg-light p-2.5 rounded-2 border">{inspectionData.medical_notes}</p>
                        </div>
                      )}
                    </div>

                    {inspectionData?.vitals && (inspectionData.vitals.blood_pressure || inspectionData.vitals.weight || inspectionData.vitals.height) && (
                      <div className="card border-light-subtle rounded-3 p-3 mb-3 bg-white shadow-xs">
                        <h6 className="fw-bold text-dark small mb-2"><i className="bi bi-heart-pulse-fill text-danger me-1.5"></i>Nurse Intake Vitals</h6>
                        <div className="row g-2 text-center">
                          <div className="col-4">
                            <div className="bg-light p-2 rounded-2 border">
                              <small className="text-muted extra-small d-block">Blood Pressure</small>
                              <strong className="text-dark small">{inspectionData.vitals.blood_pressure || '—'}</strong>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="bg-light p-2 rounded-2 border">
                              <small className="text-muted extra-small d-block">Weight</small>
                              <strong className="text-dark small">{inspectionData.vitals.weight ? `${inspectionData.vitals.weight} kg` : '—'}</strong>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="bg-light p-2 rounded-2 border">
                              <small className="text-muted extra-small d-block">Height</small>
                              <strong className="text-dark small">{inspectionData.vitals.height ? `${inspectionData.vitals.height} cm` : '—'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light p-3">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowInspectionModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* UPLOAD LAB REPORT MODAL FOR NURSE */}
      {showLabReportModal && (
        <div className="modal show d-block bg-dark bg-opacity-50 z-4" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header text-white rounded-top-4 p-3 px-4" style={{ backgroundColor: '#0d9488' }}>
                <h5 className="modal-title fw-bold fs-5 mb-0">
                  <i className="bi bi-file-earmark-medical me-2"></i>Log Diagnostic Lab Report
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowLabReportModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSaveLabReport}>
                  {/* Patient Selection */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Patient *</label>
                    {visits.length > 0 ? (
                      <select
                        className="form-select"
                        required
                        value={labReportForm.patient_id}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = visits.find(v => String(v.patient_id || v.health_id) === String(val));
                          setLabReportForm(prev => ({
                            ...prev,
                            patient_id: val,
                            patient_name: found ? (found.patient_name || found.patient) : '',
                            patient_uid: found ? (found.health_id || found.patient_uid) : val,
                          }));
                        }}
                      >
                        <option value="">-- Choose Queued Patient --</option>
                        {visits.map((v, i) => (
                          <option key={i} value={v.patient_id || v.health_id}>
                            {v.patient_name || v.patient} ({v.health_id || v.patient_uid || `PTA${v.patient_id}`})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="Enter Patient ID or Health ID (e.g. PTA001)"
                        value={labReportForm.patient_id}
                        onChange={(e) => setLabReportForm({ ...labReportForm, patient_id: e.target.value })}
                      />
                    )}
                  </div>

                  {/* Test Category */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Test Category *</label>
                    <select
                      className="form-select"
                      value={labReportForm.report_type}
                      onChange={(e) => setLabReportForm({ ...labReportForm, report_type: e.target.value })}
                    >
                      <option value="Blood Test">Blood Test (CBC, Lipid, HbA1c)</option>
                      <option value="Radiology">Radiology (X-Ray, Ultrasound, CT)</option>
                      <option value="Pathology">Pathology / Biopsy</option>
                      <option value="Urine Analysis">Urine Analysis</option>
                      <option value="Cardiology">Cardiology (ECG, Echo)</option>
                      <option value="General Diagnostics">General Diagnostic Report</option>
                    </select>
                  </div>

                  {/* Report Title */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Report Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Complete Blood Count (CBC) Panel"
                      value={labReportForm.report_title}
                      onChange={(e) => setLabReportForm({ ...labReportForm, report_title: e.target.value })}
                    />
                  </div>

                  {/* Lab Findings / Observations */}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Lab Findings / Summary Result *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      required
                      placeholder="Enter test values, parameters (e.g. Hemoglobin 14.2 g/dL, WBC 7500), and lab observations..."
                      value={labReportForm.report_file}
                      onChange={(e) => setLabReportForm({ ...labReportForm, report_file: e.target.value })}
                    ></textarea>
                  </div>

                  {/* Share / Keep Local Interoperability Toggle */}
                  <div className="form-check form-switch p-3 bg-light rounded-3 border mb-3 d-flex align-items-center justify-content-between">
                    <div>
                      <label className="form-check-label fw-bold text-dark mb-0 d-block cursor-pointer" htmlFor="nurseShareLabReportToggle">
                        <i className="bi bi-share-fill me-1.5 text-teal" style={{ color: '#0d9488' }}></i>
                        Share Report (Participating Hospitals & Patient Portal)
                      </label>
                      <small className="text-muted extra-small d-block mt-0.5">
                        {labReportForm.is_shared
                          ? 'Shared across network: Legitimate diagnostic report visible to patient and treating doctors in partner hospitals.'
                          : 'Keep Local: Report remains confidential strictly within this hospital facility.'}
                      </small>
                    </div>
                    <input
                      className="form-check-input ms-3 fs-5"
                      type="checkbox"
                      role="switch"
                      id="nurseShareLabReportToggle"
                      checked={labReportForm.is_shared}
                      onChange={(e) => setLabReportForm({ ...labReportForm, is_shared: e.target.checked })}
                    />
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowLabReportModal(false)}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn text-white rounded-pill px-4 fw-bold shadow-sm"
                      style={{ backgroundColor: '#0d9488' }}
                      disabled={labReportSubmitting}
                    >
                      {labReportSubmitting ? 'Uploading...' : 'Save & Log Report'}
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
