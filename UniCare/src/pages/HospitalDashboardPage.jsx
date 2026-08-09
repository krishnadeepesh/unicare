import React, { useState } from 'react';

export default function HospitalDashboardPage({ hospitalInfo }) {
  const [modalRole, setModalRole] = useState(null); // 'doctor' | 'admin' | 'receptionist' | null
  const [roleUsername, setRoleUsername] = useState('');
  const [rolePassword, setRolePassword] = useState('');
  const [staffSession, setStaffSession] = useState(null);

  const portalCards = [
    {
      title: 'Doctor Management',
      icon: 'bi-person-badge-fill',
      description: 'Manage doctors and their active shifts, department assignments, and clinical schedules.'
    },
    {
      title: 'Reception Management',
      icon: 'bi-clipboard-pulse',
      description: 'Manage receptionist rosters, registration desk logs, and patient routing desks.'
    },
    {
      title: 'Patient Records',
      icon: 'bi-folder-symlink',
      description: 'Access and manage patient records securely. Look up patients by ID or name.'
    },
    {
      title: 'Appointments',
      icon: 'bi-calendar3',
      description: 'Track daily physician appointments, waiting times, and consulting room schedules.'
    },
    {
      title: 'Reports & Analytics',
      icon: 'bi-graph-up-arrow',
      description: 'View hospital analytics, active patient charts, admissions graphs, and billing reports.'
    }
  ];

  const staffLogins = [
    {
      role: 'Doctor',
      icon: 'bi-heart-pulse-fill',
      id: 'doctor',
      purpose: 'Doctors access patient records, diagnosis, prescriptions, and medical history reports.',
      color: 'primary',
      demoCreds: 'doc.smith@unicare.com / doc123'
    },
    {
      role: 'Admin',
      icon: 'bi-shield-lock-fill',
      id: 'admin',
      purpose: 'Hospital administrators manage doctors, nurses, clinic departments, appointment configurations, and analytical reports.',
      color: 'dark',
      demoCreds: 'admin.jones@unicare.com / admin123'
    },
    {
      role: 'Receptionist',
      icon: 'bi-telephone-inbound-fill',
      id: 'receptionist',
      purpose: 'Receptionists register patients, lookup digital health cards, and schedule clinical appointment logs.',
      color: 'teal',
      demoCreds: 'reception.mary@unicare.com / rec123'
    }
  ];

  const handleStaffLogin = (e) => {
    e.preventDefault();
    // Simulate staff login
    setStaffSession({
      role: modalRole,
      username: roleUsername,
      time: new Date().toLocaleTimeString()
    });
    setModalRole(null);
    setRoleUsername('');
    setRolePassword('');
  };

  const handleDemoFill = () => {
    if (modalRole === 'doctor') {
      setRoleUsername('doc.smith@unicare.com');
      setRolePassword('doc123');
    } else if (modalRole === 'admin') {
      setRoleUsername('admin.jones@unicare.com');
      setRolePassword('admin123');
    } else {
      setRoleUsername('reception.mary@unicare.com');
      setRolePassword('rec123');
    }
  };

  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)' }}>
      <div className="container">
        
        {/* Banner Section */}
        <div className="row mb-5 animate-slide-up">
          <div className="col-12">
            <div className="p-4 p-md-5 bg-white border rounded shadow-sm position-relative overflow-hidden">
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <span className="badge bg-primary px-3 py-2 rounded-pill mb-3">
                    <i className="bi bi-hospital me-1"></i> Logged In Portal
                  </span>
                  <h1 className="display-6 fw-bold mb-3">Welcome to UniCare Hospital Portal</h1>
                  <h2 className="h5 text-primary mb-3">{hospitalInfo?.name || 'City General Hospital'}</h2>
                  <p className="text-muted mb-0" style={{ maxWidth: '650px', fontSize: '1rem', lineHeight: '1.6' }}>
                    Manage your hospital operations, healthcare staff, appointments, and patient records from one secure platform. Use the dashboard cards to review analytics, or access specific staff panels below.
                  </p>
                </div>
                <div className="col-lg-4 d-none d-lg-block text-end">
                  <i className="bi bi-hospital text-light opacity-25" style={{ fontSize: '120px' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Active Session Banner */}
        {staffSession && (
          <div className="alert alert-success d-flex justify-content-between align-items-center mb-4 animate-fade-in py-3" style={{ borderRadius: '12px' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                <i className="bi bi-person-check-fill"></i>
              </div>
              <div>
                <span className="badge bg-dark me-2 text-capitalize">{staffSession.role} Session Active</span>
                <span className="text-dark fw-semibold">{staffSession.username} logged in at {staffSession.time}</span>
              </div>
            </div>
            <button className="btn btn-sm btn-outline-danger" onClick={() => setStaffSession(null)}>End Session</button>
          </div>
        )}

        {/* Dashboard Cards Section */}
        <h3 className="h4 fw-bold mb-4">Operations Dashboard</h3>
        <div className="row g-4 mb-5">
          {portalCards.map((card, idx) => (
            <div className="col-lg-4 col-md-6" key={idx}>
              <div className="unicare-card d-flex flex-column h-100">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="icon-box mb-0 text-primary" style={{ width: '48px', height: '48px', fontSize: '1.25rem', borderRadius: '10px' }}>
                    <i className={`bi ${card.icon}`}></i>
                  </div>
                  <h4 className="h5 fw-bold mb-0">{card.title}</h4>
                </div>
                <p className="text-muted mb-0" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Hospital Portal Access Section */}
        <div className="border-top pt-5">
          <div className="text-center mb-5">
            <span className="badge badge-teal px-3 py-2 rounded-pill mb-2">Staff Access Gateway</span>
            <h3 className="display-7 fw-bold">Hospital Portal Access</h3>
            <p className="text-muted" style={{ maxWidth: '550px', margin: '0 auto' }}>
              Launch dedicated, role-based workflows for doctors, administrators, and reception staff.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {staffLogins.map((staff, idx) => (
              <div className="col-lg-4 col-md-6" key={idx}>
                <div className="p-4 bg-white border rounded shadow-sm h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className={`p-3 rounded bg-${staff.color === 'teal' ? 'info text-white' : staff.color} text-white`} style={{ borderRadius: '8px' }}>
                        <i className={`bi ${staff.icon} fs-4`}></i>
                      </div>
                      <h4 className="fw-bold mb-0">{staff.role} Portal</h4>
                    </div>
                    <p className="text-muted mb-4" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                      {staff.purpose}
                    </p>
                  </div>
                  
                  <button 
                    className={`btn btn-${staff.color === 'teal' ? 'secondary' : staff.color === 'primary' ? 'primary-unicare' : 'dark'} w-100 py-2.5`}
                    onClick={() => setModalRole(staff.id)}
                  >
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    {staff.role} Login
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Login Modal Backdrop */}
        {modalRole && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                
                {/* Modal Header */}
                <div className="modal-header border-bottom p-4">
                  <h5 className="modal-title fw-bold text-capitalize">
                    <i className="bi bi-shield-check text-primary me-2"></i>
                    {modalRole} Portal Verification
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setModalRole(null)} aria-label="Close"></button>
                </div>

                {/* Modal Body */}
                <div className="modal-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Enter credentials provided by the hospital administrator.</span>
                    <button 
                      className="btn btn-sm btn-outline-secondary" 
                      onClick={handleDemoFill}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Demo Autofill
                    </button>
                  </div>

                  <form onSubmit={handleStaffLogin}>
                    <div className="mb-3">
                      <label className="form-label">Email / Staff Username</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={roleUsername}
                        onChange={(e) => setRoleUsername(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="mb-4">
                      <label className="form-label">Security Password</label>
                      <input 
                        type="password" 
                        className="form-control" 
                        value={rolePassword}
                        onChange={(e) => setRolePassword(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-light w-50 py-2.5" onClick={() => setModalRole(null)}>Cancel</button>
                      <button type="submit" className="btn btn-primary-unicare w-50 py-2.5">Access Portal</button>
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-light p-3 border-top justify-content-center text-muted" style={{ fontSize: '0.8rem', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <span>Demo credentials: <strong>{staffLogins.find(s => s.id === modalRole)?.demoCreds}</strong></span>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
