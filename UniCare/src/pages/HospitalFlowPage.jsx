import React, { useState, useEffect } from 'react';

export default function HospitalFlowPage({ setView, onLogin }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Registration Form State
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [regNumber, setRegNumber] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  
  // Status & Registration State
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [viewingStatus, setViewingStatus] = useState(null); // Hospital status object from MySQL

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear legacy localStorage cache on mount so local mock items don't mask MySQL
  useEffect(() => {
    localStorage.removeItem('unicare_hospitals');
  }, []);

  // Handle Hospital Registration directly into MySQL
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setLoading(true);

    const payload = {
      hospital_name: hospitalName.trim(),
      hospital_address: hospitalAddress.trim(),
      hospital_phone: contactNumber.trim(),
      hospital_email: hospitalEmail.trim() || adminEmail.trim(),
      adminEmail: adminEmail.trim(),
      adminName: adminName.trim(),
      adminPassword: adminPassword.trim(),
      adminPhone: adminPhone.trim(),
    };

    try {
      const response = await fetch('http://localhost:8000/api/super-admin/hospital-register-public/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setRegisteredData(data.hospital);
        setIsRegistered(true);
      } else {
        setRegisterError(data.message || 'Registration failed to save.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setRegisterError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Authenticate Hospital Admin directly against Django backend & MySQL
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/super-admin/hospital-admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const hospital = data.hospital;
        onLogin(hospital);
      } else {
        // Fallback to checking public registration status if login returns non-approved status or status check
        if (data.message && data.message.includes('Pending')) {
          setViewingStatus({ email: loginEmail.trim(), status: 'Pending' });
        } else {
          setLoginError(data.message || 'Invalid Email or Password.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh Status Action directly from MySQL
  const handleRefreshStatus = async () => {
    if (!viewingStatus) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/super-admin/hospital-status-public/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: viewingStatus.adminEmail || viewingStatus.email }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setViewingStatus(data.hospital);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)', display: 'flex', alignItems: 'center' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 animate-slide-up">
            
            {/* Back Arrow */}
            <button 
              className="btn btn-link text-muted text-decoration-none hover-primary mb-4 p-0"
              onClick={() => setView('auth-select')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to selection
            </button>

            {/* SCREEN A: LOGGED IN STATUS CHECK SCREEN (Fetched directly from MySQL) */}
            {viewingStatus ? (
              <div className="unicare-card p-4 p-md-5 text-center">
                <div className="d-flex justify-content-center mb-4">
                  <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                    viewingStatus.status === 'Approved' ? 'bg-success text-white' :
                    viewingStatus.status === 'Rejected' ? 'bg-danger text-white' : 'bg-warning text-dark'
                  }`} style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                    <i className={`bi ${
                      viewingStatus.status === 'Approved' ? 'bi-check-circle-fill' :
                      viewingStatus.status === 'Rejected' ? 'bi-x-circle-fill' : 'bi-clock-history'
                    }`}></i>
                  </div>
                </div>

                <span className={`badge px-3 py-2 rounded-pill mb-3 fw-semibold fs-6 ${
                  viewingStatus.status === 'Approved' ? 'bg-success text-white' :
                  viewingStatus.status === 'Rejected' ? 'bg-danger text-white' : 'bg-warning text-dark'
                }`}>
                  Status: {viewingStatus.status || 'Pending Approval'}
                </span>

                <h2 className="fw-bold text-dark mb-2">{viewingStatus.name || viewingStatus.hospital_name}</h2>
                
                <div className="alert alert-light border py-3 px-4 mb-4 text-start rounded-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small">Hospital ID:</span>
                    <code className="fw-bold text-primary">{viewingStatus.hospital_uid || viewingStatus.id}</code>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted small">Contact Email:</span>
                    <span className="fw-semibold small">{viewingStatus.adminEmail || viewingStatus.email}</span>
                  </div>
                </div>

                {viewingStatus.status === 'Rejected' ? (
                  <p className="text-danger mb-4 fs-6">
                    Your hospital registration request was reviewed and <strong>rejected</strong> by the Super Admin. Please contact support.
                  </p>
                ) : (
                  <p className="text-muted mb-4 fs-6">
                    Your hospital registration request has been sent to the <strong>Super Admin panel</strong> and is currently <strong>pending review</strong>.
                  </p>
                )}

                <div className="d-flex justify-content-center gap-3">
                  <button 
                    onClick={handleRefreshStatus}
                    className="btn btn-primary px-4 py-2.5 rounded-3 fw-bold d-flex align-items-center gap-2"
                    disabled={loading}
                  >
                    <i className={`bi bi-arrow-repeat ${loading ? 'spin' : ''}`}></i>
                    <span>Check Status Again</span>
                  </button>
                  <button 
                    onClick={() => setViewingStatus(null)}
                    className="btn btn-outline-secondary px-4 py-2.5 rounded-3 fw-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : isRegistered ? (
              /* SCREEN B: REGISTRATION SUBMITTED CONFIRMATION */
              <div className="unicare-card p-4 p-md-5 text-center">
                <div className="d-flex justify-content-center mb-4">
                  <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                    <i className="bi bi-database-check text-dark"></i>
                  </div>
                </div>
                <h2 className="fw-bold text-dark mb-2">Registration Successful</h2>
                
                <div className="alert alert-success border-0 bg-success bg-opacity-10 py-3 px-4 mb-4 text-start rounded-3">
                  <h6 className="fw-bold text-success mb-2">
                  </h6>
                  <p className="mb-0 text-dark small">
                    <strong>Hospital Name:</strong> {registeredData?.hospital_name || registeredData?.name}<br />
                    <strong>Admin Email:</strong> {registeredData?.email || registeredData?.adminEmail}<br />
                    <strong>Hospital ID:</strong> <code>{registeredData?.hospital_uid || registeredData?.id}</code>
                  </p>
                </div>

                <p className="text-muted mb-4 fs-6">
Your hospital registration request has been sent and is currently pending administrative review.                </p>

                <div className="d-flex justify-content-center">
                  <button 
                    className="btn btn-primary px-5 py-3 rounded-3 fw-bold"
                    onClick={() => {
                      setIsRegistered(false);
                      setLoginEmail(registeredData?.email || registeredData?.adminEmail || '');
                      setActiveTab('login');
                    }}
                  >
                    Go to Login & Check Status
                  </button>
                </div>
              </div>
            ) : (
              /* SCREEN C: LOGIN / REGISTRATION FORM */
              <div className="unicare-card p-0 overflow-hidden">
                {/* Tabs */}
                <div className="row g-0 border-bottom">
                  <div className="col-6">
                    <button 
                      className={`w-100 py-3 fw-bold border-0 fs-5 text-center bg-transparent ${activeTab === 'login' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                      onClick={() => { setActiveTab('login'); setLoginError(''); setRegisterError(''); }}
                      style={{ outline: 'none' }}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Hospital Login
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className={`w-100 py-3 fw-bold border-0 fs-5 text-center bg-transparent ${activeTab === 'register' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                      onClick={() => { setActiveTab('register'); setLoginError(''); setRegisterError(''); }}
                      style={{ outline: 'none' }}
                    >
                      <i className="bi bi-building-add me-2"></i>
                      Hospital Registration
                    </button>
                  </div>
                </div>

                <div className="p-4 p-md-5">
                  {/* Tab 1: LOGIN FORM */}
                  {activeTab === 'login' && (
                    <div>
                      <div className="mb-4">
                        <h2 className="h4 fw-bold mb-1">Hospital Access</h2>
                        <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Log in to access your portal or check registration status.</p>
                      </div>

                      {loginError && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                          <div>{loginError}</div>
                        </div>
                      )}

                      <form onSubmit={handleLogin}>
                        <div className="mb-3">
                          <label className="form-label fw-semibold small">Admin Email Address</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-envelope"></i></span>
                            <input 
                              type="email" 
                              className="form-control" 
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
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

                        <button type="submit" className="btn btn-primary w-100 py-3 fs-6 fw-bold rounded-3" disabled={loading}>
                          {loading ? 'Checking status...' : 'Login '}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Tab 2: REGISTRATION FORM */}
                  {activeTab === 'register' && (
                    <form onSubmit={handleRegister}>
                      {registerError && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                          <div>{registerError}</div>
                        </div>
                      )}

                      <h3 className="h5 fw-bold text-primary mb-3 border-bottom pb-2">Hospital Details</h3>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Hospital Name <span className="text-danger">*</span></label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Registration Number</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={regNumber}
                            onChange={(e) => setRegNumber(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Hospital Email Address</label>
                          <input 
                            type="email" 
                            className="form-control" 
                            value={hospitalEmail}
                            onChange={(e) => setHospitalEmail(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Contact Phone Number <span className="text-danger">*</span></label>
                          <input 
                            type="tel" 
                            className="form-control" 
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small">Hospital Address</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={hospitalAddress}
                            onChange={(e) => setHospitalAddress(e.target.value)}
                          />
                        </div>
                      </div>

                      <h3 className="h5 fw-bold text-primary mb-3 border-bottom pb-2">Administrator Details</h3>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Admin Full Name <span className="text-danger">*</span></label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Phone Number</label>
                          <input 
                            type="tel" 
                            className="form-control" 
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Admin Email <span className="text-danger">*</span></label>
                          <input 
                            type="email" 
                            className="form-control" 
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small">Password <span className="text-danger">*</span></label>
                          <input 
                            type="password" 
                            className="form-control" 
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            required 
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary w-100 py-3 fs-6 fw-bold rounded-3" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Hospital Registration'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
