import React, { useState } from 'react';

const RECOVERY_QUESTIONS = [
  'What is the name of your best friend?',
  'What was the official name of the high school or secondary school you attended?',
  'What is the name of your first pet?',
  "What is your mother's maiden name?",
  'What was the make and model of your first car?',
  'What city were you born in?',
];

export default function RegisterPage({ setView }) {
  // Required User / Admin Registration Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');

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

    if (!recoveryQuestion) {
      setErrorMsg('Please select a recovery question.');
      return;
    }

    if (!recoveryAnswer.trim()) {
      setErrorMsg('Please enter an answer to your recovery question.');
      return;
    }

    setLoading(true);

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      recoveryQuestion,
      recoveryAnswer: recoveryAnswer.trim(),
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
              className="auth-back-link btn btn-link text-muted text-decoration-none hover-primary mb-2 p-0"
              onClick={() => setView('landing')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to Home
            </button>

            <div className="auth-card unicare-card p-3 p-md-4 shadow-lg border-0 rounded-4 bg-white">
              <div className="auth-card-header text-center mb-2">
                <span className="badge px-3 py-1 rounded-pill mb-1" style={{ backgroundColor: '#e6f4f1', color: '#0d9488', fontSize: '0.78rem' }}>
                  UniCare Network Registration
                </span>
                <h3 className="fw-bold text-slate-800 fs-4 mb-1">Hospital Admin Registration</h3>
                <p className="text-muted mb-0" style={{ fontSize: '0.825rem' }}>Create your administrator account and register your hospital.</p>
              </div>

              {errorMsg && (
                <div className="alert alert-danger py-1.5 px-3 mb-2 text-start small d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="alert alert-success py-1.5 px-3 mb-2 text-start small d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleRegister}>
                {/* Section 1: Account Credentials */}
                <h4 className="small fw-bold text-teal text-uppercase mb-2 border-bottom pb-1" style={{ color: '#0d9488', letterSpacing: '0.5px' }}>
                  <i className="bi bi-person-badge me-1.5"></i>Account Credentials
                </h4>

                <div className="row g-2 mb-2">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Email Address *</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control form-control-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      pattern="[0-9+()\-\s]{10,20}"
                      title="Enter a valid 10-digit phone number"
                      maxLength="15"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Password (Min 8 chars, letter & number) *</label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength="8"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength="8"
                      required
                    />
                  </div>
                </div>

                {/* Section 2: Account Recovery Setup */}
                <h4 className="small fw-bold text-teal text-uppercase mb-2 border-bottom pb-1 mt-1" style={{ color: '#0d9488', letterSpacing: '0.5px' }}>
                  <i className="bi bi-shield-lock me-1.5"></i>Account Recovery Setup
                </h4>

                <div className="row g-2 mb-2">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Recovery Question *</label>
                    <select
                      className="form-select form-select-sm"
                      value={recoveryQuestion}
                      onChange={(e) => setRecoveryQuestion(e.target.value)}
                      required
                    >
                      <option value="">Select a recovery question...</option>
                      {RECOVERY_QUESTIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 extra-small mb-1">Recovery Answer *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={recoveryAnswer}
                      onChange={(e) => setRecoveryAnswer(e.target.value)}
                      placeholder="Enter secret answer"
                      maxLength="100"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary-unicare w-100 py-2.5 fs-6 rounded-3 shadow-sm mt-2"
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
              <div className="text-center mt-2.5 pt-2 border-top">
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
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
