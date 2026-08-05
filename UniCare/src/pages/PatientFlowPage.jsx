import React, { useState } from 'react';
import DigitalHealthCard from '../components/DigitalHealthCard';

export default function PatientFlowPage({ setView, onLogin }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  // Success Generation State
  const [isRegistered, setIsRegistered] = useState(false);
  const [generatedPatient, setGeneratedPatient] = useState(null);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email or Phone
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Handle Registration
  const handleRegister = (e) => {
    e.preventDefault();

    // Generate unique Patient ID
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const patientId = `UC-2026-${randomNum}`;

    const newPatient = {
      patientId,
      name: fullName,
      dob: dateOfBirth,
      gender,
      phone,
      email,
      address,
      password,
      bloodGroup,
      type: 'patient'
    };

    // Save to localStorage list of patients
    const registeredPatients = JSON.parse(localStorage.getItem('unicare_patients') || '[]');
    registeredPatients.push(newPatient);
    localStorage.setItem('unicare_patients', JSON.stringify(registeredPatients));

    setGeneratedPatient(newPatient);
    setIsRegistered(true);
  };

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    // Predefined default Demo credentials
    const defaultDemo = {
      patientId: 'UC-2026-7842',
      name: 'Eleanor Vance',
      dob: '12/14/1988',
      gender: 'Female',
      phone: '+1 (555) 723-1188',
      email: 'patient@example.com',
      address: '742 Evergreen Terrace, Tech City',
      password: 'password123',
      bloodGroup: 'A+',
      type: 'patient'
    };

    const registeredPatients = JSON.parse(localStorage.getItem('unicare_patients') || '[]');

    let matchedUser = null;

    if ((loginIdentifier === defaultDemo.email || loginIdentifier === defaultDemo.phone) && loginPassword === defaultDemo.password) {
      matchedUser = defaultDemo;
    } else {
      matchedUser = registeredPatients.find(
        p => (p.email === loginIdentifier || p.phone === loginIdentifier) && p.password === loginPassword
      );
    }

    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setLoginError('Invalid credentials. Check email/phone and password, or use the Demo Fill.');
    }
  };

  const fillDemoCredentials = () => {
    setLoginIdentifier('patient@example.com');
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

            {/* Registration Success and Digital Health Card Display */}
            {isRegistered ? (
              <div className="unicare-card p-4 p-md-5 text-center">
                <span className="badge badge-teal px-3 py-2 rounded-pill mb-3">
                  <i className="bi bi-patch-check-fill me-1 text-teal"></i> Registration Successful
                </span>
                <h2 className="fw-bold mb-2">Welcome to UniCare</h2>
                <p className="text-muted mb-4 fs-6">
                  Your Digital Health Card has been generated. Please print or save your details below.
                </p>

                {/* Health Card Element */}
                <div className="d-flex justify-content-center mb-4">
                  <DigitalHealthCard patient={generatedPatient} />
                </div>

                <div className="d-flex justify-content-center gap-3">
                  <button 
                    className="btn btn-primary-unicare px-4 py-3"
                    onClick={() => {
                      setIsRegistered(false);
                      // Auto login the newly registered user
                      onLogin(generatedPatient);
                    }}
                  >
                    <span>Proceed to Dashboard</span>
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                  <button 
                    className="btn btn-outline-secondary px-4 py-3"
                    onClick={() => {
                      setIsRegistered(false);
                      setActiveTab('login');
                      setLoginIdentifier(generatedPatient.email);
                      setLoginPassword(generatedPatient.password);
                    }}
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
                      className={`w-100 py-3 fw-bold border-0 fs-5 text-center bg-transparent ${activeTab === 'login' ? 'text-teal border-bottom border-teal border-3' : 'text-muted'}`}
                      onClick={() => { setActiveTab('login'); setLoginError(''); }}
                      style={{ outline: 'none' }}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Patient Login
                    </button>
                  </div>
                  <div className="col-6">
                    <button 
                      className={`w-100 py-3 fw-bold border-0 fs-5 text-center bg-transparent ${activeTab === 'register' ? 'text-teal border-bottom border-teal border-3' : 'text-muted'}`}
                      onClick={() => setActiveTab('register')}
                      style={{ outline: 'none' }}
                    >
                      <i className="bi bi-person-fill-add me-2"></i>
                      Patient Registration
                    </button>
                  </div>
                </div>

                <div className="p-4 p-md-5">
                  {/* Tab 1: LOGIN */}
                  {activeTab === 'login' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h2 className="h4 fw-bold mb-1">Patient Portal Login</h2>
                          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Access your healthcare services, cards, and bookings.</p>
                        </div>
                        <button 
                          className="btn btn-sm btn-outline-teal px-3 py-1.5"
                          onClick={fillDemoCredentials}
                          style={{ fontSize: '0.8rem', borderRadius: '6px', color: 'var(--secondary-color)', borderColor: 'var(--secondary-color)' }}
                        >
                          <i className="bi bi-magic me-1"></i> Demo Fill
                        </button>
                      </div>

                      {loginError && (
                        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ fontSize: '0.9rem' }}>
                          <i className="bi bi-exclamation-triangle-fill fs-5 text-danger"></i>
                          <div>{loginError}</div>
                        </div>
                      )}

                      <form onSubmit={handleLogin}>
                        <div className="mb-3">
                          <label className="form-label">Email or Phone Number</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light"><i className="bi bi-person-bounding-box"></i></span>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="patient@example.com" 
                              value={loginIdentifier}
                              onChange={(e) => setLoginIdentifier(e.target.value)}
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

                        <button type="submit" className="btn btn-secondary-unicare w-100 py-3 fs-6">
                          Login
                        </button>
                      </form>
                      
                      <div className="mt-4 text-center text-muted" style={{ fontSize: '0.85rem' }}>
                        <span>Demo Account: <strong>patient@example.com</strong> / <strong>password123</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: REGISTRATION */}
                  {activeTab === 'register' && (
                    <form onSubmit={handleRegister}>
                      <h3 className="h5 fw-bold text-teal mb-3 border-bottom pb-2">Personal Details</h3>
                      
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label">Full Name</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Johnathan Doe" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required 
                          />
                        </div>
                        
                        <div className="col-md-6">
                          <label className="form-label">Date of Birth</label>
                          <input 
                            type="date" 
                            className="form-control" 
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label">Gender</label>
                          <select 
                            className="form-select" 
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label">Blood Group</label>
                          <select 
                            className="form-select" 
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                          >
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>

                        <div className="col-md-6">
                          <label className="form-label">Phone Number</label>
                          <input 
                            type="tel" 
                            className="form-control" 
                            placeholder="+1 (555) 019-2834" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label">Email Address</label>
                          <input 
                            type="email" 
                            className="form-control" 
                            placeholder="john@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label">Residential Address</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="123 Orchard Ave, Tech City, TC" 
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required 
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label">Password</label>
                          <input 
                            type="password" 
                            className="form-control" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-secondary-unicare w-100 py-3 fs-6">
                        Register and Generate Health Card
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
