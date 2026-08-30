import React, { useState } from 'react';

export default function LoginPage({ setView, onLogin, onStaffLogin, onSuperAdminLogin, onRoleLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetStep, setResetStep] = useState('lookup'); // lookup → question → new-password → done
  const [resetForm, setResetForm] = useState({ identifier: '', answer: '', password: '', confirmPassword: '' });
  const [recoveryQuestion, setRecoveryQuestion] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setResetStep('lookup');
    setResetForm({ identifier: '', answer: '', password: '', confirmPassword: '' });
    setRecoveryQuestion('');
    setResetMessage('');
    setResetError('');
  };

  const handleRecoveryLookup = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/super-admin/recovery/lookup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: resetForm.identifier.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setRecoveryQuestion(data.recovery_question);
        setResetStep('question');
      } else {
        setResetError(data.message || 'Unable to find your account.');
      }
    } catch {
      setResetError('Unable to process the request. Please check the server connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleRecoveryVerify = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(resetForm.password)) {
      setResetError('Password must be at least 8 characters and include a letter and number.');
      return;
    }
    setResetLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/super-admin/recovery/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          answer: resetForm.answer.trim(),
          new_password: resetForm.password,
          confirm_password: resetForm.confirmPassword,
        }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setResetMessage(data.message);
        setResetStep('done');
      } else {
        setResetError(data.message || 'Unable to reset your password.');
      }
    } catch {
      setResetError('Unable to process the request. Please check the server connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // One identifier field; the backend resolves the account role from email/phone.
      const roleResponse = await fetch('http://localhost:8000/api/super-admin/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });
      const roleData = await roleResponse.json();

      if (roleResponse.ok && roleData.status === 'success' && roleData.user) {
        const u = roleData.user;
        if (u.role === 'super-admin') {
          onSuperAdminLogin?.({ admin_id: u.user_id, admin_name: u.name, admin_email: u.email });
          return;
        }
        if (u.role === 'hospital-admin') {
          const hospUser = {
            ...(u.hospital || {}),
            type: 'hospital',
            username: u.name,
            user_name: u.name,
            hospital_name: u.hospital_name || u.hospital?.hospital_name || u.name,
            name: u.hospital_name || u.hospital?.hospital_name || u.name,
            role: 'Hospital Administrator',
          };
          if (onLogin) onLogin(hospUser);
          else setView('hospital-admin-dashboard');
          return;
        }
        if (u.role === 'doctor' || u.role === 'receptionist' || u.role === 'patient') {
          onRoleLogin?.(u);
          return;
        }
      }

      // Fallback check for legacy hospital admin login
      const response = await fetch('http://localhost:8000/api/super-admin/hospital-admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: identifier.trim(),
          username: identifier.trim(),
          password: password.trim(),
        }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success' && data.hospital) {
        const hospitalUser = {
          ...data.hospital,
          type: 'hospital',
          username: data.hospital.username || data.hospital.user_name || identifier.trim(),
          role: data.hospital.role || 'Hospital Administrator',
        };
        if (onLogin) onLogin(hospitalUser);
        else setView('hospital-admin-dashboard');
        return;
      }

      setErrorMsg(roleData.message || data.message || 'Invalid Email/Phone Number or Password');
    } catch (err) {
      console.warn('Backend login error:', err);
      setErrorMsg('Unable to sign in. Please verify that the backend server is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page bg-dot-grid">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5 animate-slide-up">
            
            {/* Back Arrow */}
            <button 
              className="auth-back-link btn btn-link text-muted text-decoration-none hover-primary mb-2 p-0"
              onClick={() => setView('landing')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to Home
            </button>

            <div className="auth-card unicare-card p-3 p-md-4 shadow-lg border-0 rounded-4 bg-white">
              <div className="auth-card-header text-center mb-3">
                <div className="bg-teal-subtle text-teal rounded-circle d-inline-flex p-2 mb-2" style={{ backgroundColor: '#e6f4f1' }}>
                  <i className="bi bi-shield-lock fs-3" style={{ color: '#0d9488' }}></i>
                </div>
                <h3 className="fw-bold text-slate-800 fs-4 mb-1">UniCare Login</h3>
                <p className="text-muted mb-0" style={{ fontSize: '0.825rem' }}>Use your registered email address or phone number to access your portal.</p>
              </div>

              {errorMsg && (
                <div className="alert alert-danger py-1.5 px-3 mb-2.5 text-start small d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email / Username Field */}
                <div className="mb-3">
                  <label className="form-label fw-semibold text-slate-700 small mb-1">Email or Phone Number</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0 px-3"><i className="bi bi-person fs-6"></i></span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 py-2.5 ps-1"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-semibold text-slate-700 small mb-0">Password</label>
                    <button 
                      type="button" 
                      className="btn btn-link p-0 text-teal text-decoration-none extra-small fw-semibold"
                      style={{ fontSize: '0.8rem', color: '#0d9488' }}
                      onClick={() => setShowForgotModal(true)}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted border-end-0 px-3"><i className="bi bi-lock fs-6"></i></span>
                    <input 
                      type="password" 
                      className="form-control border-start-0 py-2.5 ps-1" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                {/* Login Button with clear spacing */}
                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="btn btn-teal w-100 py-3 fs-6 rounded-pill fw-bold text-white shadow-sm"
                    style={{ backgroundColor: '#0d9488', letterSpacing: '0.3px' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-box-arrow-in-right me-2"></i>
                        Sign In to UniCare
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Registration Callout */}
              <div className="text-center mt-4 pt-3 border-top">
                <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
                  New to UniCare?{' '}
                  <button 
                    type="button"
                    className="btn btn-link p-0 fw-bold text-teal text-decoration-none ms-1"
                    style={{ color: '#0d9488' }}
                    onClick={() => setView('register')}
                  >
                    Register Account
                  </button>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Forgot Password Modal - Recovery Question Flow */}
      {showForgotModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0 pt-3 px-4">
                <h5 className="modal-title fw-bold text-dark fs-5"><i className="bi bi-key me-2 text-teal"></i>Forgot Password?</h5>
                <button type="button" className="btn-close" onClick={closeForgotModal}></button>
              </div>

              <div className="modal-body py-3 px-4 text-secondary">
                {resetStep === 'lookup' && (
                  <form onSubmit={handleRecoveryLookup}>
                    <p className="small mb-3">Enter your registered email address or phone number. We will show you your recovery question to verify your identity.</p>
                    {resetError && <div className="alert alert-danger py-2 small mb-3">{resetError}</div>}
                    {resetMessage && <div className="alert alert-success py-2 small mb-3">{resetMessage}</div>}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Registered email or phone number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={resetForm.identifier}
                        onChange={(e) => setResetForm({ ...resetForm, identifier: e.target.value })}
                        required
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button type="button" className="btn btn-secondary btn-sm px-4 rounded-pill" onClick={closeForgotModal}>Close</button>
                      <button type="submit" className="btn btn-primary btn-sm px-4 rounded-pill" disabled={resetLoading}>
                        {resetLoading ? <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Checking...</> : 'Continue'}
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === 'question' && (
                  <form onSubmit={handleRecoveryVerify}>
                    <p className="small mb-2">Answer your recovery question to verify your identity.</p>
                    {resetError && <div className="alert alert-danger py-1.5 small mb-2">{resetError}</div>}
                    <div className="mb-2">
                      <label className="form-label small fw-semibold text-slate-700 mb-1">Recovery Question</label>
                      <div className="alert alert-info py-1.5 px-3 small mb-0">
                        <i className="bi bi-question-circle me-1"></i>
                        {recoveryQuestion}
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Your Answer</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={resetForm.answer}
                        onChange={(e) => setResetForm({ ...resetForm, answer: e.target.value })}
                        placeholder="Enter your answer"
                        required
                      />
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">New Password</label>
                        <input
                          type="password"
                          className="form-control form-control-sm"
                          value={resetForm.password}
                          onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                          placeholder="Min 8 chars (letter & number)"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Confirm Password</label>
                        <input
                          type="password"
                          className="form-control form-control-sm"
                          value={resetForm.confirmPassword}
                          onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                          placeholder="Re-enter password"
                          required
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button type="button" className="btn btn-secondary btn-sm px-4 rounded-pill" onClick={closeForgotModal}>Close</button>
                      <button type="submit" className="btn btn-primary btn-sm px-4 rounded-pill" disabled={resetLoading}>
                        {resetLoading ? <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Verifying...</> : 'Reset Password'}
                      </button>
                    </div>
                  </form>
                )}

                {resetStep === 'done' && (
                  <div className="text-center py-3">
                    <div className="text-success mb-3">
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem' }}></i>
                    </div>
                    <h6 className="fw-bold text-dark mb-2">Password Reset Successful</h6>
                    <p className="small mb-4">{resetMessage}</p>
                    <button
                      type="button"
                      className="btn btn-primary px-4 rounded-pill"
                      onClick={() => {
                        closeForgotModal();
                        setPassword('');
                      }}
                    >
                      Go to Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}