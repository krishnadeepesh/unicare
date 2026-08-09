import React, { useState } from 'react';

export default function LoginPage({ setView, onLogin }) {
  const [role, setRole] = useState('hospital'); // 'hospital' | 'patient'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin) {
      if (role === 'hospital') {
        onLogin({
          id: 'HOSP-DEMO',
          name: 'City General Hospital',
          adminEmail: email || 'admin@cityhospital.com',
          type: 'hospital'
        });
      } else {
        onLogin({
          patientId: 'UC-2026-7842',
          name: email ? email.split('@')[0] : 'Eleanor Vance',
          email: email || 'patient@example.com',
          dob: '12/14/1988',
          bloodGroup: 'A+',
          phone: '+1 (555) 723-1188',
          type: 'patient'
        });
      }
    } else {
      setView(role === 'hospital' ? 'hospital-flow' : 'patient-flow');
    }
  };

  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)', display: 'flex', alignItems: 'center' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5 animate-slide-up">
            
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
                <span className="badge badge-blue px-3 py-2 rounded-pill mb-2">Security Portal</span>
                <h2 className="fw-bold text-slate-800">Welcome to UniCare</h2>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>Access your secure portal account.</p>
              </div>

                <form onSubmit={handleSubmit}>
                  {/* Role Dropdown */}
                  <div className="mb-3">
                    <label className="form-label">Select Role</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-person-badge"></i></span>
                      <select 
                        className="form-select" 
                        value={role} 
                        onChange={(e) => setRole(e.target.value)}
                        required
                      >
                        <option value="hospital">🏥 Hospital</option>
                        <option value="patient">👤 Patient</option>
                      </select>
                    </div>
                  </div>

                  {/* Email / Identifier */}
                  <div className="mb-3">
                    <label className="form-label">Email or Phone Number</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-envelope"></i></span>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label className="form-label">Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><i className="bi bi-lock"></i></span>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary-unicare w-100 py-3 fs-6">
                    Login
                  </button>
                </form>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
