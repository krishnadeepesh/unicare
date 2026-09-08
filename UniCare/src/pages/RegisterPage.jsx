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

  // Touched state for live inline validation
  const [touched, setTouched] = useState({});

  // Form State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Live Field Validations
  const getErrors = () => {
    const errs = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 3) {
      errs.fullName = 'Name must be at least 3 characters.';
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Enter a valid email address.';
    }

    const phoneDigits = phone.replace(/[^0-9]/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      errs.phone = 'Enter a valid 10-digit(starts with 6-9).';
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      errs.password = 'Min 8 characters with at least one letter and one number.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm your password.';
    } else if (password && confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!recoveryQuestion) {
      errs.recoveryQuestion = 'Please choose a recovery question.';
    }

    if (!recoveryAnswer.trim()) {
      errs.recoveryAnswer = 'Recovery answer is required.';
    } else if (recoveryAnswer.trim().length < 2) {
      errs.recoveryAnswer = 'Answer is too short.';
    }

    return errs;
  };

  const fieldErrors = getErrors();


  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Mark all fields touched
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      recoveryQuestion: true,
      recoveryAnswer: true,
    });

    const errs = getErrors();
    if (Object.keys(errs).length > 0) {
      setErrorMsg('Please correct the highlighted errors before submitting.');
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
                <div className="bg-teal-subtle text-teal rounded-circle d-inline-flex p-2 mb-2" style={{ backgroundColor: '#e6f4f1' }}>
                  <i className="bi bi-shield-plus fs-3" style={{ color: '#0d9488' }}></i>
                </div>
                <div>
                  <span className="badge px-3 py-1 rounded-pill mb-1" style={{ backgroundColor: '#e6f4f1', color: '#0d9488', fontSize: '0.78rem' }}>
                    UniCare Network Registration
                  </span>
                </div>
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
                <h5 className="small fw-bold text-teal text-uppercase mb-3 border-bottom pb-2" style={{ color: '#0d9488', letterSpacing: '0.5px' }}>
                  <i className="bi bi-person-badge me-2"></i>Account Credentials
                </h5>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Full Name *</label>
                    <input 
                      type="text" 
                      className={`form-control py-2 ${touched.fullName ? (fieldErrors.fullName ? 'is-invalid' : 'is-valid') : ''}`}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => markTouched('fullName')}
                      required 
                    />
                    {touched.fullName && fieldErrors.fullName && (
                      <div className="invalid-feedback small">{fieldErrors.fullName}</div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Email Address *</label>
                    <input
                      type="email"
                      className={`form-control py-2 ${touched.email ? (fieldErrors.email ? 'is-invalid' : 'is-valid') : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched('email')}
                      required
                    />
                    {touched.email && fieldErrors.email && (
                      <div className="invalid-feedback small">{fieldErrors.email}</div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      className={`form-control py-2 ${touched.phone ? (fieldErrors.phone ? 'is-invalid' : 'is-valid') : ''}`}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => markTouched('phone')}
                      maxLength="15"
                      required
                    />
                    {touched.phone && fieldErrors.phone && (
                      <div className="invalid-feedback small">{fieldErrors.phone}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Password (Min 8 chars, letter & number) *</label>
                    <input
                      type="password"
                      className={`form-control py-2 ${touched.password ? (fieldErrors.password ? 'is-invalid' : 'is-valid') : ''}`}
                      placeholder="Create secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched('password')}
                      minLength="8"
                      required
                    />
                    {touched.password && fieldErrors.password && (
                      <div className="invalid-feedback small">{fieldErrors.password}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      className={`form-control py-2 ${touched.confirmPassword ? (fieldErrors.confirmPassword ? 'is-invalid' : 'is-valid') : ''}`}
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => markTouched('confirmPassword')}
                      minLength="8"
                      required
                    />
                    {touched.confirmPassword && fieldErrors.confirmPassword && (
                      <div className="invalid-feedback small">{fieldErrors.confirmPassword}</div>
                    )}
                  </div>
                </div>

                {/* Section 2: Account Recovery Setup */}
                <h5 className="small fw-bold text-teal text-uppercase mb-3 border-bottom pb-2" style={{ color: '#0d9488', letterSpacing: '0.5px' }}>
                  <i className="bi bi-shield-lock me-2"></i>Account Security & Recovery
                </h5>

                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Recovery Question *</label>
                    <select
                      className={`form-select py-2 ${touched.recoveryQuestion ? (fieldErrors.recoveryQuestion ? 'is-invalid' : 'is-valid') : ''}`}
                      value={recoveryQuestion}
                      onChange={(e) => setRecoveryQuestion(e.target.value)}
                      onBlur={() => markTouched('recoveryQuestion')}
                      required
                    >
                      <option value="">Select a recovery question...</option>
                      {RECOVERY_QUESTIONS.map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                    {touched.recoveryQuestion && fieldErrors.recoveryQuestion && (
                      <div className="invalid-feedback small">{fieldErrors.recoveryQuestion}</div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold text-slate-700 small mb-1">Recovery Answer *</label>
                    <input
                      type="text"
                      className={`form-control py-2 ${touched.recoveryAnswer ? (fieldErrors.recoveryAnswer ? 'is-invalid' : 'is-valid') : ''}`}
                      value={recoveryAnswer}
                      onChange={(e) => setRecoveryAnswer(e.target.value)}
                      onBlur={() => markTouched('recoveryAnswer')}
                      placeholder="Enter your secret answer"
                      maxLength="100"
                      required
                    />
                    {touched.recoveryAnswer && fieldErrors.recoveryAnswer && (
                      <div className="invalid-feedback small">{fieldErrors.recoveryAnswer}</div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="btn btn-teal text-white w-100 py-3 fs-6 rounded-pill fw-bold shadow-sm"
                    style={{ backgroundColor: '#0d9488' }}
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
                </div>
              </form>

              {/* Bottom Login Link */}
              <div className="text-center mt-4 pt-3 border-top">
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
