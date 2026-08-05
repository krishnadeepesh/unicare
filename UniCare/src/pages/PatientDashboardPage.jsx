import React, { useState, useEffect } from 'react';
import DigitalHealthCard from '../components/DigitalHealthCard';

export default function PatientDashboardPage({ patientInfo }) {
  const [appointments, setAppointments] = useState([]);
  const [clinicName, setClinicName] = useState('City General Hospital');
  const [docName, setDocName] = useState('Dr. Sarah Jenkins');
  const [appDate, setAppDate] = useState('');
  const [appTime, setAppTime] = useState('09:00 AM');
  const [reason, setReason] = useState('');
  
  // Load mock appointments from local storage or set defaults
  useEffect(() => {
    const cached = localStorage.getItem(`unicare_appointments_${patientInfo.patientId}`);
    if (cached) {
      setAppointments(JSON.parse(cached));
    } else {
      const defaults = [
        {
          id: 'APP-1029',
          clinic: 'City General Hospital',
          doctor: 'Dr. Sarah Jenkins (Cardiology)',
          date: '2026-08-10',
          time: '10:30 AM',
          status: 'Confirmed',
          reason: 'Routine ECG Checkup'
        },
        {
          id: 'APP-0941',
          clinic: 'City General Hospital',
          doctor: 'Dr. David Miller (General Medicine)',
          date: '2026-06-15',
          time: '02:15 PM',
          status: 'Completed',
          reason: 'Seasonal Flu Consultation'
        }
      ];
      setAppointments(defaults);
      localStorage.setItem(`unicare_appointments_${patientInfo.patientId}`, JSON.stringify(defaults));
    }
  }, [patientInfo.patientId]);

  // Book a new appointment
  const handleBookAppointment = (e) => {
    e.preventDefault();

    const newApp = {
      id: 'APP-' + Math.floor(1000 + Math.random() * 9000),
      clinic: clinicName,
      doctor: docName,
      date: appDate,
      time: appTime,
      status: 'Confirmed',
      reason: reason || 'General consultation'
    };

    const updated = [newApp, ...appointments];
    setAppointments(updated);
    localStorage.setItem(`unicare_appointments_${patientInfo.patientId}`, JSON.stringify(updated));
    
    // Reset form
    setReason('');
    setAppDate('');
    alert('Appointment booked successfully! Status: Confirmed.');
  };

  const medicalRecords = [
    {
      date: '2026-06-15',
      type: 'Diagnostic Report',
      facility: 'City General Hospital',
      doctor: 'Dr. David Miller',
      notes: 'Blood Pressure: 120/80 mmHg. Cholesterol levels normal. Prescription refilled for multivitamins.',
      attachment: 'General_Health_Report.pdf'
    },
    {
      date: '2026-03-12',
      type: 'Laboratory Analysis',
      facility: 'Biotech Pathology Lab',
      doctor: 'Dr. Rachel Green',
      notes: 'CBC and Thyroid panel within reference intervals. HbA1c: 5.4% (Healthy).',
      attachment: 'Lab_Pathology_Panel.pdf'
    }
  ];

  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)' }}>
      <div className="container">
        
        {/* Welcome Header */}
        <div className="row mb-5 animate-slide-up">
          <div className="col-12">
            <div className="p-4 p-md-5 bg-white border rounded shadow-sm">
              <span className="badge bg-teal px-3 py-2 rounded-pill mb-3 text-white">
                <i className="bi bi-person-check-fill me-1"></i> Patient Portal Active
              </span>
              <h1 className="display-6 fw-bold mb-2">Welcome Back, {patientInfo?.name}!</h1>
              <p className="text-muted mb-0" style={{ fontSize: '1rem' }}>
                Access your digital medical profile, manage schedules, and review your health files in one secure vault.
              </p>
            </div>
          </div>
        </div>

        <div className="row g-4">
          
          {/* Left Column: Digital Health Card & Booking Form */}
          <div className="col-lg-5 animate-slide-up">
            
            {/* Health Card Section */}
            <h3 className="h4 fw-bold mb-4">Digital Health Identity</h3>
            <div className="p-4 bg-white border rounded shadow-sm mb-4">
              <DigitalHealthCard patient={patientInfo} />
            </div>

            {/* Appointment Booking Widget */}
            <h3 className="h4 fw-bold mb-4">Schedule Consultation</h3>
            <div className="p-4 bg-white border rounded shadow-sm">
              <form onSubmit={handleBookAppointment}>
                <div className="mb-3">
                  <label className="form-label">Preferred Clinic/Hospital</label>
                  <select className="form-select" value={clinicName} onChange={(e) => setClinicName(e.target.value)}>
                    <option value="City General Hospital">City General Hospital</option>
                    <option value="St. Mary Clinic">St. Mary Clinic</option>
                    <option value="Metropolitan Wellness Center">Metropolitan Wellness Center</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Specialist Doctor</label>
                  <select className="form-select" value={docName} onChange={(e) => setDocName(e.target.value)}>
                    <option value="Dr. Sarah Jenkins (Cardiology)">Dr. Sarah Jenkins (Cardiology)</option>
                    <option value="Dr. David Miller (General Medicine)">Dr. David Miller (General Medicine)</option>
                    <option value="Dr. Clara Adams (Pediatrics)">Dr. Clara Adams (Pediatrics)</option>
                    <option value="Dr. James Carter (Orthopedics)">Dr. James Carter (Orthopedics)</option>
                  </select>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label">Appointment Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={appDate} 
                      onChange={(e) => setAppDate(e.target.value)} 
                      min={new Date().toISOString().split('T')[0]}
                      required 
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Available Time</label>
                    <select className="form-select" value={appTime} onChange={(e) => setAppTime(e.target.value)}>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:45 AM">11:45 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Reason for Visit</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="E.g., Yearly physical checkup" 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                    required
                  />
                </div>

                <button type="submit" className="btn btn-secondary-unicare w-100 py-2.5">
                  <i className="bi bi-calendar-check-fill me-2"></i> Book Appointment
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Active Appointments & Medical History */}
          <div className="col-lg-7 animate-slide-up">
            
            {/* Active Appointments */}
            <h3 className="h4 fw-bold mb-4">Appointments Schedule</h3>
            <div className="p-4 bg-white border rounded shadow-sm mb-4">
              {appointments.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-calendar-x text-muted fs-2"></i>
                  <p className="text-muted mt-2 mb-0">No upcoming consultations found.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {appointments.map((app) => (
                    <div key={app.id} className="p-3 border rounded bg-light position-relative">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h4 className="h6 fw-bold mb-1">{app.doctor}</h4>
                          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                            <i className="bi bi-building me-1"></i> {app.clinic}
                          </div>
                        </div>
                        <span className={`badge ${app.status === 'Confirmed' ? 'bg-success' : 'bg-secondary'} rounded-pill`}>
                          {app.status}
                        </span>
                      </div>
                      
                      <div className="row g-2 border-top pt-2 mt-2" style={{ fontSize: '0.85rem' }}>
                        <div className="col-6 text-muted">
                          <i className="bi bi-calendar-event me-1"></i> {app.date}
                        </div>
                        <div className="col-6 text-muted text-end">
                          <i className="bi bi-clock me-1"></i> {app.time}
                        </div>
                        {app.reason && (
                          <div className="col-12 text-slate-700 mt-2.5 bg-white p-2 rounded border border-light">
                            <strong>Reason:</strong> {app.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medical Records History */}
            <h3 className="h4 fw-bold mb-4">Secure Medical Records</h3>
            <div className="p-4 bg-white border rounded shadow-sm">
              <div className="d-flex flex-column gap-3">
                {medicalRecords.map((record, idx) => (
                  <div key={idx} className="p-3 border rounded bg-light">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h4 className="h6 fw-bold mb-0 text-slate-800">{record.type}</h4>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{record.date} | {record.facility}</span>
                      </div>
                      <span className="badge bg-teal text-white rounded-pill px-2.5" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-lock-fill me-1"></i> Encrypted
                      </span>
                    </div>
                    
                    <p className="text-muted mt-3 mb-3" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                      <strong>Clinical Notes:</strong> {record.notes}
                    </p>

                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top border-light" style={{ fontSize: '0.85rem' }}>
                      <i className="bi bi-file-earmark-arrow-down text-primary"></i>
                      <a href="#" onClick={(e) => { e.preventDefault(); alert('Downloading file (Mock Mode)...'); }} className="text-decoration-none fw-semibold">
                        {record.attachment}
                      </a>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>(342 KB)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
        
      </div>
    </div>
  );
}
