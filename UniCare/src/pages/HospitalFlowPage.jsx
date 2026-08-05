import React, { useState } from 'react';

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
  
  // Registration Status
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handle Hospital Registration
  const handleRegister = (e) => {
    e.preventDefault();
    const newHospital = {
      id: 'HOSP-' + Math.floor(1000 + Math.random() * 9000),
      name: hospitalName,
      address: hospitalAddress,
      contact: contactNumber,
      email: hospitalEmail,
      regNumber: regNumber,
      adminName: adminName,
      adminEmail: adminEmail,
      password: adminPassword,
      adminPhone: adminPhone,
      approved: false, // Wait for approval as required
      type: 'hospital'
    };

    // Save to localStorage list
    const registeredHospitals = JSON.parse(localStorage.getItem('unicare_hospitals') || '[]');
    registeredHospitals.push(newHospital);
    localStorage.setItem('unicare_hospitals', JSON.stringify(registeredHospitals));

    setRegisteredData(newHospital);
    setIsRegistered(true);
  };

  // Handle Demo Auto-Approval (helps in testing the login flow immediately!)
  const handleDemoApprove = () => {
    if (!registeredData) return;
    
    const registeredHospitals = JSON.parse(localStorage.getItem('unicare_hospitals') || '[]');
    const updated = registeredHospitals.map(h => {
      if (h.id === registeredData.id) {
        return { ...h, approved: true };
      }
      return h;
    });
    localStorage.setItem('unicare_hospitals', JSON.stringify(updated));
    
    // Switch to login tab and prefill details
    setLoginEmail(registeredData.adminEmail);
    setLoginPassword(registeredData.password);
    setIsRegistered(false);
    setActiveTab('login');
    alert('Hospital registration approved! You can now log in.');
  };

  // Handle Hospital Login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    // Predefined default Demo credentials
    const defaultDemo = {
      id: 'HOSP-DEMO',
      name: 'City General Hospital',
      regNumber: 'HOSP-2026-8891',
      adminName: 'Dr. Sarah Jenkins',
      adminEmail: 'admin@cityhospital.com',
      password: 'password123',
      approved: true,
      type: 'hospital'
    };

    // Check pre-registered credentials in localStorage
    const registeredHospitals = JSON.parse(localStorage.getItem('unicare_hospitals') || '[]');
    
    let matchedUser = null;

    if (loginEmail === defaultDemo.adminEmail && loginPassword === defaultDemo.password) {
      matchedUser = defaultDemo;
    } else {
      matchedUser = registeredHospitals.find(h => h.adminEmail === loginEmail && h.password === loginPassword);
    }

    if (matchedUser) {
      if (!matchedUser.approved) {
        setLoginError('Your hospital registration is pending administrative approval.');
      } else {
        onLogin(matchedUser);
      }
    } else {
      setLoginError('Invalid email or password. Try using the Demo login.');
    }
  };

  // Helper to prefill demo credentials
  const fillDemoCredentials = () => {
    setLoginEmail('admin@cityhospital.com');
    setLoginPassword('password123');
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

            {/* If successfully registered and pending approval */}
            {isRegistered ? (
              <div className="unicare-card p-4 p-md-5 text-center">
                <div className="d-flex justify-content-center mb-4">
                  <div className="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center animate-pulse" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                    <i className="bi bi-clock-history"></i>
                  </div>
                </div>
                <h2 className="fw-bold text-slate-800 mb-3">Pending Approval</h2>
                <div className="alert alert-info py-3 px-4 mb-4 text-start">
                  <h4 className="alert-heading h6 fw-bold mb-2">Registration Submitted</h4>
                  <p className="mb-0 style={{ fontSize: '0.9rem' }}">
                    <strong>Hospital Name:</strong> {registeredData?.name}<br />
                    <strong>Admin Email:</strong> {registeredData?.adminEmail}<br />
                    <strong>Registration ID:</strong> {registeredData?.id}
                  </p>
                </div>
                <p className="text-muted mb-4 fs-6">
                  Hospital registration submitted successfully. Waiting for approval.
                </p>

                <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                  <button 
                    className="btn btn-secondary-unicare px-4 py-3"
                    onClick={handleDemoApprove}
                  >
                    <i className="bi bi-patch-check me-2"></i>
                    Approve Now (Demo Mode)
                  </button>
                  <button 
                    className="btn btn-outline-secondary px-4 py-3"
                    onClick={() => { setIsRegistered(false); setActiveTab('login'); }}
                  >
                    Go to Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="unicare-card p-0 overflow-hidden">
                {/* Tabs */}
                <div className="row g-0 border-bottom">
                  <div className="col-6">
                    <button 
                      className={`w-100 py-3 fw-bold border-0 fs-5 text-center bg-transparent ${activeTab === 'login' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                      onClick={() => { setActiveTab('login'); setLoginError(''); }}
                      style={{ outline: 'none' }}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Hospital Login
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className={`w-100 py-3 fw-bold border-0 fs-5 text-center bg-transparent ${activeTab === 'register' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                      onClick={() => setActiveTab('register')}
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
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h2 className="h4 fw-bold mb-1">Access Portal</h2>
                          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Enter hospital admin credentials to login.</p>
                        </div>
                        <button 
                          className="btn btn-sm btn-outline-primary px-3 py-1.5"
                          onClick={fillDemoCredentials}
                          style={{ fontSize: '0.8rem', borderRadius: '6px' }}
                        >
                          <i className="bi bi-magic me-1"></i> Demo Fill
                        </button>
                      </div>

                      {loginError && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                          <div>{loginError}</div>
                        </div>
                      )}

                      <form onSubmit={handleLogin}>
                        <div className="mb-3">
                          <label className="form-label">Email Address</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-envelope"></i></span>
                            <input 
                              type="email" 
                              className="form-control" 
                              placeholder="admin@cityhospital.com" 
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              required 
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="form-label">Password</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-lock"></i></span>
                            <input 
                              type="password" 
                              className="form-control" 
                              placeholder="••••••••" 
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              required 
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn btn-primary-unicare w-100 py-3 fs-6">
                          Login
                        </button>
                      </form>
                      
                      <div className="mt-4 text-center text-muted" style={{ fontSize: '0.85rem' }}>
                        <span>Demo Account credentials: <strong>admin@cityhospital.com</strong> / <strong>password123</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: REGISTRATION FORM */}
                  {activeTab === 'register' && (
                    <form onSubmit={handleRegister}>
                      
                      {/* Section A: Hospital Info */}
                      <h3 className="h5 fw-bold text-primary mb-3 border-bottom pb-2">Hospital Details</h3>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label">Hospital Name</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="St. Mary Clinic" 
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
                            placeholder="REG-99102-M" 
                            value={regNumber}
                            onChange={(e) => setRegNumber(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Email Address</label>
                          <input 
                            type="email" 
                            className="form-control" 
                            placeholder="contact@stmaryclinic.org" 
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
                            placeholder="+1 (555) 438-9012" 
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
                            placeholder="404 Clinical Way, Tech Sector, SF" 
                            value={hospitalAddress}
                            onChange={(e) => setHospitalAddress(e.target.value)}
                            required 
                          />
                        </div>
                      </div>

                      {/* Section B: Admin Info */}
                      <h3 className="h5 fw-bold text-teal mb-3 border-bottom pb-2">Administrator Details</h3>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label">Admin Full Name</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Dr. John Watson" 
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
                            placeholder="+1 (555) 891-2345" 
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Admin Email</label>
                          <input 
                            type="email" 
                            className="form-control" 
                            placeholder="j.watson@hospital.com" 
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            required 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Password</label>
                          <input 
                            type="password" 
                            className="form-control" 
                            placeholder="••••••••" 
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
