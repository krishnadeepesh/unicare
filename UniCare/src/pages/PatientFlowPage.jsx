import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/super-admin';

export default function PatientFlowPage({ setView, onLogin }) {
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Patient Health ID
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Patient Login with unique Health ID
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const rawInput = loginIdentifier.trim();
    const phoneDigits = rawInput.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');

    // Enforce Health ID - reject phone number login for patients
    if (/^[6-9]\d{9}$/.test(phoneDigits) && !/[a-zA-Z]/.test(rawInput)) {
      setLoginError('Patient accounts must log in using your unique Health ID (e.g. PTA001) and Password. Phone number login is disabled to protect shared family accounts.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier: rawInput,
          password: loginPassword.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success' && data.user) {
        const u = data.user;
        if (u.role === 'patient') {
          onLogin(u);
        } else {
          setLoginError('This login portal is for patients only. Please use the staff or provider portal.');
        }
      } else {
        setLoginError(data.message || 'Invalid Health ID or Password.');
      }
    } catch (err) {
      console.error('Patient login network error:', err);
      // Local fallback check
      const registeredPatients = JSON.parse(localStorage.getItem('unicare_patients') || '[]');
      const matched = registeredPatients.find(
        p => (p.health_id === rawInput || p.patient_uid === rawInput) && p.password === loginPassword
      );
      if (matched) {
        onLogin({ ...matched, role: 'patient' });
      } else {
        setLoginError('Unable to connect to the login service. Please check your network connection.');
      }
    } finally {
      setLoading(false);
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
                  <i className="bi bi-person-circle fs-2 text-teal" style={{ color: '#0d9488' }}></i>
                </div>
                <h2 className="h4 fw-bold mb-1">Patient Portal Login</h2>
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Access your personalized health records and appointments securely.</p>
              </div>

              {loginError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                  <i className="bi bi-exclamation-triangle-fill fs-5 text-danger flex-shrink-0"></i>
                  <div>{loginError}</div>
                </div>
              )}

              <div className="alert alert-light border py-2 px-3 small mb-4 text-muted">
                <i className="bi bi-shield-lock-fill text-teal me-1" style={{ color: '#0d9488' }}></i>
                <strong>Confidential Health ID Login:</strong> Families may share a phone number, but each family member accesses their personal medical history with their unique Health ID (e.g. PTA001).
              </div>

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    Patient Health ID (Unique Account ID) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-teal" style={{ color: '#0d9488' }}><i className="bi bi-person-badge"></i></span>
                    <input 
                      type="text" 
                      className="form-control font-monospace" 
                      placeholder="e.g. PTA001 or PTA002"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-text extra-small text-muted">Your Health ID was issued at patient registration (e.g. PTA001).</div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold small">Password <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text bg-light"><i className="bi bi-lock"></i></span>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="Enter your account password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-teal text-white w-100 py-3 fs-6 fw-bold rounded-3 shadow-sm"
                  style={{ backgroundColor: '#0d9488' }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Login to Patient Portal
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
