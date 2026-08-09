import React, { useState } from 'react';

export default function PatientFlowPage({ setView, onLogin }) {
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email or Phone
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handle Patient Login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    const registeredPatients = JSON.parse(localStorage.getItem('unicare_patients') || '[]');

    const matchedUser = registeredPatients.find(
      p => (p.email === loginIdentifier || p.phone === loginIdentifier) && p.password === loginPassword
    );

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setLoginError('Invalid email/phone or password.');
    }
  };

  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)', display: 'flex', alignItems: 'center' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8 animate-slide-up">
            
            {/* Back Arrow */}
            <button 
              className="btn btn-link text-muted text-decoration-none hover-primary mb-4 p-0"
              onClick={() => setView('auth-select')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to selection
            </button>

            <div className="unicare-card p-4 p-md-5">
              <div className="text-center mb-4">
                <div className="bg-teal bg-opacity-10 text-teal rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
                  <i className="bi bi-person-circle fs-2 text-primary"></i>
                </div>
                <h2 className="h4 fw-bold mb-1">Patient Portal Login</h2>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Access your healthcare services and appointments.</p>
              </div>

              {loginError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                  <i className="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
                  <div>{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Email or Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-person-bounding-box"></i></span>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold small">Password</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-lock"></i></span>
                    <input 
                      type="password" 
                      className="form-control" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-100 py-3 fs-6 fw-bold rounded-3">
                  Login to Patient Portal
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
