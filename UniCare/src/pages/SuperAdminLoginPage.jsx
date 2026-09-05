import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/super-admin';

function SuperAdminLoginPage({ onLoginSuccess, onBackToSite }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field level validation
    if (!email.trim() || !password.trim()) {
      setValidated(true);
      if (!email.trim() && !password.trim()) {
        setError('Email and Password are required');
      } else if (!email.trim()) {
        setError('Email Required');
      } else {
        setError('Password Required');
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          admin_email: email.trim(),
          admin_password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Save session details in localStorage for client state persistence
        const adminData = {
          admin_id: data.admin_id,
          admin_name: data.admin_name,
          admin_email: data.admin_email,
        };
        localStorage.setItem('unicare_super_admin', JSON.stringify(adminData));
        if (onLoginSuccess) {
          onLoginSuccess(adminData);
        }
      } else {
        setError(data.message || 'Invalid Email or Password');
      }
    } catch (err) {
      console.error('Login error:', err);
      // Fallback for network error or dev setup
      setError('Invalid Email or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light py-5 px-3">
      {/* Container Box */}
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: '440px', width: '100%' }}>
        {/* Top Header Card Banner */}
        <div 
          className="p-4 text-center text-white" 
          style={{ 
            background: 'linear-gradient(135deg, #0f172a 0%, #0d9488 100%)' 
          }}
        >
          <div 
            className="d-inline-flex align-items-center justify-content-center bg-white bg-opacity-10 rounded-circle mb-3 p-3 shadow-sm"
            style={{ width: '70px', height: '70px' }}
          >
            <i className="bi bi-shield-plus text-white fs-1"></i>
          </div>
          <h4 className="fw-bold mb-1 tracking-wide">UniCare Platform</h4>
          <p className="mb-0 text-white-50 small text-uppercase font-monospace">Super Admin Portal</p>
        </div>

        {/* Card Body / Form */}
        <div className="card-body p-4 p-sm-5 bg-white">
          <div className="text-center mb-4">
            <h5 className="fw-bold text-dark mb-1">Sign In to Dashboard</h5>
            <p className="text-muted small">Enter your super admin credentials below</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center rounded-3 py-2 px-3 mb-4 shadow-sm" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              <div className="fw-medium small">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className={validated ? 'was-validated' : ''}>
            {/* Email Field */}
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold small mb-1">
                Admin Email <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary px-3">
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  placeholder="admin@unicare.com"
                  className={`form-control border-start-0 bg-light py-2.5 ${validated && !email.trim() ? 'is-invalid' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {validated && !email.trim() && (
                <div className="text-danger small mt-1">Email Required</div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label className="form-label text-secondary fw-semibold small mb-1">
                Password <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-secondary px-3">
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  className={`form-control border-start-0 bg-light py-2.5 ${validated && !password.trim() ? 'is-invalid' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {validated && !password.trim() && (
                <div className="text-danger small mt-1">Password Required</div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="btn btn-teal text-white w-100 py-3 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                style={{ backgroundColor: '#0d9488', border: 'none' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Sign In to Super Admin</span>
                    <i className="bi bi-arrow-right-short fs-5"></i>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Back to main website link */}
      {onBackToSite && (
        <div className="mt-4 text-center">
          <button 
            onClick={onBackToSite}
            className="btn btn-link text-decoration-none text-secondary small fw-medium"
          >
            <i className="bi bi-arrow-left me-1"></i> Back to Main UniCare Portal
          </button>
        </div>
      )}
    </div>
  );
}

export default SuperAdminLoginPage;
