import React, { useState, useRef, useEffect } from 'react';

export default function CustomNavbar({ currentView, setView, currentUser, onLogout, onOpenAuth }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showProfileMenu]);

  const scrollToSection = (id) => {
    if (currentView !== 'landing') {
      setView('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getDashboardView = (user) => {
    if (!user) return 'landing';
    if (user.role === 'doctor') return 'doctor-dashboard';
    if (user.role === 'receptionist') return 'receptionist-dashboard';
    if (user.role === 'patient' || user.role === 'Patient') return 'patient-dashboard';
    if (user.role === 'super-admin' || user.is_superuser) return 'super-admin-dashboard';
    if (user.type === 'hospital' || user.role === 'hospital-admin' || user.role === 'Hospital Administrator') return 'hospital-admin-dashboard';
    if (user.type === 'staff') return 'hospital-role-select';
    return 'patient-dashboard';
  };

  const getRoleLabel = (user) => {
    if (!user) return '';
    if (user.role === 'doctor') return 'Doctor';
    if (user.role === 'receptionist') return 'Receptionist';
    if (user.role === 'patient' || user.role === 'Patient') return 'Patient';
    if (user.role === 'super-admin' || user.is_superuser) return 'Super Admin';
    if (user.type === 'hospital' || user.role === 'hospital-admin' || user.role === 'Hospital Administrator') return 'Hospital Admin';
    return 'Active Session';
  };

  const getUserDisplayName = (user) => {
    if (!user) return '';
    if (user.role === 'doctor') return `Dr. ${user.name || user.username || 'Doctor'}`;
    return user.name || user.hospital_name || user.username || 'My Account';
  };

  const getUserInitial = (user) => {
    if (!user) return 'U';
    const name = user.name || user.hospital_name || user.username || '';
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const getRoleIcon = (user) => {
    if (!user) return 'bi-person-circle';
    if (user.role === 'doctor') return 'bi-stethoscope';
    if (user.role === 'receptionist') return 'bi-person-badge';
    if (user.role === 'patient' || user.role === 'Patient') return 'bi-heart-pulse';
    if (user.role === 'super-admin' || user.is_superuser) return 'bi-shield-check';
    if (user.type === 'hospital' || user.role === 'hospital-admin') return 'bi-hospital';
    return 'bi-person-circle';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top py-3">
      <div className="container">
        {/* Left Brand */}
        <a 
          className="navbar-brand navbar-brand-unicare cursor-pointer" 
          href="#home"
          onClick={(e) => { e.preventDefault(); setView('landing'); }}
          style={{ textDecoration: 'none' }}
        >
          <i className="bi bi-shield-plus fs-3" style={{ color: '#0d9488' }}></i>
          <span>UniCare</span>
        </a>

        {/* Toggle button */}
        <button 
          className="navbar-toggler border-0" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#unicareNavbar" 
          aria-controls="unicareNavbar" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Collapsible area */}
        <div className="collapse navbar-collapse" id="unicareNavbar">
          {/* Middle links */}
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-2">
            <li className="nav-item">
              <a 
                className={`nav-link nav-link-unicare ${currentView === 'landing' ? 'active' : ''}`} 
                href="#home" 
                onClick={(e) => { e.preventDefault(); setView('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                Home
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link nav-link-unicare" 
                href="#features" 
                onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
              >
                Features
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link nav-link-unicare" 
                href="#about" 
                onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}
              >
                About
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link nav-link-unicare" 
                href="#contact" 
                onClick={(e) => { e.preventDefault(); scrollToSection('contact'); }}
              >
                Contact
              </a>
            </li>
          </ul>

          {/* Right Action buttons */}
          <div className="d-flex align-items-center gap-2">
            {currentUser ? (
              <div className="d-flex align-items-center gap-2" ref={dropdownRef}>
                {/* Return to Dashboard shortcut button */}
                <button 
                  className="btn btn-outline-teal px-3 py-2 fs-7 d-flex align-items-center gap-1.5 fw-semibold"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setView(getDashboardView(currentUser));
                  }}
                  title="Return to your active dashboard"
                >
                  <i className={`bi ${getRoleIcon(currentUser)}`}></i>
                  <span>Dashboard</span>
                </button>

                {/* Profile avatar dropdown menu */}
                <div className="position-relative">
                  <button
                    type="button"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-2 border-0 shadow-none"
                    style={{ outline: 'none' }}
                    aria-label="User session menu"
                  >
                    <div 
                      className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" 
                      style={{ width: '38px', height: '38px', backgroundColor: '#0d9488' }}
                    >
                      {getUserInitial(currentUser)}
                    </div>
                    <div className="text-start d-none d-md-block" style={{ lineHeight: '1.2' }}>
                      <div className="fw-bold text-dark small text-truncate" style={{ maxWidth: '140px' }}>
                        {getUserDisplayName(currentUser)}
                      </div>
                      <small className="extra-small fw-semibold" style={{ color: '#0d9488' }}>
                        {getRoleLabel(currentUser)}
                      </small>
                    </div>
                    <i className={`bi bi-chevron-${showProfileMenu ? 'up' : 'down'} text-muted extra-small ms-0.5`}></i>
                  </button>

                  {showProfileMenu && (
                    <div 
                      className="dropdown-menu dropdown-menu-end show shadow-lg border-0 rounded-4 p-2 mt-2" 
                      style={{ minWidth: '220px', zIndex: 1050, position: 'absolute', right: 0 }}
                    >
                      <div className="px-3 py-2 border-bottom mb-1 bg-light rounded-3">
                        <div className="fw-bold text-dark small">{getUserDisplayName(currentUser)}</div>
                        <small className="text-muted extra-small d-block text-truncate">
                          {currentUser.email || currentUser.user_email || 'Active Session'}
                        </small>
                        <span className="badge bg-teal-subtle text-teal mt-1 extra-small" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                          {getRoleLabel(currentUser)} Session Active
                        </span>
                      </div>

                      <button 
                        className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-dark small fw-medium"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setView(getDashboardView(currentUser));
                        }}
                      >
                        <i className={`bi ${getRoleIcon(currentUser)} text-teal fs-6`} style={{ color: '#0d9488' }}></i>
                        <span>Go to Dashboard</span>
                      </button>

                      <div className="dropdown-divider my-1"></div>

                      <button 
                        className="dropdown-item rounded-3 py-2 d-flex align-items-center gap-2.5 text-danger small fw-semibold"
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout();
                        }}
                      >
                        <i className="bi bi-box-arrow-right fs-6"></i>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button 
                className={`btn btn-teal-pill px-4 py-2 ${currentView === 'login' ? 'active' : ''}`} 
                onClick={() => onOpenAuth ? onOpenAuth('login') : setView('login')}
                style={{ fontSize: '0.875rem' }}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i> Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
