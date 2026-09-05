import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/super-admin';

function HospitalRoleSelectorPage({ hospitalInfo, onSelectRole, onLogout, onNavigateHome }) {
  const hospitalName = hospitalInfo?.name || hospitalInfo?.hospital_name || 'Hospital';

  // Doctor Login Modal & Profile State
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [doctorIdInput, setDoctorIdInput] = useState('');
  const [docPasswordInput, setDocPasswordInput] = useState('');
  const [docLoginError, setDocLoginError] = useState('');
  const [loadingDocLogin, setLoadingDocLogin] = useState(false);
  const [activeDoctorUser, setActiveDoctorUser] = useState(null);

  // Handle Doctor Login API submit against MySQL
  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    setDocLoginError('');
    setLoadingDocLogin(true);

    try {
      const response = await fetch(`${API_BASE_URL}/doctor-login-public/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorIdInput.trim(),
          password: docPasswordInput.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setActiveDoctorUser(data.doctor);
        setShowDoctorLoginModal(false);
      } else {
        setDocLoginError(data.message || 'Invalid Doctor ID or Password.');
      }
    } catch (err) {
      console.error('Doctor login error:', err);
      setDocLoginError('Unable to connect to server.');
    } finally {
      setLoadingDocLogin(false);
    }
  };

  // If Doctor is logged in, show Doctor Dashboard view
  if (activeDoctorUser) {
    return (
      <div className="min-vh-100 bg-light d-flex flex-column">
        <header className="bg-primary text-white py-3 px-4 shadow-sm d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="bg-white text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
              <i className="bi bi-person-heart fs-4"></i>
            </div>
            <div>
              <h5 className="fw-bold mb-0 text-white">{activeDoctorUser.name}</h5>
              <small className="text-white-50">Doctor Portal — {hospitalName}</small>
            </div>
          </div>
          <button 
            onClick={() => setActiveDoctorUser(null)} 
            className="btn btn-outline-light btn-sm rounded-pill px-3"
          >
            <i className="bi bi-box-arrow-right me-1"></i> Doctor Logout
          </button>
        </header>

        <div className="container py-5 flex-grow-1">
          <div className="card border-0 rounded-4 shadow-sm bg-white p-4 p-md-5">
            <div className="d-flex align-items-center gap-4 mb-4 pb-4 border-bottom">
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                <i className="bi bi-person-badge-fill"></i>
              </div>
              <div>
                <span className="badge bg-primary-subtle text-primary px-3 py-1 rounded-pill mb-1">Doctor Authenticated</span>
                <h3 className="fw-bold text-dark mb-1">{activeDoctorUser.name}</h3>
                <p className="text-muted mb-0">Doctor ID: <code className="fw-bold text-primary">{activeDoctorUser.doc_uid}</code></p>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block">Department / Specialization</span>
                  <span className="fw-bold fs-5 text-dark">{activeDoctorUser.specialization || 'General Medicine'}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block">Medical License Number</span>
                  <span className="font-monospace fw-bold fs-5 text-dark">{activeDoctorUser.license || 'N/A'}</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-light rounded-3 border">
                  <span className="text-muted small d-block">Contact Email</span>
                  <span className="fw-semibold text-dark">{activeDoctorUser.email}</span>
                </div>
              </div>
              <div className="col-md-6">
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 bg-light min-vh-100 d-flex flex-column align-items-center justify-content-center position-relative">
      {/* Top Bar Navigation */}
      <div className="w-100 position-absolute top-0 start-0 p-3 px-4 d-flex justify-content-between align-items-center">
        <button 
          className="btn btn-outline-teal btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-1.5"
          onClick={() => onNavigateHome && onNavigateHome()}
        >
          <i className="bi bi-arrow-left"></i>
          <span>Return to Homepage</span>
        </button>
        <button 
          className="btn btn-light text-danger btn-sm rounded-pill px-3 py-1.5 fw-semibold border"
          onClick={onLogout}
        >
          <i className="bi bi-box-arrow-right me-1"></i>
          <span>Sign Out</span>
        </button>
      </div>
      <div className="container mt-4" style={{ maxWidth: '960px' }}>
        
        {/* Welcome Header */}
        <div className="text-center mb-5 animate-slide-down">
          <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-semibold mb-3">
            <i className="bi bi-hospital me-1"></i> Hospital Portal Selection
          </span>
          <h1 className="display-5 fw-extrabold text-dark mb-2">
            Welcome <span className="text-primary">{hospitalName}</span>
          </h1>
          <p className="text-muted lead">
            Please choose your role to log into your portal:
          </p>
        </div>

        {/* 3 Role Selection Cards */}
        <div className="row g-4 justify-content-center">
          
          {/* Card 1: Login as Doctor */}
          <div className="col-md-4">
            <div className="card border-0 rounded-4 shadow-sm h-100 bg-white hover-lift transition-all overflow-hidden border-top border-4 border-primary">
              <div className="card-body p-4 text-center d-flex flex-column justify-content-between">
                <div>
                  <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '76px', height: '76px' }}>
                    <i className="bi bi-person-heart fs-1"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Doctor</h4>
                  <p className="text-muted small mb-4">
                    Access doctor portal using your Doctor ID as your password.
                  </p>
                </div>
                <button
                  onClick={() => setShowDoctorLoginModal(true)}
                  className="btn btn-teal text-white w-100 py-2.5 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: '#0d9488' }}
                >
                  <span>Login as Doctor</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>



          {/* Card 3: Login as Receptionist */}
          <div className="col-md-4">
            <div className="card border-0 rounded-4 shadow-sm h-100 bg-white hover-lift transition-all overflow-hidden border-top border-4" style={{ borderTopColor: '#0d9488' }}>
              <div className="card-body p-4 text-center d-flex flex-column justify-content-between">
                <div>
                  <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '76px', height: '76px', backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                    <i className="bi bi-person-badge-fill fs-1"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Receptionist</h4>
                  <p className="text-muted small mb-4">
                    Handle patient check-ins, register new patients, book appointments, and manage visitor logs.
                  </p>
                </div>
                <button
                  onClick={() => onSelectRole('receptionist')}
                  className="btn btn-teal text-white w-100 py-2.5 rounded-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  style={{ backgroundColor: '#0d9488' }}
                >
                  <span>Login as Receptionist</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Back / Logout Option */}
        <div className="text-center mt-5">
          <button 
            onClick={onLogout} 
            className="btn btn-outline-secondary rounded-pill px-4 py-2 small fw-medium"
          >
            <i className="bi bi-box-arrow-left me-2"></i> Log out of {hospitalName}
          </button>
        </div>

      </div>

      {/* DOCTOR LOGIN MODAL */}
      {showDoctorLoginModal && (
        <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header bg-primary text-white rounded-top-4 p-4">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-heart me-2"></i>Doctor Portal Login
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setShowDoctorLoginModal(false)}
                ></button>
              </div>
              <form onSubmit={handleDoctorLogin}>
                <div className="modal-body p-4">

                  {docLoginError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {docLoginError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Doctor ID <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-person-badge"></i></span>
                      <input 
                        type="text" 
                        className="form-control"
                        required
                        value={doctorIdInput}
                        onChange={(e) => {
                          setDoctorIdInput(e.target.value);
                          if (!docPasswordInput) setDocPasswordInput(e.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold small">Password<span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-lock"></i></span>
                      <input 
                        type="password" 
                        className="form-control"
                        required
                        value={docPasswordInput}
                        onChange={(e) => setDocPasswordInput(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-0 p-4 pt-0">
                  <button 
                    type="button" 
                    className="btn btn-secondary rounded-3 px-4"
                    onClick={() => setShowDoctorLoginModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-teal text-white rounded-3 px-4 fw-bold shadow-sm"
                    style={{ backgroundColor: '#0d9488' }}
                    disabled={loadingDocLogin}
                  >
                    {loadingDocLogin ? 'Authenticating...' : 'Login to Doctor Portal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalRoleSelectorPage;
