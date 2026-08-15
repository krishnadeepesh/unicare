import React from 'react';

export default function CustomNavbar({ currentView, setView, currentUser, onLogout }) {
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
              <>
                <button 
                  className="btn btn-outline-teal px-3 py-2 fs-7 d-flex align-items-center gap-1"
                  onClick={() => setView(currentUser.type === 'hospital' ? 'hospital-dashboard' : 'patient-dashboard')}
                >
                  <i className={`bi ${currentUser.type === 'hospital' ? 'bi-hospital' : 'bi-person-circle'}`}></i>
                  <span>Dashboard</span>
                </button>
                <button 
                  className="btn btn-light text-danger px-3 py-2 fs-7"
                  onClick={onLogout}
                  title="Logout"
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </button>
              </>
            ) : (
              <button 
                className={`btn btn-teal-pill px-4 py-2 ${currentView === 'login' ? 'active' : ''}`} 
                onClick={() => setView('login')}
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
