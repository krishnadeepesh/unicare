import React, { useState } from 'react';

export default function RegisterPage({ setView }) {
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [regNumber, setRegNumber] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = (e) => {
    e.preventDefault();
    setIsRegistered(true);
  };

  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)', display: 'flex', alignItems: 'center' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 animate-slide-up">
            
            {/* Back Arrow */}
            <button 
              className="btn btn-link text-muted text-decoration-none hover-primary mb-4 p-0"
              onClick={() => setView('landing')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to Home
            </button>

            {isRegistered ? (
              <div className="unicare-card p-4 p-md-5 text-center">
                <div className="d-flex justify-content-center mb-4">
                  <div className="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center animate-pulse" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                    <i className="bi bi-clock-history"></i>
                  </div>
                </div>
                <h2 className="fw-bold text-slate-800 mb-3">Registration Submitted</h2>
                <div className="alert alert-info py-3 px-4 mb-4 text-start">
                  <h4 className="alert-heading h6 fw-bold mb-2">Details Logged:</h4>
                  <p className="mb-0 text-slate-700" style={{ fontSize: '0.9rem' }}>
                    <strong>Hospital Name:</strong> {hospitalName}<br />
                    <strong>Admin Email:</strong> {adminEmail}<br />
                    <strong>Hospital Registration:</strong> {regNumber}
                  </p>
                </div>
                <p className="text-muted mb-4 fs-6">
                  Hospital registration submitted successfully. Waiting for approval.
                </p>

                <div className="d-flex justify-content-center gap-3">
                  <button 
                    className="btn btn-primary-unicare px-4 py-3"
                    onClick={() => setView('landing')}
                  >
                    Return to Homepage
                  </button>
                  <button 
                    className="btn btn-outline-secondary px-4 py-3"
                    onClick={() => setView('login')}
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="unicare-card p-4 p-md-5">
                <div className="text-center mb-4">
                  <span className="badge badge-blue px-3 py-2 rounded-pill mb-2">Clinic Registration</span>
                  <h2 className="fw-bold text-slate-800">Register Your Hospital</h2>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>Join the UniCare unified healthcare network.</p>
                </div>

                <form onSubmit={handleRegister}>
                  {/* Section 1: Hospital Details */}
                  <h3 className="h5 fw-bold text-primary mb-3 border-bottom pb-2">Hospital Details</h3>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Hospital Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Registration Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Hospital Email Address</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={hospitalEmail}
                        onChange={(e) => setHospitalEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact Number</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Hospital Address</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  {/* Section 2: Admin Details */}
                  <h3 className="h5 fw-bold text-teal mb-3 border-bottom pb-2">Administrator Details</h3>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">Admin Full Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number</label>
                      <input 
                        type="tel" 
                        className="form-control" 
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Admin Email Address</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Admin Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary-unicare w-100 py-3 fs-6">
                    Register Hospital
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
