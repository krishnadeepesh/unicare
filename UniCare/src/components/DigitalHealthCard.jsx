import React from 'react';

export default function DigitalHealthCard({ patient }) {
  if (!patient) return null;

  // Handler to trigger print
  const handlePrint = (e) => {
    e.preventDefault();
    window.print();
  };

  return (
    <div className="d-flex flex-column align-items-center gap-3">
      <div className="health-card animate-fade-in text-start">
        {/* Top Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-plus text-info fs-3"></i>
            <span className="health-card-logo fs-5">UniCare</span>
          </div>
          <span className="badge bg-teal px-2.5 py-1 text-white border border-teal-500 rounded-pill" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
            DIGITAL HEALTH
          </span>
        </div>

        {/* Chip & NFC symbol */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="health-card-chip"></div>
          <i className="bi bi-wifi text-light fs-4" style={{ transform: 'rotate(90deg)', opacity: 0.6 }}></i>
        </div>

        {/* Card Number / Patient ID */}
        <div className="mb-4">
          <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
            Global Health Identification ID
          </div>
          <div className="fs-4 fw-bold tracking-widest text-white font-monospace" style={{ letterSpacing: '2px' }}>
            {patient.healthId || patient.patient_uid || patient.patientId || 'PTA001'}
          </div>
        </div>

        {/* Patient Name and Info Grid */}
        <div className="row g-3 mb-4">
          <div className="col-8">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Cardholder Name
            </div>
            <div className="fw-bold text-white text-truncate" style={{ fontSize: '1.1rem' }}>
              {patient.name || patient.fullName || 'Demo Patient'}
            </div>
          </div>
          <div className="col-4 text-end">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Blood Type
            </div>
            <div className="fw-bold text-info" style={{ fontSize: '1.1rem' }}>
              {patient.bloodGroup || patient.blood_group || 'O+'}
            </div>
          </div>
        </div>

        {/* Footer Details: DOB and Phone */}
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Date of Birth
            </div>
            <div className="fw-semibold text-white-50" style={{ fontSize: '0.9rem' }}>
              {patient.dob || patient.dateOfBirth || patient.date_of_birth || '01/01/1990'}
            </div>
          </div>
          <div className="col-6 text-end">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Contact
            </div>
            <div className="fw-semibold text-white-50" style={{ fontSize: '0.9rem' }}>
              {patient.phone || patient.phoneNumber || 'N/A'}
            </div>
          </div>
        </div>

        {/* Simulated Barcode */}
        <div className="mt-3">
          <div className="health-card-barcode mb-1"></div>
          <div className="text-center text-white-50 font-monospace" style={{ fontSize: '9px', letterSpacing: '4px' }}>
            *{patient.healthId || patient.patient_uid || patient.patientId || 'PTA001'}*
          </div>
        </div>
      </div>

      {/* Action triggers */}
      <button 
        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 mt-1 px-3 py-2 no-print" 
        onClick={handlePrint}
        style={{ borderRadius: '8px' }}
      >
        <i className="bi bi-printer"></i>
        <span>Print Health Card</span>
      </button>
    </div>
  );
}
