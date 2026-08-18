import React, { useState } from 'react';

export default function RegisterPage({ setView }) {
  // Required User / Admin Registration Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');


  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setErrorMsg('Password must be at least 8 characters and include a letter and number.');
      return;
    }

    const phoneDigits = phone.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      setErrorMsg('Enter a valid 10-digit phone number.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    try {
      const response = await fetch('http://localhost:8000/api/super-admin/hospital-register-public/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Registration service returned HTTP ${response.status}. Check the Django server console for details.`);
      }

      if (response.ok && data.status === 'success') {
        setSuccessMsg('Administrator account created. Sign in next to complete your hospital registration.');
        setTimeout(() => {
          setView('login');
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Registration failed.');
      }
    } catch (err) {
      console.warn('Backend registration error:', err);
      setErrorMsg(err.message || 'Unable to submit registration. Please check the server connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page bg-dot-grid">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 animate-slide-up">
            
            {/* Back Arrow */}
            <button 
              className="auth-back-link btn btn-link text-muted text-decoration-none hover-primary mb-4 p-0"
              onClick={() => setView('landing')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to Home
            </button>

            <div className="auth-card unicare-card p-4 p-md-5 shadow-lg border-0 rounded-4 bg-white">
              <div className="auth-card-header text-center mb-4">
                <span className="badge px-3 py-2 rounded-pill mb-2" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                  UniCare Network Registration
                </span>
                <h2 className="fw-bold text-slate-800">Hospital Admin Registration</h2>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Create your administrator account and register your hospital.</p>
              </div>

              {errorMsg && (
                <div className="alert alert-danger py-2 px-3 mb-3 text-start small d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="alert alert-success py-2 px-3 mb-3 text-start small d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleRegister}>
                {/* Section 1: User / Administrator Details */}
                <h3 className="h6 fw-bold text-teal text-uppercase mb-3 border-bottom pb-2" style={{ color: '#0d9488', letterSpacing: '0.5px' }}>
                  <i className="bi bi-person-badge me-2"></i>Administrator Account Details
                </h3>

                <div className="row g-3 mb-4">
                  {/* Full Name * */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700">Full Name *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      pattern="[0-9+()\-\s]{10,20}"
                      title="Enter a valid 10-digit phone number"
                      maxLength="15"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700">Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength="8"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700">Confirm Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength="8"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary-unicare w-100 py-3 fs-6 rounded-3 shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting Registration...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Create Administrator Account
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Login Link */}
              <div className="text-center mt-4 pt-3 border-top">
                <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                  Already registered?{' '}
                  <button 
                    type="button"
                    className="btn btn-link p-0 fw-bold text-teal text-decoration-none ms-1"
                    onClick={() => setView('login')}
                  >
                    Go to Login
                  </button>
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
